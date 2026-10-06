import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Asistencia,
  Clase,
  ClaseEntrada,
  InstructorResumen,
  Participante,
  QrAsistencia,
} from '@/types/api'

export const claves = {
  clases: ['clases'] as const,
  misClases: ['clases', 'mias'] as const,
  clase: (id: string) => ['clases', id] as const,
  inscritos: (id: string) => ['clases', id, 'inscritos'] as const,
  asistencia: (id: string) => ['clases', id, 'asistencia'] as const,
  qr: (id: string) => ['clases', id, 'qr'] as const,
  instructores: ['instructores'] as const,
}

// ---------- Consultas ----------

export function useClases() {
  return useQuery({
    queryKey: claves.clases,
    queryFn: async () => (await api.get<Clase[]>('/clases')).data,
  })
}

export function useMisClases() {
  return useQuery({
    queryKey: claves.misClases,
    queryFn: async () => (await api.get<Clase[]>('/instructor/clases')).data,
  })
}

export function useClase(id: string) {
  return useQuery({
    queryKey: claves.clase(id),
    queryFn: async () => (await api.get<Clase>(`/clases/${id}`)).data,
    enabled: id !== '',
  })
}

export function useInstructores() {
  return useQuery({
    queryKey: claves.instructores,
    queryFn: async () => (await api.get<InstructorResumen[]>('/instructores')).data,
    staleTime: 5 * 60_000,
  })
}

export function useInscritos(claseId: string) {
  return useQuery({
    queryKey: claves.inscritos(claseId),
    queryFn: async () => (await api.get<Participante[]>(`/clases/${claseId}/inscritos`)).data,
  })
}

/** La pantalla dice "Se actualiza automáticamente": consultamos cada 5 s. */
export function useAsistencia(claseId: string) {
  return useQuery({
    queryKey: claves.asistencia(claseId),
    queryFn: async () => (await api.get<Asistencia>(`/clases/${claseId}/asistencia`)).data,
    refetchInterval: 5_000,
  })
}

/** Pide un QR nuevo justo cuando vence el anterior. */
export function useQrAsistencia(claseId: string) {
  return useQuery({
    queryKey: claves.qr(claseId),
    queryFn: async () => (await api.get<QrAsistencia>(`/clases/${claseId}/qr`)).data,
    refetchInterval: (query) => {
      const qr = query.state.data
      if (!qr) return false
      const restante = Date.parse(qr.expiraEn) - Date.parse(qr.servidorAhora)
      const transcurrido = Date.now() - query.state.dataUpdatedAt
      return Math.max(restante - transcurrido, 500)
    },
    refetchIntervalInBackground: true,
  })
}

// ---------- Mutaciones ----------

export function useGuardarClase(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entrada: ClaseEntrada) => {
      const { data } = id
        ? await api.put<Clase>(`/clases/${id}`, entrada)
        : await api.post<Clase>('/clases', entrada)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.clases }),
  })
}

export function useCancelarClase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.post<Clase>(`/clases/${id}/cancelar`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.clases }),
  })
}

export function useInscribirParticipante(claseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) =>
      (await api.post<Participante>(`/clases/${claseId}/inscritos`, { email })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.clase(claseId) }),
  })
}
