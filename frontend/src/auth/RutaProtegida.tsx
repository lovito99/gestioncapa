import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Rol } from '@/types/api'
import { useAuth } from './AuthContext'
import { inicioPorRol } from './inicioPorRol'

/** Deja pasar solo a usuarios con sesión y con el rol indicado. */
export function RutaProtegida({ rol }: { rol: Rol }) {
  const { usuario } = useAuth()
  const ubicacion = useLocation()

  // Se guarda también la query para no perder, p. ej., el token del QR escaneado
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />
  if (usuario.rol !== rol) return <Navigate to={inicioPorRol(usuario)} replace />
  return <Outlet />
}
