import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { sesion } from '@/lib/sesion'
import { cerrarSesionEnServidor, useVerificarSesion } from '@/servicios/auth'
import type { LoginRespuesta, Usuario } from '@/types/api'
import { contextoAuth } from './contexto'
import { Cargando } from '@/components/ui/Estados'

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
  const verificacion = useVerificarSesion(usuario !== null)
  const usuarioActual = usuario ? verificacion.data ?? usuario : null

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

  const valor = useMemo(() => ({ usuario: usuarioActual, iniciar, cerrar, expirar }), [usuarioActual, iniciar, cerrar, expirar])
  if (usuario && verificacion.isPending) return <Cargando texto="Verificando sesión…" />
  return <contextoAuth.Provider value={valor}>{children}</contextoAuth.Provider>
}
