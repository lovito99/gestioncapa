import { api } from '@/lib/api'
import type { EstadoCertificado } from './certificados'
export type SesionHistorial = { id: string; cursoId: string | null; titulo: string; fecha: string; horaInicio: string; horaFin: string; estado: 'PRESENTE' | 'AUSENTE' | 'PENDIENTE' | 'CANCELADA'; contabiliza: boolean; horaRegistro: string | null }
export type ResumenAsistencia = { presentes: number; realizadas: number; porcentaje: number | null }
export type ColegiadoHistorial = { id: string; nombre: string; dniEnmascarado: string | null }
export type CertificadoHistorial = {
  id: string; cursoId: string; codigo: string; tipo: 'PARTICIPACION' | 'APROBACION'; emitidoEn: string; horasLectivas: number;
  /** Solo los VALIDO suman horas (HU-34); un anulado se muestra pero no cuenta */
  estado: EstadoCertificado;
}
export type Historial = {
  horasAcumuladas: { total: number; porAnio: { anio: string; horas: number }[] };
  colegiado: ColegiadoHistorial; generadoEn: string; asistenciaGeneral: ResumenAsistencia; sesionesIndependientes: SesionHistorial[];
  cursos: { id: string; titulo: string; estado: 'EN_CURSO' | 'TERMINADO' | 'PENDIENTE_PAGO'; horasLectivas: number; modalidad: string; inscritoEn: string; terminadoEn: string | null;
    /** Porcentaje mínimo de asistencia para la constancia (SCRUM-171); explica por qué no se emitió */
    requisitoAsistencia: number;
    /** Curso con costo cuyo pago aún no se confirma (HU-16): la inscripción queda «pendiente de pago» */
    pagoPendiente: boolean;
    asistencia: ResumenAsistencia; sesiones: SesionHistorial[]; certificados: CertificadoHistorial[] }[]
}
type HistorialRecibido = Omit<Historial, 'cursos'> & {
  cursos: (Omit<Historial['cursos'][number], 'requisitoAsistencia' | 'pagoPendiente' | 'certificados'> & {
    requisitoAsistencia?: number; pagoPendiente?: boolean; certificados: (Omit<CertificadoHistorial, 'estado'> & { estado?: EstadoCertificado })[]
  })[]
}
export const historiales = {
  colegiados: async () => (await api.get<ColegiadoHistorial[]>('/colegiados')).data,
  obtener: async (usuarioId: string): Promise<Historial> => {
    const historial = (await api.get<HistorialRecibido>(`/colegiados/${usuarioId}/historial`)).data
    // Transición: si el backend aún no envía estos campos, se usan el 80 % del Figma, sin pago
    // pendiente y certificados válidos (ver docs/esp/pantallas-figma.md)
    return { ...historial, cursos: historial.cursos.map(c => ({
      ...c, requisitoAsistencia: c.requisitoAsistencia ?? 80, pagoPendiente: c.pagoPendiente ?? false,
      certificados: c.certificados.map(cert => ({ ...cert, estado: cert.estado ?? 'VALIDO' })),
    })) }
  },
  pdf: async (usuarioId: string) => (await api.get<Blob>(`/colegiados/${usuarioId}/historial/pdf`, { responseType: 'blob' })).data,
  certificado: async (usuarioId: string, certificadoId: string) => (await api.get<Blob>(`/colegiados/${usuarioId}/certificados/${certificadoId}/archivo`, { responseType: 'blob' })).data,
}
export function guardarDescarga(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url; enlace.download = nombre; enlace.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
