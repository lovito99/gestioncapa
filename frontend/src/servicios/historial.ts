import { api } from '@/lib/api'
export type SesionHistorial = { id: string; cursoId: string | null; titulo: string; fecha: string; horaInicio: string; horaFin: string; estado: 'PRESENTE' | 'AUSENTE' | 'PENDIENTE' | 'CANCELADA'; contabiliza: boolean; horaRegistro: string | null }
export type ResumenAsistencia = { presentes: number; realizadas: number; porcentaje: number | null }
export type ColegiadoHistorial = { id: string; nombre: string; dniEnmascarado: string | null }
export type Historial = {
  colegiado: ColegiadoHistorial; generadoEn: string; asistenciaGeneral: ResumenAsistencia; sesionesIndependientes: SesionHistorial[];
  cursos: { id: string; titulo: string; estado: 'EN_CURSO' | 'TERMINADO'; horasLectivas: number; modalidad: string; inscritoEn: string; terminadoEn: string | null;
    asistencia: ResumenAsistencia; sesiones: SesionHistorial[]; certificados: { id: string; cursoId: string; codigo: string; tipo: 'PARTICIPACION' | 'APROBACION'; emitidoEn: string }[] }[]
}
export const historiales = {
  colegiados: async () => (await api.get<ColegiadoHistorial[]>('/colegiados')).data,
  obtener: async (usuarioId: string) => (await api.get<Historial>(`/colegiados/${usuarioId}/historial`)).data,
  pdf: async (usuarioId: string) => (await api.get<Blob>(`/colegiados/${usuarioId}/historial/pdf`, { responseType: 'blob' })).data,
  certificado: async (usuarioId: string, certificadoId: string) => (await api.get<Blob>(`/colegiados/${usuarioId}/certificados/${certificadoId}/archivo`, { responseType: 'blob' })).data,
}
export function guardarDescarga(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url; enlace.download = nombre; enlace.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
