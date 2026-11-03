import { Calendar, ChevronLeft, CircleCheck, Clock, MapPin, ScanQrCode, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Alerta } from '@/components/ui/Alerta'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { fechaLarga, horaRegistro, rangoHorario } from '@/lib/formato'
import { useClasesParticipante } from '@/servicios/participante'

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

/** 3.2 · Detalle de clase del agremiado, con el botón fijo para marcar asistencia. */
export function DetalleClaseParticipantePagina() {
  const { id } = useParams()
  const { data: clases, isPending, isError, error, refetch } = useClasesParticipante()
  const clase = clases?.find((c) => c.id === id)

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-line bg-white px-4 sm:px-10">
        <div className="mx-auto flex h-14 max-w-160 items-center">
          <Link to="/participante/clases" className="flex items-center gap-1.5 py-1 text-[15px] font-medium text-ink hover:text-brand">
            <ChevronLeft className="size-5" aria-hidden />
            Mis clases
          </Link>
        </div>
      </div>

      <div className="flex-1 px-4 pt-6 pb-8 sm:px-10">
        <div className="mx-auto flex max-w-160 flex-col gap-5">
          {isPending ? (
            <Cargando texto="Cargando la clase…" />
          ) : isError ? (
            <ErrorCarga mensaje={mensajeDeError(error, 'No pudimos cargar la clase.')} onReintentar={refetch} />
          ) : !clase ? (
            <Alerta tipo="error" titulo="No encontramos esta clase">
              Puede que ya no estés inscrito(a) en ella. Revisa tu lista de clases.
            </Alerta>
          ) : (
            <>
              <h1 className="text-2xl leading-7.5 font-bold tracking-[-0.6px] wrap-anywhere text-ink">{clase.nombre}</h1>
              <ul className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 text-base leading-5.5 text-ink shadow-[0_1px_1.5px_rgba(0,0,0,0.04)]">
                <Dato icono={Calendar}>{capitalizar(fechaLarga(clase.fecha))}</Dato>
                <Dato icono={Clock}>{rangoHorario(clase.horaInicio, clase.horaFin)}</Dato>
                <Dato icono={MapPin}>{clase.lugar}</Dato>
                <Dato icono={User}>{`Instructor: ${clase.instructor.nombre}`}</Dato>
              </ul>

              {clase.estado === 'CANCELADA' ? (
                <Alerta tipo="error">Esta clase fue cancelada. No es necesario registrar asistencia.</Alerta>
              ) : clase.miAsistencia ? (
                <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2.5 text-sm font-medium text-success">
                  <CircleCheck className="size-4 shrink-0" aria-hidden />
                  Asistencia registrada a las {horaRegistro(clase.miAsistencia)}
                </p>
              ) : (
                <p className="px-0.5 text-sm leading-[22.75px] text-muted">
                  Cuando el instructor muestre el código QR en clase, toca el botón para registrar tu asistencia.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {clase && clase.estado !== 'CANCELADA' && !clase.miAsistencia && (
        // Barra fija abajo: el botón queda al alcance del pulgar aunque se haga scroll
        <div className="sticky bottom-0 border-t border-transparent bg-page/90 px-4 pt-4 pb-4 backdrop-blur-[2px] sm:px-10">
          <div className="mx-auto max-w-160">
            <Link
              to={`/participante/clases/${clase.id}/escanear`}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-brand text-base font-medium text-white hover:bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light"
            >
              <ScanQrCode className="size-5" aria-hidden />
              Marcar asistencia
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function Dato({ icono: Icono, children }: { icono: LucideIcon; children: string }) {
  return (
    <li className="flex items-center gap-3">
      <Icono className="size-5 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  )
}
