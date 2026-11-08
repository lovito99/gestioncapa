import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type EstadoCertificado = 'VALIDO' | 'ANULADO' | 'REEMPLAZADO'

/** Datos públicos de un certificado: los muestra la verificación (5.2–5.3b) y la constancia (5.1). */
export type CertificadoDocumento = {
  demo?: boolean
  codigo: string
  estado: EstadoCertificado
  /** Código del certificado vigente cuando este fue reemplazado */
  reemplazadoPor: string | null
  tipo: 'PARTICIPACION' | 'APROBACION'
  nombre: string
  dniEnmascarado: string | null
  curso: string
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA'
  horasLectivas: number
  fechaInicio: string | null
  fechaFin: string | null
  instructorNombre: string
  emitidoEn: string
}

export type CertificadoPublico = Pick<CertificadoDocumento, 'codigo' | 'estado' | 'reemplazadoPor' | 'tipo' | 'nombre' | 'curso' | 'horasLectivas' | 'emitidoEn' | 'demo'>

export function useDocumentoCertificado(codigo: string) {
  return useQuery({ queryKey: ['certificadoDocumento', codigo], queryFn: async () =>
    (await api.get<CertificadoDocumento>(`/certificados/${encodeURIComponent(codigo)}/documento`)).data, retry: false })
}
export async function descargarCertificado(codigo: string) {
  return (await api.get<Blob>(`/certificados/${encodeURIComponent(codigo)}/archivo`, { responseType: 'blob' })).data
}

/** El código se compara sin espacios y en mayúsculas: así se escribe igual que en el certificado. */
export const normalizarCodigo = (codigo: string) => codigo.trim().toUpperCase().replace(/\s+/g, '')

export function useCertificado(codigo: string | undefined) {
  return useQuery({
    queryKey: ['certificado', codigo],
    queryFn: async () => (await api.get<CertificadoPublico>(`/certificados/${encodeURIComponent(codigo!)}`)).data,
    enabled: !!codigo,
    retry: false,
  })
}
