import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import { api } from '@/lib/api'
import { claves } from '@/servicios/clases'
import type { BusquedaDniRespuesta, ContextoPuerta, MiQr, RegistroPuertaEntrada, RegistroPuertaRespuesta, SesionPuerta } from '@/types/api'

export const digitosDni = 8

const rutaPuerta = (claseId: string) => `/clases/${claseId}/asistencia/puerta`
const clavePuerta = (claseId: string) => [...claves.clase(claseId), 'puerta'] as const

export function useMiQr() {
  const { usuario } = useAuth()
  return useQuery({
    queryKey: ['participante', 'mi-qr', usuario?.id],
    queryFn: async ({ signal }) => (await api.get<MiQr>('/participante/mi-qr', { signal })).data,
    enabled: Boolean(usuario),
    gcTime: 0,
  })
}

export async function descargarMiQr() {
  return (await api.get<Blob>('/participante/mi-qr/pdf', { responseType: 'blob' })).data
}

/** El contenido de la credencial es un token; se conserva la lectura de enlaces impresos en demostración. */
export function extraerTokenPersonal(texto: string) {
  const limpio = texto.trim()
  try {
    return new URL(limpio).searchParams.get('qr') ?? limpio
  } catch {
    return limpio
  }
}

export function useContextoPuerta(claseId: string) {
  const { usuario } = useAuth()
  return useQuery({
    queryKey: [...clavePuerta(claseId), usuario?.id],
    queryFn: async ({ signal }) => (await api.get<ContextoPuerta>(rutaPuerta(claseId), { signal })).data,
    enabled: Boolean(claseId && usuario),
    refetchInterval: 10_000,
    gcTime: 0,
    retry: false,
  })
}

export function useSesionesDelegadas() {
  const { usuario } = useAuth()
  return useQuery({
    queryKey: [...claves.misClases, 'puerta', usuario?.id],
    queryFn: async ({ signal }) => (await api.get<SesionPuerta[]>('/instructor/clases/puerta', { signal })).data,
    enabled: Boolean(usuario),
    gcTime: 0,
  })
}

export function useBuscarPorDni(claseId: string) {
  return useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (dni: string) =>
      (await api.post<BusquedaDniRespuesta>(`${rutaPuerta(claseId)}/buscar-dni`, { dni }, { timeout: 15000 })).data,
  })
}

function useRefrescarAsistencia(claseId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: claves.asistencia(claseId) }),
      queryClient.invalidateQueries({ queryKey: clavePuerta(claseId) }),
    ])
}

export function useRegistrarEnPuerta(claseId: string) {
  const refrescar = useRefrescarAsistencia(claseId)
  return useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (entrada: RegistroPuertaEntrada) =>
      (await api.post<RegistroPuertaRespuesta>(rutaPuerta(claseId), entrada, { timeout: 15000 })).data,
    onSuccess: refrescar,
  })
}

export function useDeshacerRegistro(claseId: string) {
  const refrescar = useRefrescarAsistencia(claseId)
  return useMutation({
    retry: false,
    mutationFn: async (marcaId: string) => {
      await api.delete(`${rutaPuerta(claseId)}/${encodeURIComponent(marcaId)}`, { timeout: 15000 })
    },
    onSuccess: refrescar,
  })
}
