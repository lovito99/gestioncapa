import type { Usuario } from '@/types/api'

/** Ruta de inicio de cada rol */
export const inicioPorRol = (usuario: Usuario) =>
  usuario.rol === 'COORDINADOR' ? '/coordinador/clases' : '/instructor/clases'
