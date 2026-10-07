import { Activity, BookOpen, CalendarPlus, ScanLine } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { cn } from '@/lib/cn'
import type { Rol } from '@/types/api'

const OPCIONES = {
  ADMIN: [
    { to: '/admin', texto: 'Estado del sistema', icono: Activity, end: true },
    { to: '/admin/clases', texto: 'Clases', icono: BookOpen, end: false },
    { to: '/admin/clases/nueva', texto: 'Programar clase', icono: CalendarPlus, end: true },
  ],
  COORDINADOR: [
    { to: '/coordinador/clases', texto: 'Clases', icono: BookOpen, end: false },
    { to: '/coordinador/clases/nueva', texto: 'Programar clase', icono: CalendarPlus, end: true },
  ],
  INSTRUCTOR: [
    { to: '/instructor/clases', texto: 'Mis clases', icono: BookOpen, end: false },
  ],
  PARTICIPANTE: [
    { to: '/participante/clases', texto: 'Mis clases', icono: BookOpen, end: false },
    { to: '/participante/escanear', texto: 'Escanear QR', icono: ScanLine, end: true },
  ],
} satisfies Record<Rol, { to: string; texto: string; icono: typeof Activity; end: boolean }[]>

export function Navegacion() {
  const { usuario } = useAuth()
  if (!usuario) return null

  return (
    <nav aria-label="Navegación principal" className="border-b border-line-soft bg-white px-4 sm:px-10">
      <div className="mx-auto flex max-w-300 flex-wrap gap-2 py-3 sm:px-6">
        {OPCIONES[usuario.rol]?.map(({ to, texto, icono: Icono, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              isActive ? 'bg-brand-soft text-brand-dark' : 'text-muted hover:bg-surface-3 hover:text-ink',
            )}
          >
            <Icono className="size-4 shrink-0" aria-hidden />
            {texto}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
