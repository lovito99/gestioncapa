import { matchRoutes } from 'react-router-dom'

const idValido = (valor: string | null): valor is string => valor !== null && /^[1-9]\d{0,14}$/.test(valor)
const rutasRetorno=[{path:'/login'},{path:'/registro'},{path:'/cursos/:id'}]

/** La URL transporta una selección, nunca una dirección de redirección. */
export function cursoDeBusqueda(busqueda: string) {
  const valores = new URLSearchParams(busqueda).getAll('curso')
  return valores.length === 1 && idValido(valores[0]!) ? valores[0]! : null
}

export function accesoConCurso(ruta: '/login' | '/registro', curso: string | null) {
  return idValido(curso) ? `${ruta}?curso=${curso}` : ruta
}

export function destinoTrasAcceso(busqueda: string, desde: unknown, inicio: string) {
  const curso = cursoDeBusqueda(busqueda)
  if (curso) return `/cursos/${curso}`
  // El guard también conserva query de QR. Solo se admiten rutas locales.
  if(typeof desde!=='string'||!desde.startsWith('/')||desde.startsWith('//')||desde.includes('\\')) return inicio
  for(const caracter of desde) {
    const codigo=caracter.charCodeAt(0)
    if(codigo<32||codigo===127) return inicio
  }
  return desde
}

export function loginDelCursoActual(ruta: string,busqueda='') {
  try {decodeURIComponent(ruta)} catch {return '/login'}
  const coincidencia=matchRoutes(rutasRetorno,{pathname:ruta})?.[0]
  if(!coincidencia) return '/login'
  const curso=coincidencia.route.path==='/cursos/:id'?coincidencia.params.id??null:cursoDeBusqueda(busqueda)
  return accesoConCurso('/login', curso)
}
