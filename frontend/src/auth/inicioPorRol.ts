import type { Rol, Usuario } from '@/types/api'

/** Ruta de inicio de cada rol. Cada rol tiene la suya para evitar redirecciones en bucle. */
const INICIO: Record<Rol, string> = {
  ADMIN: '/admin',
  COORDINADOR: '/coordinador/clases',
  INSTRUCTOR: '/instructor/clases',
  PARTICIPANTE: '/participante/clases',
}

/** Un rol desconocido va a una página sin redirecciones, nunca de vuelta al login */
export const inicioPorRol = (usuario: Usuario) => INICIO[usuario.rol] ?? '/sin-permiso'
