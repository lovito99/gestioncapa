import { LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { inicioPorRol } from '@/auth/inicioPorRol'
import { cn } from '@/lib/cn'
import { CPPP } from '@/lib/cppp'
import { LogoInsignia } from './Logo'
import { Navegacion } from './Navegacion'

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
        'flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold whitespace-nowrap text-muted-2 hover:bg-surface-3',
        className,
      )}
    >
      <LogOut className="size-3.5" aria-hidden />
      Cerrar sesión
    </button>
  )
}

/** Encabezado institucional del CPPP (HU-49); con sesión suma el menú del rol. */
export function Encabezado() {
  const { usuario } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white print:hidden">
      <div className="px-4 sm:px-10">
        <div className="mx-auto flex max-w-300 items-center justify-between gap-4 py-2.5 sm:px-6 sm:py-3">
          {/* En celular el Figma acorta el nombre y pone el enlace a la web debajo */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link to={usuario ? inicioPorRol(usuario) : '/'} className="shrink-0 rounded-lg" aria-label={`${CPPP.nombre} – ${CPPP.region}`}>
              <LogoInsignia alto={36} className="sm:hidden" />
              <LogoInsignia alto={44} className="max-sm:hidden" />
            </Link>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-serif text-sm font-bold text-ink sm:text-base">
                <span className="sm:hidden">CPPP {CPPP.region}</span>
                <span className="max-sm:hidden">{CPPP.nombre}</span>
              </span>
              <span className="text-xs leading-4 font-medium tracking-[0.96px] text-brand uppercase max-sm:hidden">{CPPP.region}</span>
              <a href={CPPP.web.url} target="_blank" rel="noreferrer" className="text-xs leading-4 font-medium text-brand underline sm:hidden">
                Ir a la web del CPPP ↗
              </a>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-6">
            <a
              href={CPPP.web.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'text-sm whitespace-nowrap text-brand underline hover:text-brand-ink',
                usuario ? 'hidden lg:inline' : 'max-sm:hidden',
              )}
            >
              Ir a la web del CPPP ↗
            </a>
            {!usuario && <Link to="/login" className="text-sm font-semibold text-brand underline">Iniciar sesión</Link>}
            {usuario && (
              <>
                <span className="hidden text-sm whitespace-nowrap text-muted-2 md:inline">
                  {usuario.nombre} · {usuario.cargo}
                </span>
                <BotonCerrarSesion />
              </>
            )}
          </div>
        </div>
      </div>
      <Navegacion />
    </header>
  )
}
