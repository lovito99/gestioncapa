import { crearCursosDemo } from './cursosDemo'
import { http, HttpResponse } from 'msw'
import { usuarios } from './datos'
import type { DetalleCurso, MaterialCurso } from '@/servicios/cursos'
import { z } from 'zod'

const API = import.meta.env.VITE_API_URL ?? '/api'
const demo = crearCursosDemo()
export const cursosSimulados: DetalleCurso[] = demo.cursos
export const inscripcionesCursosDemo = new Map<string, Set<string>>(cursosSimulados.map(c => [c.id, new Set(c.titulo.includes('Seguridad y primeros') ? ['p-1','p-7'] : c.titulo.includes('Didáctica') ? ['p-1'] : c.titulo.includes('cupos agotados') ? ['p-7'] : [])]))
function disponibilidad(curso: DetalleCurso, usuarioId?: string) {
  const inscritos = inscripcionesCursosDemo.get(curso.id) ?? new Set<string>()
  return { ...curso, cuposDisponibles: Math.max(0, curso.cupos - inscritos.size), inscrito: !!usuarioId && inscritos.has(usuarioId) }
}
const archivos = demo.archivos
let secuencia = demo.siguienteId
const nuevoId = () => String(secuencia++)
const error = (status: number, message: string, code?: string) => HttpResponse.json({ code: code ?? (status === 422 ? 'VALIDACION' : status === 401 ? 'NO_AUTENTICADO' : status === 403 ? 'SIN_PERMISO' : 'CURSO_NO_EXISTE'), message }, { status })
function acceso(request: Request, roles?: string[]) {
  const usuario = usuarios.find(u => request.headers.get('Authorization') === `Bearer demo-${u.id}`)
  if (!usuario) return { fallo: error(401, 'Tu sesión expiró. Vuelve a iniciar sesión.') }
  if (roles && !roles.includes(usuario.rol)) return { fallo: error(403, 'No tienes permiso para realizar esta acción.') }
  return { usuario }
}
function detalle(request: Request, id: string) {
  const auth = acceso(request)
  if (auth.fallo) return { fallo: auth.fallo }
  const curso = cursosSimulados.find(c => c.id === id)
  if (!curso) return { fallo: error(404, 'El curso no existe.') }
  if (curso.estado === 'BORRADOR' && auth.usuario!.rol !== 'ADMIN' && curso.instructorId !== auth.usuario!.id) return { fallo: error(403, 'No tienes permiso para acceder a este curso.') }
  return { curso, usuario: auth.usuario! }
}
const titulo = z.string().trim().min(1).max(160)
const fechaOpcional = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T00:00:00Z`); return v.slice(0,4) !== '0000' && Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v }).nullable().default(null)
const esquema = z.object({
  categoria: z.string().trim().min(1).max(80).default('General'),
  fechaInicio: fechaOpcional, fechaFin: fechaOpcional,
  titulo, descripcion: z.string().trim().max(5000).default(''), instructorId: z.string(),
  horasLectivas: z.number().positive().max(10000), modalidad: z.enum(['PRESENCIAL', 'VIRTUAL', 'HIBRIDA']),
  costo: z.number().min(0).max(9999999999.99).multipleOf(0.01), cupos: z.number().int().min(1).max(1000000),
  tipoCertificado: z.enum(['PARTICIPACION', 'APROBACION']), notaMinima: z.number().min(0).max(20).default(14),
  modulos: z.array(z.object({ titulo }).strict()).min(1).max(100),
}).strict().refine(d => (!d.fechaInicio && !d.fechaFin) || (!!d.fechaInicio && !!d.fechaFin && d.fechaFin >= d.fechaInicio))
export const handlersCursos = [
  http.get(`${API}/cursos/instructores`, ({ request }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    return HttpResponse.json(usuarios.filter(u => u.rol === 'INSTRUCTOR').map(u => ({ id: u.id, nombre: u.nombre })))
  }),
  http.get(`${API}/cursos`, ({ request }) => {
    const auth = acceso(request, ['ADMIN', 'INSTRUCTOR']); if (auth.fallo) return auth.fallo
    return HttpResponse.json(cursosSimulados.filter(c => auth.usuario!.rol === 'ADMIN' || c.instructorId === auth.usuario!.id).map(c => disponibilidad(c, auth.usuario!.id)))
  }),
  http.get(`${API}/catalogo/cursos`, ({ request }) => {
    const auth = acceso(request); if (auth.fallo) return auth.fallo
    return HttpResponse.json(cursosSimulados.filter(c => c.estado === 'PUBLICADO').map(c => disponibilidad(c, auth.usuario!.id)))
  }),
  http.get(`${API}/catalogo/cursos/pagina`, ({ request }) => {
    const auth = acceso(request); if (auth.fallo) return auth.fallo
    const consulta = z.object({ buscar: z.string().trim().max(160).default(''), categoria: z.string().min(1).max(80).optional(), modalidad: z.enum(['PRESENCIAL','VIRTUAL','HIBRIDA']).optional(), pagina: z.coerce.number().int().min(1).max(100000).default(1), tamanoPagina: z.coerce.number().int().min(1).max(50).default(6) }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!consulta.success) return error(422, 'Revisa los filtros y la página solicitada.')
    const { buscar, categoria, modalidad, pagina, tamanoPagina } = consulta.data
    const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    const publicados = cursosSimulados.filter(c => c.estado === 'PUBLICADO')
    const filtrados = publicados.filter(c => normalizar(c.titulo).includes(normalizar(buscar)) && (!categoria || c.categoria === categoria) && (!modalidad || c.modalidad === modalidad)).sort((a,b) => Number(b.id)-Number(a.id))
    return HttpResponse.json({ items: filtrados.slice((pagina-1)*tamanoPagina,pagina*tamanoPagina).map(c => disponibilidad(c, auth.usuario!.id)), total: filtrados.length, pagina, tamanoPagina, totalPaginas: Math.ceil(filtrados.length/tamanoPagina), categorias: [...new Set(publicados.map(c => c.categoria))].sort() })
  }),
  http.post(`${API}/cursos/:id/inscribirme`, ({ request, params }) => {
    const auth = acceso(request, ['PARTICIPANTE']); if (auth.fallo) return auth.fallo
    const curso = cursosSimulados.find(c => c.id === params.id)
    if (!curso) return error(404, 'El curso no existe.')
    if (curso.estado !== 'PUBLICADO') return error(409, 'El curso no está publicado.', 'CURSO_NO_PUBLICADO')
    const inscritos = inscripcionesCursosDemo.get(curso.id) ?? new Set<string>()
    const yaInscrito = inscritos.has(auth.usuario!.id)
    if (!yaInscrito && inscritos.size >= curso.cupos) return error(409, 'El curso está sin cupos. Elige otra capacitación.', 'SIN_CUPOS')
    inscritos.add(auth.usuario!.id); inscripcionesCursosDemo.set(curso.id, inscritos)
    return HttpResponse.json({ cursoId: curso.id, estado: yaInscrito && auth.usuario!.id === 'p-1' && curso.titulo === 'Demo · Seguridad y primeros auxilios' ? 'TERMINADO' : 'EN_CURSO', yaInscrito }, { status: yaInscrito ? 200 : 201 })
  }),
  http.post(`${API}/cursos`, async ({ request }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    const datos = esquema.safeParse(await request.json())
    if (!datos.success) return error(422, 'Completa los campos obligatorios: horas mayores que cero, certificado y al menos un módulo.')
    const instructor = usuarios.find(u => u.id === datos.data.instructorId && u.rol === 'INSTRUCTOR')
    if (!instructor) return error(422, 'Selecciona un instructor válido.')
    const curso: DetalleCurso = { ...datos.data, cuposDisponibles: datos.data.cupos, id: nuevoId(), instructorNombre: instructor.nombre, estado: 'BORRADOR',
      modulos: datos.data.modulos.map((m, i) => ({ ...m, id: nuevoId(), orden: i + 1, materiales: [] })) }
    cursosSimulados.push(curso)
    return HttpResponse.json(curso, { status: 201 })
  }),
  http.get(`${API}/cursos/:id`, ({ request, params }) => {
    const auth = detalle(request, String(params.id)); return auth.fallo ?? HttpResponse.json(disponibilidad(auth.curso!, auth.usuario!.id))
  }),
  http.post(`${API}/cursos/:id/publicar`, ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    auth.curso!.estado = 'PUBLICADO'; return HttpResponse.json(disponibilidad(auth.curso!, auth.usuario!.id))
  }),
  http.post(`${API}/cursos/:id/modulos/:moduloId/materiales`, async ({ request, params }) => {
    const rol = acceso(request, ['INSTRUCTOR']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    if (auth.curso!.instructorId !== auth.usuario!.id) return error(403, 'Solo el instructor asignado puede agregar material.')
    const modulo = auth.curso!.modulos.find(m => m.id === params.moduloId)
    if (!modulo) return error(404, 'El módulo no pertenece a este curso.')
    const entrada = await request.json() as Record<string, unknown>
    if (!titulo.safeParse(entrada.titulo).success || !['PDF', 'ENLACE', 'VIDEO'].includes(String(entrada.tipo))) return error(422, 'Revisa el título y el tipo de material.')
    let archivo: Uint8Array | undefined
    let url: string | null = null
    if (entrada.tipo === 'PDF') {
      try {
        const base64 = String(entrada.contenidoBase64 ?? '')
        if (base64.length > 6990508) return error(422, 'El PDF no puede superar 5 MB.')
        const contenido = atob(base64)
        if (!contenido.startsWith('%PDF-') || contenido.length > 5242880) return error(422, 'Selecciona un PDF válido de hasta 5 MB.')
        archivo = Uint8Array.from(contenido, letra => letra.charCodeAt(0))
      } catch { return error(422, 'El PDF no es válido.') }
    } else {
      try { const enlace = new URL(String(entrada.url)); if (enlace.protocol !== 'https:' || enlace.username || enlace.password) throw new Error(); url = String(entrada.url) }
      catch { return error(422, 'Usa una URL HTTPS válida sin credenciales.') }
    }
    const material: MaterialCurso = { id: nuevoId(), titulo: String(entrada.titulo).trim(), tipo: entrada.tipo as MaterialCurso['tipo'], url }
    modulo.materiales.push(material)
    if (archivo) archivos.set(material.id, archivo)
    return HttpResponse.json(material, { status: 201 })
  }),
  http.get(`${API}/cursos/:id/modulos/:moduloId/materiales/:materialId/archivo`, ({ request, params }) => {
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const material = auth.curso!.modulos.find(m => m.id === params.moduloId)?.materiales.find(m => m.id === params.materialId && m.tipo === 'PDF')
    const archivo = material && archivos.get(material.id)
    if (!archivo) return error(404, 'El PDF no existe en este módulo.')
    return new HttpResponse(archivo as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="material.pdf"' } })
  }),
]
