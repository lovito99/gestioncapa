import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Encabezado } from './Encabezado'
import { PiePagina } from './PiePagina'

/** Estructura común: encabezado del CPPP con el menú del rol, contenido y pie. */
export function PaginaConEncabezado() {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <Encabezado />
      <main className="flex-1">
        <Outlet />
      </main>
      <PiePagina />
    </div>
  )
}

/** Estructura de las pantallas sin sesión (login, registro): encabezado y pie del CPPP. */
export function PaginaPublica({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <Encabezado />
      <div className={cn('flex flex-1 flex-col', className)}>{children}</div>
      <PiePagina />
    </div>
  )
}
