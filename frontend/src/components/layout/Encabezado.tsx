import { LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { inicioPorRol } from '@/auth/inicioPorRol'
import { cn } from '@/lib/cn'
import { LogoPlano, LogoRecuadro } from './Logo'

export function BotonCerrarSesion({ className }: { className?: string }) {
  const { cerrar } = useAuth()
  const navegar = useNavigate()
  return (
    <button
      type="button"
      onClick={async () => {
        await cerrar()
        navegar('/login', { replace: true })
      }}
      className={cn(
        'flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-muted-2 hover:bg-surface-3',
        className,
      )}
    >
      <LogOut className="size-3.75" aria-hidden />
      Cerrar sesión
    </button>
  )
}

/** Encabezado fijo de las pantallas internas. */
export function Encabezado() {
  const { usuario } = useAuth()
  if (!usuario) return null
  const esCoordinador = usuario.rol === 'COORDINADOR'

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line-2 bg-white px-4 sm:px-10">
      <div className="mx-auto flex h-16 max-w-300 items-center justify-between gap-4 sm:px-6">
        <Link to={inicioPorRol(usuario)} className="flex items-center gap-2 rounded-lg">
          {esCoordinador ? <LogoRecuadro /> : <LogoPlano />}
          <span
            className={cn(
              'text-base leading-6 font-semibold tracking-[-0.4px]',
              esCoordinador ? 'text-ink-2' : 'text-brand',
            )}
          >
            GestionCapa
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-6">
          <span className="hidden text-sm text-muted-2 md:inline">
            {usuario.nombre} · {usuario.cargo}
          </span>
          <BotonCerrarSesion />
        </div>
      </div>
    </header>
  )
}
