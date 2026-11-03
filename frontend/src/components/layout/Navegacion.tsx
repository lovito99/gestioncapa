import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { cn } from '@/lib/cn'
import type { Rol } from '@/types/api'

type Opcion = { to: string; texto: string; end?: boolean }

const REUNIONES: Opcion = { to: '/reuniones', texto: 'Reuniones virtuales' }

/**
 * Menú de cada rol según el encabezado del Figma (HU-49): primero las opciones del diseño, en su
 * orden. Al final quedan las que existen en la aplicación pero el diseño aún no incluye.
 * «+ Nueva clase» vive en la lista de clases y «Escanear QR» en el detalle de cada clase.
 */
const OPCIONES: Record<Rol, Opcion[]> = {
  ADMIN: [
    { to: '/cursos', texto: 'Cursos' },
    { to: '/admin/clases', texto: 'Clases' },
    { to: '/admin/certificados', texto: 'Certificados' },
    { to: '/admin/historial', texto: 'Usuarios', end: true },
    REUNIONES,
    { to: '/admin', texto: 'Estado del sistema', end: true },
  ],
  COORDINADOR: [{ to: '/coordinador/clases', texto: 'Clases' }, REUNIONES],
  INSTRUCTOR: [{ to: '/instructor/clases', texto: 'Mis clases' }, { to: '/cursos', texto: 'Mis cursos' }, REUNIONES],
  PARTICIPANTE: [
    { to: '/catalogo', texto: 'Catálogo', end: true },
    { to: '/participante/clases', texto: 'Mis cursos' },
    { to: '/historial', texto: 'Historial', end: true },
    REUNIONES,
  ],
}

/** Menú en pestañas bajo el encabezado del CPPP; la activa lleva el subrayado vino. */
export function Navegacion() {
  const { usuario } = useAuth()
  if (!usuario) return null

  return (
    <nav aria-label="Navegación principal" className="border-t border-line px-4 sm:px-10">
      <div className="mx-auto flex h-11 max-w-300 gap-8 overflow-x-auto sm:px-6">
        {OPCIONES[usuario.rol]?.map(({ to, texto, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'inline-flex shrink-0 items-center border-b-3 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
                isActive ? 'border-brand font-semibold text-brand' : 'border-transparent font-medium text-muted hover:text-ink',
              )
            }
          >
            {texto}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
