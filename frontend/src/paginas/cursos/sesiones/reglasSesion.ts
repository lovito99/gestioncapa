import type { SalaSesion, SesionCurso } from '@/servicios/cursos'
import type { ModalidadSesion } from '@/servicios/modalidadCurso'

/** Sedes del CPPP Región Cusco (las del pie de página del Figma). */
export const SEDES = [
  'Sede CPPP Cusco · Av. La Cultura 1112',
  'Edificio Oferplaza · Av. La Cultura 1114',
  'San Jerónimo · Calle Suárez N.° 350',
] as const

/** Sesiones programadas en orden de fecha y hora; las canceladas no se listan. */
export const sesionesProgramadas = (sesiones: SesionCurso[]) =>
  sesiones.filter(s => s.estado === 'PROGRAMADA').toSorted((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`))

export const lugarSesion = (s: Pick<SesionCurso, 'modalidad' | 'lugar'>) =>
  s.modalidad === 'VIRTUAL' ? 'Sala virtual del CPPP' : s.modalidad === 'AMBAS' ? `${s.lugar} y sala virtual` : s.lugar

export type Valores = {
  modalidad: ModalidadSesion; fecha: string; horaInicio: string; horaFin: string
  sede: string; aula: string; encargadoId: string; qrRotatorio: boolean; sala: SalaSesion
}
export type Errores = Partial<Record<'fecha' | 'horaInicio' | 'horaFin' | 'sede' | 'aula' | 'encargadoId', string>>

/** Validación del formulario S3 6.1 con los mensajes del Figma (6.1 «Presencial – Error»). */
export function validarSesion(v: Valores): { errores: Errores; aviso?: { titulo: string; texto: string } } {
  const errores: Errores = {}
  if (!v.fecha) errores.fecha = 'Elige la fecha.'
  if (!v.horaInicio) errores.horaInicio = 'Elige la hora de inicio.'
  if (!v.horaFin) errores.horaFin = 'Elige la hora de fin.'
  else if (v.horaInicio && v.horaFin <= v.horaInicio) errores.horaFin = 'Debe ser posterior a la hora de inicio.'
  const presencial = v.modalidad !== 'VIRTUAL'
  if (presencial && !v.sede) errores.sede = 'Selecciona la sede.'
  if (presencial && !v.aula.trim()) errores.aula = 'Escribe el aula o una referencia.'
  if (presencial && !v.encargadoId) errores.encargadoId = 'Elige quién registrará la asistencia.'
  if (errores.sede || errores.aula) return { errores, aviso: { titulo: 'Falta completar el lugar', texto: 'Una sesión presencial necesita sede y aula para que los inscritos sepan a dónde ir.' } }
  if (Object.keys(errores).length) return { errores, aviso: { titulo: 'Revisa los datos de la sesión', texto: 'Completa la fecha y un horario válido.' } }
  return { errores }
}
