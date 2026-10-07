import { Outlet } from 'react-router-dom'
import { Encabezado } from './Encabezado'
import { Navegacion } from './Navegacion'

/** Estructura común: encabezado fijo, navegación por rol y contenido. */
export function PaginaConEncabezado() {
  return (
    <div className="min-h-dvh bg-page">
      <Encabezado />
      <div className="pt-16">
        <Navegacion />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
