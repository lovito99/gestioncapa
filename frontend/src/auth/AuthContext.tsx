import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { sesion } from '@/lib/sesion'
import { cerrarSesionEnServidor, useVerificarSesion } from '@/servicios/auth'
import type { LoginRespuesta, Usuario } from '@/types/api'

interface ValorAuth {
  usuario: Usuario | null
  iniciar: (respuesta: LoginRespuesta) => void
  cerrar: () => Promise<void>
  /** Cierra la sesión local sin llamar al servidor y deja el aviso para el login. */
  expirar: () => void
}

const AuthContext = createContext<ValorAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = sesion.obtenerUsuario()
    if (guardado && sesion.expirada()) {
      sesion.expirar()
      return null
    }
    return guardado
  })
  useVerificarSesion(usuario !== null)

  const iniciar = useCallback(({ token, usuario }: LoginRespuesta) => {
    sesion.guardar(token, usuario)
    setUsuario(usuario)
  }, [])

  const cerrar = useCallback(async () => {
    await cerrarSesionEnServidor()
    sesion.cerrar()
    queryClient.clear()
    setUsuario(null)
  }, [queryClient])

  const expirar = useCallback(() => {
    sesion.expirar()
    queryClient.clear()
    setUsuario(null)
  }, [queryClient])

  const valor = useMemo(() => ({ usuario, iniciar, cerrar, expirar }), [usuario, iniciar, cerrar, expirar])
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const valor = useContext(AuthContext)
  if (!valor) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return valor
}
