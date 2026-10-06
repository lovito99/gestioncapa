import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EstadoSalud } from '@/types/api'

export function useSalud() {
  return useQuery({
    queryKey: ['salud'],
    queryFn: async () => (await api.get<EstadoSalud>('/health')).data,
    refetchInterval: 15_000,
  })
}
