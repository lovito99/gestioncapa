import { Outlet } from 'react-router-dom'
import { Encabezado } from './Encabezado'

/** Estructura común: encabezado fijo + contenido con fondo lavanda. */
export function PaginaConEncabezado() {
  return (
    <div className="min-h-dvh bg-page">
      <Encabezado />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  )
}
