import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LoginRespuesta } from '@/types/api'

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
