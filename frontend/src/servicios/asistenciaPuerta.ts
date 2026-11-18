import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { claves } from '@/servicios/clases'
import type { BusquedaDniRespuesta, MiQr, RegistroPuertaEntrada, RegistroPuertaRespuesta } from '@/types/api'

/** La búsqueda por DNI empieza con este número de dígitos (diseño S3 1.4). */
export const MINIMO_DIGITOS_DNI = 4

const clavesPuerta = {
  miQr: ['participante', 'mi-qr'] as const,
  busqueda: (claseId: string, dni: string) => ['clases', claseId, 'puerta', dni] as const,
  todasBusquedas: (claseId: string) => ['clases', claseId, 'puerta'] as const,
}

/** HU-39: QR personal del agremiado. El token es permanente; la próxima sesión puede cambiar. */
export function useMiQr() {
  return useQuery({
    queryKey: clavesPuerta.miQr,
    queryFn: async () => (await api.get<MiQr>('/participante/mi-qr')).data,
  })
}

export async function descargarMiQr() {
  return (await api.get<Blob>('/participante/mi-qr/pdf', { responseType: 'blob' })).data
}

/** El QR personal es el token suelto; aceptamos también una URL con `?qr=` por si se imprime como enlace. */
export function extraerTokenPersonal(texto: string) {
  const limpio = texto.trim()
  try {
    return new URL(limpio).searchParams.get('qr') ?? limpio
  } catch {
    return limpio
  }
}

/** Inscritos de la clase cuyo DNI empieza con `dni`. Solo consulta desde el mínimo de dígitos. */
export function useBuscarPorDni(claseId: string, dni: string) {
  return useQuery({
    queryKey: clavesPuerta.busqueda(claseId, dni),
    queryFn: async () =>
      (await api.get<BusquedaDniRespuesta>(`/clases/${claseId}/asistencia/puerta`, { params: { dni } })).data,
    enabled: dni.length >= MINIMO_DIGITOS_DNI,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

/** Tras registrar o deshacer, se actualizan el contador, la lista y las búsquedas abiertas. */
function useRefrescarAsistencia(claseId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: claves.asistencia(claseId) }),
      queryClient.invalidateQueries({ queryKey: clavesPuerta.todasBusquedas(claseId) }),
    ])
}

/** Registra la asistencia en la puerta con el QR personal o eligiendo al inscrito de la búsqueda. */
export function useRegistrarEnPuerta(claseId: string) {
  const refrescar = useRefrescarAsistencia(claseId)
  return useMutation({
    retry: false,
    mutationFn: async (entrada: RegistroPuertaEntrada) =>
      (await api.post<RegistroPuertaRespuesta>(`/clases/${claseId}/asistencia/puerta`, entrada, { timeout: 15000 })).data,
    onSuccess: refrescar,
  })
}

/** «Deshacer este registro»: borra la marca recién hecha por error. */
export function useDeshacerRegistro(claseId: string) {
  const refrescar = useRefrescarAsistencia(claseId)
  return useMutation({
    retry: false,
    mutationFn: async (participanteId: string) => {
      await api.delete(`/clases/${claseId}/asistencia/puerta/${encodeURIComponent(participanteId)}`)
    },
    onSuccess: refrescar,
  })
}
