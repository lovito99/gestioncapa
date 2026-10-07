import { useAuth } from './useAuth'

/** Mantiene los enlaces de las pantallas compartidas dentro del área de cada rol. */
export function useRutaClases() {
  const { usuario } = useAuth()
  return usuario?.rol === 'ADMIN' ? '/admin/clases' : '/coordinador/clases'
}
