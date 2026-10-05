import { CircleX, Eye, Pencil, Plus, TriangleAlert } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Boton } from '@/components/ui/Boton'
import { Dialogo } from '@/components/ui/Dialogo'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EtiquetaEstadoClase } from '@/components/ui/Etiqueta'
import { cn } from '@/lib/cn'
import { fechaCorta, rangoHorario } from '@/lib/formato'
import { useCancelarClase, useClases } from '@/servicios/clases'
import type { Clase } from '@/types/api'

const th = 'px-4 py-3 text-left text-xs leading-5 font-medium text-muted uppercase'
const td = 'px-4 py-3.5 text-sm leading-5 text-muted'
const accion =
  'flex size-8 items-center justify-center rounded text-muted-2 hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-brand-light'

export function ClasesPagina() {
  const { data: clases, isPending, isError, refetch } = useClases()
  const cancelar = useCancelarClase()
  const [porCancelar, setPorCancelar] = useState<Clase | null>(null)
  const cerrarDialogo = useCallback(() => setPorCancelar(null), [])

  const confirmarCancelacion = () => {
    if (!porCancelar) return
    cancelar.mutate(porCancelar.id, {
      onSuccess: () => {
        toast.success(`La clase «${porCancelar.nombre}» quedó cancelada.`)
        setPorCancelar(null)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <div className="px-4 py-8 sm:px-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.6px] text-ink">Clases</h1>
          <p className="mt-0.5 text-sm leading-5 text-muted">Clases presenciales de la organización</p>
        </div>
        <Link
          to="/coordinador/clases/nueva"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light"
        >
          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
          Nueva clase
        </Link>
      </header>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        {isPending ? (
          <Cargando texto="Cargando clases…" />
        ) : isError ? (
          <ErrorCarga mensaje="No pudimos cargar las clases." onReintentar={refetch} />
        ) : clases.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">Aún no hay clases programadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-line bg-surface-3">
                <tr>
                  <th className={th}>Clase</th>
                  <th className={th}>Instructor</th>
                  <th className={th}>Fecha</th>
                  <th className={th}>Horario</th>
                  <th className={th}>Lugar</th>
                  <th className={th}>Inscritos</th>
                  <th className={th}>Estado</th>
                  <th className={cn(th, "pr-6 text-right")}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {clases.map((clase) => {
                  const cancelada = clase.estado === 'CANCELADA'
                  return (
                    <tr key={clase.id}>
                      <td className={cn(td, 'max-w-[220px]', cancelada ? 'text-muted' : 'font-medium text-ink')}>
                        {clase.nombre}
                      </td>
                      <td className={cn(td, 'max-w-[170px]')}>{clase.instructor.nombre}</td>
                      <td className={cn(td, 'w-24')}>{fechaCorta(clase.fecha)}</td>
                      <td className={cn(td, 'w-28')}>{rangoHorario(clase.horaInicio, clase.horaFin)}</td>
                      <td className={cn(td, 'max-w-[190px]')}>{clase.lugar}</td>
                      <td className={cn(td, !cancelada && 'font-medium text-ink')}>{clase.inscritos}</td>
                      <td className={td}>
                        <EtiquetaEstadoClase estado={clase.estado} />
                      </td>
                      <td className="py-3.5 pr-6 pl-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/coordinador/clases/${clase.id}`}
                            className={accion}
                            aria-label={`Ver detalle de ${clase.nombre}`}
                            title="Ver detalle"
                          >
                            <Eye className="size-[18px]" aria-hidden />
                          </Link>
                          {!cancelada && (
                            <>
                              <Link
                                to={`/coordinador/clases/${clase.id}/editar`}
                                className={accion}
                                aria-label={`Editar ${clase.nombre}`}
                                title="Editar"
                              >
                                <Pencil className="size-[15px]" aria-hidden />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setPorCancelar(clase)}
                                className={cn(accion, 'text-danger hover:bg-danger-soft')}
                                aria-label={`Cancelar ${clase.nombre}`}
                                title="Cancelar clase"
                              >
                                <CircleX className="size-4" aria-hidden />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialogo
        abierto={porCancelar !== null}
        onCerrar={cerrarDialogo}
        titulo="¿Cancelar esta clase?"
        icono={
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft">
            <TriangleAlert className="size-5 text-danger-strong" aria-hidden />
          </span>
        }
        acciones={
          <>
            <Boton variante="secundario" onClick={cerrarDialogo} data-autofocus className="font-medium">
              Volver
            </Boton>
            <Boton
              variante="peligro"
              onClick={confirmarCancelacion}
              cargando={cancelar.isPending}
              className="font-medium shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
            >
              Sí, cancelar clase
            </Boton>
          </>
        }
      >
        {porCancelar && (
          <>
            <div className="mt-1 flex flex-col gap-1.5 rounded-lg border border-line-soft bg-surface-2 p-4 text-[13px] leading-5 text-muted">
              <p className="text-sm font-semibold text-ink">{porCancelar.nombre}</p>
              <p>
                {fechaCorta(porCancelar.fecha)} · {rangoHorario(porCancelar.horaInicio, porCancelar.horaFin)} ·{' '}
                {porCancelar.lugar}
              </p>
              <p>
                Instructor: {porCancelar.instructor.nombre} · {porCancelar.inscritos} inscritos
              </p>
            </div>
            <p className="text-sm leading-[22.75px] text-muted">
              La clase quedará como «Cancelada». Ya no se podrán inscribir participantes ni mostrar el código QR de
              asistencia.
            </p>
          </>
        )}
      </Dialogo>
    </div>
  )
}
