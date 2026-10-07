import { CircleCheck, CircleX } from 'lucide-react'
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

/** En el Sprint 1 el administrador solo revisa la salud técnica (/api/health). */
export function AdminPagina() {
  const { data, isPending, isError, error, refetch } = useSalud()

  return (
    <div className="px-4 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-160 flex-col gap-4">
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
