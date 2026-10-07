import { CircleCheck, CircleX, RefreshCw, Users, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EtiquetaAsistencia } from '@/components/ui/Etiqueta'
import { cn } from '@/lib/cn'
import { fechaCorta, horaRegistro, rangoHorario } from '@/lib/formato'
import { useAsistencia, useClase } from '@/servicios/clases'

const th = 'px-6 py-3 text-left text-[11px] leading-3.5 font-semibold tracking-[0.55px] text-muted-3 uppercase'

function Metrica({
  titulo,
  valor,
  color,
  icono: Icono,
  fondoIcono,
}: {
  titulo: string
  valor: number
  color: string
  icono?: LucideIcon
  fondoIcono?: string
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-40 flex-col rounded-xl bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <p className="text-sm leading-5 text-muted-3">{titulo}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className={cn('text-2xl leading-8 font-semibold tracking-[-0.36px]', color)}>{valor}</p>
        {Icono && (
          <span className={cn('flex size-8 items-center justify-center rounded-full', fondoIcono)}>
            <Icono className={cn('size-4', color)} aria-hidden />
          </span>
        )}
      </div>
    </div>
  )
}

export function AsistenciaPagina() {
  const { id = '' } = useParams()
  const clase = useClase(id)
  const asistencia = useAsistencia(id)
  const a = asistencia.data

  let contenido: ReactNode
  if (asistencia.isPending) {
    contenido = <Cargando texto="Cargando asistencia…" />
  } else if (asistencia.isError) {
    contenido = <ErrorCarga mensaje="No pudimos cargar la asistencia." onReintentar={asistencia.refetch} />
  } else if (asistencia.data.registros.length === 0) {
    contenido = (
      <div className="flex flex-col items-center rounded-xl border border-line bg-white px-6 pt-18 pb-12 text-center shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
        <span className="flex size-16 items-center justify-center rounded-full bg-surface-3">
          <Users className="size-8 text-muted-2" aria-hidden />
        </span>
        <h2 className="mt-4 text-base leading-5 font-semibold text-ink">
          Esta clase aún no tiene participantes inscritos
        </h2>
        <p className="mt-2 max-w-100 text-sm leading-5 text-muted">
          Inscribe participantes desde el detalle de la clase para poder registrar su asistencia.
        </p>
        <Link
          to={`/coordinador/clases/${id}`}
          className="mt-6 inline-flex h-10 items-center rounded-lg border border-line bg-white px-5 text-sm font-medium text-ink hover:bg-surface-2"
        >
          Ir a inscribir participantes
        </Link>
      </div>
    )
  } else {
    contenido = (
      <>
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-180">
              <thead className="bg-surface-lavender">
                <tr>
                  <th className={th}>Participante</th>
                  <th className={th}>Correo</th>
                  <th className={th}>Estado</th>
                  <th className={th}>Hora de registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-lavender">
                {asistencia.data.registros.map((r) => (
                  <tr key={r.participante.id}>
                    <td className="px-6 py-3.5 text-sm leading-5 font-medium text-ink-2">{r.participante.nombre}</td>
                    <td className="px-6 py-3.5 text-sm leading-5 text-muted-3">{r.participante.email}</td>
                    <td className="px-6 py-3">
                      <EtiquetaAsistencia estado={r.estado} />
                    </td>
                    <td className="px-6 py-3.5 text-sm leading-5 text-ink-2">
                      {r.horaRegistro ? (
                        horaRegistro(r.horaRegistro)
                      ) : (
                        <span className="text-muted-3" aria-label="Sin registro">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-xs leading-4 text-muted-3">Horas en zona horaria de Lima (GMT-5)</p>
      </>
    )
  }

  return (
    <div className="px-4 sm:px-10">
      <div className="mx-auto max-w-300 pt-8 pb-16 sm:px-6">
        <EnlaceVolver to={`/coordinador/clases/${id}`}>Volver al detalle de la clase</EnlaceVolver>

        <header className="flex flex-wrap items-end justify-between gap-4 py-6">
          <div>
            <h1 className="text-2xl leading-8 font-semibold tracking-[-0.36px] text-ink-2">Asistencia</h1>
            {clase.data && (
              <p className="mt-1 text-sm leading-5 text-muted-3">
                {clase.data.nombre} · {fechaCorta(clase.data.fecha)} ·{' '}
                {rangoHorario(clase.data.horaInicio, clase.data.horaFin)} · {clase.data.lugar}
              </p>
            )}
          </div>
          <span className="flex items-center gap-1.5 rounded-lg bg-surface-lavender px-3 py-1.5 text-xs leading-4 text-muted-3">
            <RefreshCw
              className={cn('size-3 text-brand', asistencia.isFetching && 'animate-spin')}
              aria-hidden
            />
            Se actualiza automáticamente
          </span>
        </header>

        <div className="mb-4 flex flex-wrap gap-4">
          <Metrica titulo="Inscritos" valor={a?.inscritos ?? 0} color="text-ink-2" />
          <Metrica
            titulo="Presentes"
            valor={a?.presentes ?? 0}
            color="text-success"
            icono={CircleCheck}
            fondoIcono="bg-success-soft"
          />
          <Metrica
            titulo="Ausentes"
            valor={a?.ausentes ?? 0}
            color="text-danger"
            icono={CircleX}
            fondoIcono="bg-danger-soft"
          />
        </div>

        {contenido}
      </div>
    </div>
  )
}
