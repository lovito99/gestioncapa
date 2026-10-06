import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, ClipboardList, Clock, MapPin, User, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Entrada } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EtiquetaEstadoClase } from '@/components/ui/Etiqueta'
import { esApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fechaCorta, rangoHorario } from '@/lib/formato'
import { useClase, useInscribirParticipante, useInscritos } from '@/servicios/clases'
import { CODIGOS_ERROR } from '@/types/api'

const esquema = z.object({
  email: z.string().trim().min(1, 'Ingresa el correo del participante').pipe(z.email('Ingresa un correo válido')),
})
type Formulario = z.infer<typeof esquema>

const th = 'px-6 py-3 text-left text-xs leading-5 font-medium tracking-[0.6px] text-muted uppercase'

function Dato({ icono: Icono, children }: { icono: LucideIcon; children: string }) {
  return (
    <div className="flex min-w-0 flex-1 basis-48 items-center gap-2.5 text-sm text-ink">
      <Icono className="size-4 shrink-0 text-brand" aria-hidden />
      <span className="truncate">{children}</span>
    </div>
  )
}

export function DetalleClasePagina() {
  const { id = '' } = useParams()
  const clase = useClase(id)
  const inscritos = useInscritos(id)
  const inscribir = useInscribirParticipante(id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) })

  if (clase.isPending) return <Contenedor><Cargando /></Contenedor>
  if (clase.isError) {
    return (
      <Contenedor>
        <EnlaceVolver to="/coordinador/clases">Volver a clases</EnlaceVolver>
        <ErrorCarga
          mensaje={esApiError(clase.error, CODIGOS_ERROR.CLASE_NO_EXISTE) ? 'Esta clase no existe.' : clase.error.message}
          onReintentar={clase.refetch}
        />
      </Contenedor>
    )
  }

  const c = clase.data
  const cancelada = c.estado === 'CANCELADA'
  const error = inscribir.error
  const noExiste = esApiError(error, CODIGOS_ERROR.PARTICIPANTE_NO_EXISTE)
  const yaInscrito = esApiError(error, CODIGOS_ERROR.YA_INSCRITO)

  const enviar = handleSubmit(({ email }) =>
    inscribir.mutate(email, {
      onSuccess: (participante) => {
        toast.success(`${participante.nombre} quedó inscrito(a).`)
        reset({ email: '' })
      },
    }),
  )

  return (
    <Contenedor>
      <EnlaceVolver to="/coordinador/clases">Volver a clases</EnlaceVolver>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.6px] text-ink">{c.nombre}</h1>
          <EtiquetaEstadoClase estado={c.estado} grande />
        </div>
        <Link
          to={`/coordinador/clases/${c.id}/asistencia`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-surface-2"
        >
          <ClipboardList className="size-4" aria-hidden />
          Ver asistencia
        </Link>
      </header>

      <section aria-label="Datos de la clase" className="flex flex-wrap gap-4 rounded-xl border border-line bg-white px-4 pt-5 pb-4">
        <Dato icono={Calendar}>{fechaCorta(c.fecha)}</Dato>
        <Dato icono={Clock}>{`${rangoHorario(c.horaInicio, c.horaFin)} (hora de Lima)`}</Dato>
        <Dato icono={MapPin}>{c.lugar}</Dato>
        <Dato icono={User}>{`Instructor: ${c.instructor.nombre}`}</Dato>
      </section>

      {!cancelada && (
        <section className="flex flex-col gap-3.5 rounded-xl border border-line bg-white px-6 pt-7 pb-6">
          <h2 className="text-base leading-6 font-semibold tracking-[-0.08px] text-ink">Inscribir participante</h2>
          <form onSubmit={enviar} noValidate className="flex flex-wrap items-start gap-3">
            <div className="w-full sm:w-[400px]">
              <label htmlFor="email-participante" className="sr-only">
                Correo del participante
              </label>
              <Entrada
                id="email-participante"
                type="email"
                placeholder="nombre@organizacion.pe"
                autoComplete="off"
                estado={errors.email || noExiste ? 'error' : 'normal'}
                className="px-4 ring-placeholder placeholder:text-slate-400"
                aria-invalid={errors.email || noExiste ? true : undefined}
                aria-describedby="ayuda-inscribir"
                {...register('email', { onChange: () => inscribir.reset() })}
              />
            </div>
            <Boton type="submit" cargando={inscribir.isPending} className="font-medium">
              Inscribir
            </Boton>
          </form>
          {errors.email ? (
            <p id="ayuda-inscribir" className="text-xs text-danger">
              {errors.email.message}
            </p>
          ) : noExiste ? (
            <Alerta tipo="error">{error?.message}</Alerta>
          ) : yaInscrito ? (
            <Alerta tipo="advertencia">{error?.message}</Alerta>
          ) : error ? (
            <Alerta tipo="error">{error.message}</Alerta>
          ) : (
            <p id="ayuda-inscribir" className="text-xs leading-4 text-muted">
              El participante debe tener una cuenta registrada en GestionCapa.
            </p>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-line bg-white pt-6">
        <h2 className="px-6 text-base leading-6 font-semibold tracking-[-0.08px] text-ink">
          Inscritos ({inscritos.data?.length ?? c.inscritos})
        </h2>
        <div className="mt-5">
          {inscritos.isPending ? (
            <Cargando />
          ) : inscritos.isError ? (
            <ErrorCarga mensaje="No pudimos cargar los inscritos." onReintentar={inscritos.refetch} />
          ) : inscritos.data.length === 0 ? (
            <p className="border-t border-line-soft py-10 text-center text-sm text-muted">
              Aún no hay participantes inscritos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="border-b border-line-soft bg-surface-3">
                  <tr>
                    <th className={cn(th, "w-[54%]")}>Nombre</th>
                    <th className={th}>Correo electrónico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {inscritos.data.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-3.5 text-sm leading-5 text-ink">{p.nombre}</td>
                      <td className="px-6 py-3.5 text-sm leading-5 text-muted">{p.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </Contenedor>
  )
}

function Contenedor({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-2 px-4 pt-8 pb-12 sm:px-10">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 sm:px-8">{children}</div>
    </div>
  )
}
