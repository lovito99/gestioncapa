import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
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
    // Mostrar el fallo y permitir reescaneo incluso si el celular está sin red.
    networkMode: 'always',
    retry: false,
    mutationFn: async (entrada: MarcarAsistenciaEntrada) => {
      if (!navigator.onLine) throw new ApiError(0, {
        code: 'ERROR_DE_RED',
        message: 'Sin conexión. Revisa tu conexión y vuelve a escanear.',
      })
      return (await api.post<MarcarAsistenciaRespuesta>('/asistencia/marcar', entrada, { timeout: 15000 })).data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesParticipante.misClases }),
  })
}
