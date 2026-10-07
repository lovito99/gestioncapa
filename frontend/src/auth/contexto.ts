import { createContext } from 'react'
import type { LoginRespuesta, Usuario } from '@/types/api'

export interface ValorAuth {
  usuario: Usuario | null
  iniciar: (respuesta: LoginRespuesta) => void
  cerrar: () => Promise<void>
  /** Cierra la sesión local y conserva el aviso para el login. */
  expirar: () => void
}

export const contextoAuth = createContext<ValorAuth | null>(null)
