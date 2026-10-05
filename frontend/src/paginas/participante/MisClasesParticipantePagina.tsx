import { Calendar, CircleCheck, Clock, MapPin, ScanLine, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EtiquetaEstadoClase } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { fechaCorta, horaRegistro, rangoHorario } from '@/lib/formato'
import { useClasesParticipante } from '@/servicios/participante'
import type { ClaseParticipante } from '@/types/api'

/** Pantalla de clase del participante. Diseñada primero para celular (360 px). */
export function MisClasesParticipantePagina() {
  const { data: clases, isPending, isError, error, refetch } = useClasesParticipante()

  return (
    <div className="px-4 py-6 sm:px-10">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
        <header>
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.36px] text-ink">Mis clases</h1>
          <p className="mt-1 text-sm leading-5 text-muted">Clases presenciales en las que estás inscrito(a)</p>
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

function TarjetaClase({ clase }: { clase: ClaseParticipante }) {
  const cancelada = clase.estado === 'CANCELADA'

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base leading-6 font-semibold text-ink">{clase.nombre}</h2>
        {cancelada && <EtiquetaEstadoClase estado={clase.estado} />}
      </div>

      <ul className="flex flex-col gap-1.5 text-sm text-muted">
        <Dato icono={Calendar}>{fechaCorta(clase.fecha)}</Dato>
        <Dato icono={Clock}>{`${rangoHorario(clase.horaInicio, clase.horaFin)} (hora de Lima)`}</Dato>
        <Dato icono={MapPin}>{clase.lugar}</Dato>
        <Dato icono={User}>{clase.instructor.nombre}</Dato>
      </ul>

      {clase.miAsistencia ? (
        <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2.5 text-sm font-medium text-success">
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          Asistencia registrada a las {horaRegistro(clase.miAsistencia)}
        </p>
      ) : (
        !cancelada && (
          <Link
            to={`/participante/clases/${clase.id}/escanear`}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-base font-semibold text-white hover:bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light"
          >
            <ScanLine className="size-5" aria-hidden />
            Registrar asistencia
          </Link>
        )
      )}
    </article>
  )
}

function Dato({ icono: Icono, children }: { icono: LucideIcon; children: string }) {
  return (
    <li className="flex items-start gap-2">
      <Icono className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  )
}
