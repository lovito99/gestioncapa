import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { sesion } from '@/lib/sesion'
import type { Rol } from '@/types/api'
import { useAuth } from './useAuth'
import { inicioPorRol } from './inicioPorRol'

/** Deja pasar solo a usuarios con sesión vigente y con el rol indicado. */
export function RutaProtegida({ rol }: { rol: Rol }) {
  const { usuario, expirar } = useAuth()
  const ubicacion = useLocation()
  // Se revisa en cada navegación: el token puede vencer con la pestaña abierta.
  const expirada = usuario !== null && sesion.expirada()

  useEffect(() => {
    if (expirada) expirar()
  }, [expirada, expirar])

  // Tras expirar, `usuario` pasa a null y se redirige conservando el destino.
  if (expirada) return null

  // Se guarda también la query para no perder, p. ej., el token del QR escaneado
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />
  if (usuario.rol !== rol) return <Navigate to={inicioPorRol(usuario)} replace />
  return <Outlet />
}
