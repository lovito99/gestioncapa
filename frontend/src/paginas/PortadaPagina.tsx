import { Link, Navigate, useLocation } from 'react-router-dom'
import insignia from '@/assets/insignia-cppp.png'
import { inicioPorRol } from '@/auth/inicioPorRol'
import { useAuth } from '@/auth/useAuth'
import { PaginaPublica } from '@/components/layout/Pagina'

const boton =
  'inline-flex h-12 items-center justify-center text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'

/** Portada pública (Figma 1.0): presenta las capacitaciones y lleva al catálogo o al registro. */
export function PortadaPagina() {
  const { usuario } = useAuth()
  const { search } = useLocation()
  // Los enlaces de búsqueda guardados de cuando la raíz era el catálogo siguen funcionando
  if (new URLSearchParams(search).has('buscar')) return <Navigate to={`/capacitaciones${search}`} replace />
  if (usuario) return <Navigate to={inicioPorRol(usuario)} replace />

  return (
    <PaginaPublica encabezado="portada">
      <main className="flex-1 bg-brand-night px-4 py-8 sm:px-10 lg:py-18">
        <div className="mx-auto flex max-w-300 flex-col gap-8 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-5">
            <img src={insignia} alt="" width={65} height={89} className="h-22 w-16 object-contain" />
            <p className="text-xs leading-4 font-medium text-gold-light">REGIÓN CUSCO · CAPACITACIÓN DOCENTE</p>
            <h1 className="max-w-140 text-2xl leading-8 font-bold text-white sm:text-[32px] sm:leading-10">
              Capacitaciones del Colegio de Profesores del Perú
            </h1>
            <span aria-hidden className="h-0.75 w-14 bg-gold" />
            <p className="max-w-130 text-base leading-6 text-brand-soft">
              Inscríbete en cursos presenciales, virtuales y grabados. Avanza a tu ritmo y obtén certificados con código QR verificable.
            </p>
            <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
              <Link to="/capacitaciones" className={`${boton} rounded-3xl bg-gold px-8 font-semibold text-brand-night hover:bg-gold-light sm:min-w-60`}>
                Ver catálogo de cursos
              </Link>
              <Link to="/registro" className={`${boton} rounded-lg border-[1.5px] border-white px-6 font-medium text-white hover:bg-white/10`}>
                Crear cuenta
              </Link>
            </div>
            <p className="text-sm leading-5 text-gold-light">¿Ya tienes cuenta? Inicia sesión arriba a la derecha.</p>
          </div>

          {/* Espacio reservado: falta la foto real que debe entregar el CPPP (1040 × 800 px) */}
          <div aria-hidden className="order-first flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold bg-brand-dark p-4 text-center lg:order-none lg:h-100 lg:w-130 lg:shrink-0">
            <span className="text-xs leading-4 font-medium text-gold-light">FOTO INSTITUCIONAL</span>
            <span className="max-w-90 text-sm leading-5 text-brand-soft">Reemplazar por una foto real del CPPP</span>
          </div>
        </div>
      </main>
    </PaginaPublica>
  )
}
