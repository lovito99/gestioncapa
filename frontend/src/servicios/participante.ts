import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ClaseParticipante, MarcarAsistenciaEntrada, MarcarAsistenciaRespuesta } from '@/types/api'

export const clavesParticipante = {
  misClases: ['participante', 'clases'] as const,
}

export function useClasesParticipante() {
  return useQuery({
    queryKey: clavesParticipante.misClases,
    queryFn: async () => (await api.get<ClaseParticipante[]>('/participante/clases')).data,
  })
}

/** Envía el token leído del QR. El servidor valida firma, vigencia, clase e inscripción. */
export function useMarcarAsistencia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entrada: MarcarAsistenciaEntrada) =>
      (await api.post<MarcarAsistenciaRespuesta>('/asistencia/marcar', entrada)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesParticipante.misClases }),
  })
}
