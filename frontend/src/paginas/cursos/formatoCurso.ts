import { rangoFechasCorto } from '@/lib/formato'
import type { Curso } from '@/servicios/cursos'
import type { ModalidadSesion } from '@/servicios/modalidadCurso'

/** Nombres de modalidad que muestran el catálogo y el detalle del curso (2.1 / 2.2 del Figma). */
export const ETIQUETA_MODALIDAD: Record<Curso['modalidad'], string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual en vivo',
  HIBRIDA: 'Híbrido',
  GRABADO: 'Grabado',
}

/** HU-36: cómo se dicta cada sesión. */
export const ETIQUETA_MODALIDAD_SESION: Record<ModalidadSesion, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual en vivo',
  AMBAS: 'Presencial y virtual',
}

export const fechasCurso = (curso: Pick<Curso, 'fechaInicio' | 'fechaFin'>) =>
  curso.fechaInicio && curso.fechaFin ? rangoFechasCorto(curso.fechaInicio, curso.fechaFin) : 'Fechas por confirmar'

export const costoCurso = (costo: number) => (costo === 0 ? 'Gratuito' : `S/ ${costo.toFixed(2)}`)

export function condicionesCobro(curso: Pick<Curso, 'costo' | 'modalidadCobro' | 'plazoPagoMinutos'>): string {
  if (curso.modalidadCobro === 'GRATUITO' || (curso.modalidadCobro == null && curso.costo === 0)) return 'Gratuito: curso y constancia sin cobro'
  if (curso.modalidadCobro === 'CERTIFICADO') return `Curso sin cobro · Constancia: S/ ${curso.costo.toFixed(2)}`
  if (curso.modalidadCobro === 'PREVIO') return `Pago antes de llevar el curso: S/ ${curso.costo.toFixed(2)} · Plazo: ${curso.plazoPagoMinutos} minutos desde la inscripción`
  return `S/ ${curso.costo.toFixed(2)} · Condiciones de cobro por configurar`
}

export const cuposCurso = (curso: Pick<Curso, 'cupos' | 'cuposDisponibles'>) =>
  `${curso.cuposDisponibles} de ${curso.cupos} disponibles`
