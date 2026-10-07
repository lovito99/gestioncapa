import { ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { inicioPorRol } from '@/auth/inicioPorRol'
import { BotonCerrarSesion } from '@/components/layout/Encabezado'

/** Se muestra cuando el usuario no tiene permiso (403) o su rol no tiene pantallas. */
export function SinPermisoPagina() {
  const { usuario } = useAuth()
  const inicio = usuario ? inicioPorRol(usuario) : '/login'

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <ShieldX className="size-8 text-danger" aria-hidden />
      <p className="text-sm font-semibold text-danger">Error 403</p>
      <h1 className="text-2xl font-semibold text-ink">No tienes permiso para ver esta página</h1>
      <p className="max-w-105 text-sm text-muted">
        Tu cuenta no tiene acceso a esta sección. Si crees que es un error, pide ayuda al coordinador.
      </p>
      <div className="mt-2 flex items-center gap-4">
        {inicio !== '/sin-permiso' && (
          <Link to={inicio} className="text-sm font-semibold text-brand hover:underline">
            Ir a mi inicio
          </Link>
        )}
        {usuario && <BotonCerrarSesion />}
      </div>
    </main>
  )
}
