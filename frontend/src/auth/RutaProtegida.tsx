import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Rol } from '@/types/api'
import { useAuth } from './AuthContext'
import { inicioPorRol } from './inicioPorRol'

/** Deja pasar solo a usuarios con sesión y con el rol indicado. */
export function RutaProtegida({ rol }: { rol: Rol }) {
  const { usuario } = useAuth()
  const ubicacion = useLocation()

  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
  if (usuario.rol !== rol) return <Navigate to={inicioPorRol(usuario)} replace />
  return <Outlet />
}
