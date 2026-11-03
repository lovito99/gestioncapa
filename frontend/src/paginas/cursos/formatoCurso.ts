import { rangoFechasCorto } from '@/lib/formato'
import type { Curso } from '@/servicios/cursos'

/** Nombres de modalidad que muestran el catálogo y el detalle del curso (2.1 / 2.2 del Figma). */
export const ETIQUETA_MODALIDAD: Record<Curso['modalidad'], string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual en vivo',
  HIBRIDA: 'Híbrido',
}

export const fechasCurso = (curso: Pick<Curso, 'fechaInicio' | 'fechaFin'>) =>
  curso.fechaInicio && curso.fechaFin ? rangoFechasCorto(curso.fechaInicio, curso.fechaFin) : 'Fechas por confirmar'

export const costoCurso = (costo: number) => (costo === 0 ? 'Gratuito' : `S/ ${costo.toFixed(2)}`)

export const cuposCurso = (curso: Pick<Curso, 'cupos' | 'cuposDisponibles'>) =>
  `${curso.cuposDisponibles} de ${curso.cupos} disponibles`
