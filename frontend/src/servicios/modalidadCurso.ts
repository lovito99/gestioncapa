/** HU-36: modalidades por sesión y del curso, compartidas por la interfaz y la demo. */
export const modalidadesSesion = ['PRESENCIAL', 'VIRTUAL', 'AMBAS'] as const
export type ModalidadSesion = typeof modalidadesSesion[number]
export const modalidadesCurso = ['PRESENCIAL', 'VIRTUAL', 'HIBRIDA', 'GRABADO'] as const
export type ModalidadCurso = typeof modalidadesCurso[number]

/** El curso se clasifica por sus sesiones programadas; sin ellas conserva la planificada. */
export function modalidadDerivada(sesiones: readonly ModalidadSesion[], planificada: ModalidadCurso): ModalidadCurso {
  if (sesiones.length === 0) return planificada
  if (sesiones.every(modalidad => modalidad === 'PRESENCIAL')) return 'PRESENCIAL'
  if (sesiones.every(modalidad => modalidad === 'VIRTUAL')) return 'VIRTUAL'
  return 'HIBRIDA'
}

/** Datos del formulario «Programar sesión»: la sesión virtual no envía lugar físico. */
export function entradaSesion(datos: FormData) {
  const texto = (campo: string) => String(datos.get(campo) ?? '').trim()
  const modalidad = (modalidadesSesion as readonly string[]).includes(texto('modalidad')) ? texto('modalidad') as ModalidadSesion : 'PRESENCIAL'
  return { nombre: texto('nombre'), fecha: texto('fecha'), horaInicio: texto('horaInicio'), horaFin: texto('horaFin'),
    lugar: modalidad === 'VIRTUAL' ? '' : texto('lugar'), modalidad }
}
