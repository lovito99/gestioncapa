import { ArrowRight, BookOpen, CalendarPlus, CircleCheck, CircleX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { cn } from '@/lib/cn'
import { mensajeDeError } from '@/lib/api'
import { useSalud } from '@/servicios/salud'
import type { EstadoSalud } from '@/types/api'

const COMPONENTES: { nombre: string; funciona: (salud: EstadoSalud) => boolean }[] = [
  { nombre: 'API', funciona: (s) => s.ok },
  { nombre: 'PostgreSQL', funciona: (s) => s.database === 'ready' },
  { nombre: 'Redis', funciona: (s) => s.redis === 'ready' },
]

/** Accesos a la gestión y estado técnico del sistema. */
export function AdminPagina() {
  const { data, isPending, isError, error, refetch } = useSalud()

  return (
    <div className="px-4 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-300 flex-col gap-6 sm:px-6">
        <section aria-label="Gestión de capacitaciones" className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/admin/clases"
            className="flex items-start gap-4 rounded-xl border border-line bg-white p-5 hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
          >
            <BookOpen className="size-6 shrink-0 text-brand" aria-hidden />
            <div className="flex-1">
              <h2 className="text-base font-semibold text-ink">Gestionar clases</h2>
              <p className="mt-1 text-sm text-muted">
                Consulta y edita clases, inscribe participantes, revisa la asistencia y muestra el código QR.
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-brand" aria-hidden />
          </Link>
          <Link
            to="/admin/clases/nueva"
            className="flex items-start gap-4 rounded-xl border border-line bg-white p-5 hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
          >
            <CalendarPlus className="size-6 shrink-0 text-brand" aria-hidden />
            <div className="flex-1">
              <h2 className="text-base font-semibold text-ink">Crear una clase</h2>
              <p className="mt-1 text-sm text-muted">
                Programa una capacitación y asigna su instructor, fecha, horario y lugar.
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-brand" aria-hidden />
          </Link>
        </section>
        <header>
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.36px] text-ink">Estado del sistema</h1>
          <p className="mt-1 text-sm leading-5 text-muted">Se actualiza cada 15 segundos</p>
        </header>

        {isPending ? (
          <Cargando />
        ) : isError ? (
          <ErrorCarga mensaje={mensajeDeError(error, 'No pudimos consultar el estado.')} onReintentar={refetch} />
        ) : (
          <ul className="divide-y divide-line-soft rounded-xl border border-line bg-white">
            {COMPONENTES.map(({ nombre, funciona }) => {
              const ok = funciona(data)
              const Icono = ok ? CircleCheck : CircleX
              return (
                <li key={nombre} className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm font-medium text-ink">{nombre}</span>
                  <span className={cn('flex items-center gap-1.5 text-sm font-semibold', ok ? 'text-success' : 'text-danger')}>
                    <Icono className="size-4" aria-hidden />
                    {ok ? 'Funcionando' : 'Con fallas'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
