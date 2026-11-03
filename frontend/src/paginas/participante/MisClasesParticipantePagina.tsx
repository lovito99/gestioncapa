import { Calendar, ChevronRight, CircleCheck, MapPin, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EtiquetaEstadoClase } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { fechaCorta, horaRegistro, rangoHorario } from '@/lib/formato'
import { useClasesParticipante } from '@/servicios/participante'
import type { ClaseParticipante } from '@/types/api'

/** 3.1 · Mis clases del agremiado. Diseñada primero para celular (360 px). */
export function MisClasesParticipantePagina() {
  const { data: clases, isPending, isError, error, refetch } = useClasesParticipante()

  return (
    <div className="px-4 pt-5 pb-12 sm:px-10 sm:pt-8">
      <div className="mx-auto flex w-full max-w-160 flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl leading-7.5 font-bold tracking-[-0.6px] text-ink">Mis clases</h1>
          <p className="text-sm text-muted">Clases presenciales en las que estás inscrito(a)</p>
        </header>

        {isPending ? (
          <Cargando texto="Cargando tus clases…" />
        ) : isError ? (
          <ErrorCarga mensaje={mensajeDeError(error, 'No pudimos cargar tus clases.')} onReintentar={refetch} />
        ) : clases.length === 0 ? (
          <p className="rounded-xl border border-line bg-white py-12 text-center text-sm text-muted">
            Aún no estás inscrito(a) en ninguna clase.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {clases.map((clase) => (
              <li key={clase.id}>
                <TarjetaClase clase={clase} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Toda la tarjeta lleva al detalle de la clase (3.2), como indica el chevron del Figma. */
function TarjetaClase({ clase }: { clase: ClaseParticipante }) {
  return (
    <Link
      to={`/participante/clases/${clase.id}`}
      // El enlace se anuncia solo con el nombre de la clase
      aria-labelledby={`clase-${clase.id}-nombre`}
      className="flex min-w-0 flex-col gap-2.5 rounded-xl wrap-anywhere border border-line bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={`clase-${clase.id}-nombre`} className="min-w-0 text-base leading-5.5 font-semibold text-ink">{clase.nombre}</h2>
        <span className="flex shrink-0 items-center gap-2">
          {clase.estado === 'CANCELADA' && <EtiquetaEstadoClase estado={clase.estado} />}
          <ChevronRight className="mt-0.5 size-5 text-muted" aria-hidden />
        </span>
      </div>

      <ul className="flex flex-col gap-2 border-t border-line pt-1.5 text-sm leading-4.5 text-muted">
        <Dato icono={Calendar}>{`${fechaCorta(clase.fecha)} · ${rangoHorario(clase.horaInicio, clase.horaFin)}`}</Dato>
        <Dato icono={MapPin}>{clase.lugar}</Dato>
        <Dato icono={User}>{`Instructor: ${clase.instructor.nombre}`}</Dato>
      </ul>

      {clase.miAsistencia && (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          Asistencia registrada a las {horaRegistro(clase.miAsistencia)}
        </p>
      )}
    </Link>
  )
}

function Dato({ icono: Icono, children }: { icono: LucideIcon; children: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <Icono className="size-4 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  )
}
