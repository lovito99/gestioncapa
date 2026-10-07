import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LoginRespuesta, Usuario } from '@/types/api'

export interface Credenciales {
  email: string
  password: string
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credenciales: Credenciales) => {
      const { data } = await api.post<LoginRespuesta>('/auth/login', credenciales)
      return data
    },
  })
}

export async function cerrarSesionEnServidor() {
  try {
    await api.post('/auth/logout')
  } catch {
    // Si falla igual cerramos la sesión local
  }
}

/**
 * Confirma con el servidor que la sesión sigue vigente (token aceptado y usuario
 * activo). Si responde 401, el interceptor de la API lleva al login.
 */
export function useVerificarSesion(activa: boolean) {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.get<{ usuario: Usuario }>('/auth/me')).data.usuario,
    enabled: activa,
    staleTime: Infinity,
    retry: false,
  })
}
