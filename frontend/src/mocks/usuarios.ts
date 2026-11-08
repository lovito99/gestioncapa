import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { usuarios } from './datos'
import type { Rol } from '@/types/api'
const API = import.meta.env.VITE_API_URL ?? '/api'
const datosUsuario = z.object({ nombre:z.string().trim().min(1).max(120),email:z.email().trim().toLowerCase(),rol:z.enum(['admin','instructor','agremiado']),activo:z.boolean(),motivo:z.string().trim().min(1).max(1000),password:z.string().min(8).optional() }).strict()
const etiquetas = { ADMIN:'Administrador',INSTRUCTOR:'Instructor',AGREMIADO:'Agremiado' }
const publico = (u: typeof usuarios[number]) => ({ id:u.id,nombre:u.nombre,email:u.email,rol:u.rol.toLowerCase(),activo:u.activo!==false })
function autorizar(request: Request) {
  const actor=usuarios.find(u => u.activo!==false && request.headers.get('Authorization')===`Bearer demo-${u.id}`)
  const status=actor ? 403 : 401
  return actor?.rol==='ADMIN' ? { actor } : { error:HttpResponse.json({ code:actor?'SIN_PERMISO':'NO_AUTENTICADO',message:'No tienes permiso para gestionar usuarios.' },{status}) }
}
export const handlersUsuarios = [
  http.get(`${API}/usuarios`,({request}) => {
    const auth=autorizar(request);if(auth.error)return auth.error
    const url=new URL(request.url), pagina=Number(url.searchParams.get('pagina')??1), tamano=Number(url.searchParams.get('tamanoPagina')??20),buscar=(url.searchParams.get('buscar')??'').toLocaleLowerCase('es')
    if(!Number.isInteger(pagina)||pagina<1||!Number.isInteger(tamano)||tamano<1||tamano>50)return HttpResponse.json({message:'Revisa la página y el límite de resultados.'},{status:422})
    const lista=usuarios.filter(u => `${u.nombre} ${u.email}`.toLocaleLowerCase('es').includes(buscar))
    return HttpResponse.json({items:lista.slice((pagina-1)*tamano,pagina*tamano).map(publico),total:lista.length,pagina,tamanoPagina:tamano})
  }),
  ...(['POST','PUT'] as const).map(metodo => http[metodo==='POST'?'post':'put'](`${API}/usuarios${metodo==='PUT'?'/:id':''}`,async ({request,params}) => {
    const auth=autorizar(request);if(auth.error)return auth.error
    const validacion=datosUsuario.safeParse(await request.json())
    if(!validacion.success || (metodo==='POST'&&!validacion.data.password))return HttpResponse.json({code:'VALIDACION',message:'Completa los datos y el motivo.'},{status:422})
    const datos=validacion.data
    const existente=metodo==='PUT'?usuarios.find(u => u.id===params.id):undefined
    if(metodo==='PUT'&&!existente)return HttpResponse.json({message:'El usuario no existe.'},{status:404})
    if(existente?.id===auth.actor!.id && (!datos.activo||datos.rol!=='admin'))return HttpResponse.json({message:'No puedes desactivar tu propia cuenta ni retirar tu rol de administrador.'},{status:409})
    if(usuarios.some(u => u.email===datos.email&&u.id!==existente?.id))return HttpResponse.json({message:'Este correo ya tiene una cuenta.'},{status:409})
    const rol=datos.rol.toUpperCase() as Rol
    if(existente)Object.assign(existente,{nombre:datos.nombre,email:datos.email,rol,cargo:etiquetas[rol],activo:datos.activo})
    else usuarios.push({id:crypto.randomUUID(),nombre:datos.nombre,email:datos.email,rol,cargo:etiquetas[rol],password:datos.password!,activo:datos.activo})
    return HttpResponse.json(publico(existente??usuarios.at(-1)!),{status:metodo==='POST'?201:200})
  })),
]
