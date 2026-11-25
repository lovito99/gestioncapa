import { DoorOpen, QrCode } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { cn } from '@/lib/cn'
import { fechaCorta, rangoHorario } from '@/lib/formato'
import { useMisClases } from '@/servicios/clases'
import { useSesionesDelegadas } from '@/servicios/asistenciaPuerta'
import { useAuth } from '@/auth/useAuth'

const th = 'px-6 py-4 text-left text-xs leading-4 font-medium tracking-[0.6px] text-muted uppercase'
const td = 'px-6 py-6.5 text-sm leading-5 text-muted whitespace-nowrap'

export function MisClasesPagina() {
  const { usuario } = useAuth()
  const delegadas = useSesionesDelegadas()
  const { data: clases, isPending, isError, refetch } = useMisClases()

  return (
    <div className="px-4 sm:px-10">
      <div className="mx-auto flex max-w-300 flex-col gap-6 py-8 sm:px-6">
        <header>
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.36px] text-ink">Mis clases</h1>
          <p className="mt-1 text-sm leading-5 text-muted">Clases presenciales asignadas a ti</p>
        </header>

        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {isPending ? (
            <Cargando texto="Cargando tus clases…" />
          ) : isError ? (
            <ErrorCarga mensaje="No pudimos cargar tus clases." onReintentar={refetch} />
          ) : clases.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">No tienes clases programadas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-190">
                <thead className="border-b border-line bg-surface-2">
                  <tr>
                    <th className={th}>Clase</th>
                    <th className={th}>Fecha</th>
                    <th className={th}>Horario</th>
                    <th className={th}>Lugar</th>
                    <th className={cn(th, "text-right")}>Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {clases.map((clase) => (
                    <tr key={clase.id}>
                      <td className={cn(td, 'font-medium text-ink')}>{clase.nombre}</td>
                      <td className={td}>{fechaCorta(clase.fecha)}</td>
                      <td className={td}>{rangoHorario(clase.horaInicio, clase.horaFin)}</td>
                      <td className={td}>{clase.lugar}</td>
                      <td className="px-6 py-4 text-right">
                        {clase.modalidad !== 'VIRTUAL' && clase.qrRotatorio !== false && <Link
                          to={`/instructor/clases/${clase.id}/qr`}
                          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light"
                        >
                          <QrCode className="size-3.75" aria-hidden />
                          Mostrar QR
                        </Link>}
                        {clase.modalidad !== 'VIRTUAL' && (!clase.encargadoId || clase.encargadoId === usuario?.id) &&
                          <Link to={`/instructor/clases/${clase.id}/puerta`} className="ml-3 font-semibold text-brand underline">Asistencia en puerta</Link>}
                        <Link to={`/instructor/clases/${clase.id}/asistencia`} className="ml-3 font-semibold text-brand underline">Ver asistencia</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {delegadas.isError && <ErrorCarga mensaje="No pudimos cargar tus encargos de asistencia." onReintentar={delegadas.refetch} />}
        {Boolean(delegadas.data?.length) && (
          <section aria-labelledby="encargos-asistencia" className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:p-6">
            <h2 id="encargos-asistencia" className="text-lg font-semibold text-ink">Encargos de asistencia</h2>
            <ul className="divide-y divide-line-soft">
              {delegadas.data?.map((clase) => (
                <li key={clase.id} className="flex flex-col gap-1 py-3">
                  <Link
                    to={`/instructor/clases/${clase.id}/puerta`}
                    aria-label={`Asistencia en puerta de ${clase.nombre}`}
                    className="flex min-h-10 items-center gap-2 font-semibold text-brand underline"
                  >
                    <DoorOpen className="size-4 shrink-0" aria-hidden />
                    {clase.curso ? `${clase.curso.titulo} · ${clase.nombre}` : clase.nombre}
                  </Link>
                  <p className="text-sm text-muted">{fechaCorta(clase.fecha)} · {clase.horaInicio} (Lima) · {clase.lugar}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
