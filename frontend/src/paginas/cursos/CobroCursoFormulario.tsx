import { CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Boton } from '@/components/ui/Boton'
import { Selector } from '@/components/ui/Entrada'
import { mensajeDeError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { cursos, type DetalleCurso, type ModalidadCobro, type PoliticaCobro } from '@/servicios/cursos'
import { precioGeneralParaEnviar, textoPlazo, validarCobro, type ErroresCobro } from './reglasCurso'

const OPCIONES: { valor: ModalidadCobro; titulo: string; descripcion: string }[] = [
  { valor: 'PREVIO', titulo: 'Pago antes de llevar el curso', descripcion: 'La inscripción queda pendiente hasta que pague. Si vence el plazo, se libera el cupo.' },
  { valor: 'CERTIFICADO', titulo: 'Pago solo por el certificado', descripcion: 'Lleva el curso gratis; la constancia se entrega cuando pague.' },
  { valor: 'GRATUITO', titulo: 'Gratuito', descripcion: 'Ni la inscripción ni la constancia requieren pago.' },
]

/** Plazos que ofrece el Figma S3 2.1, en minutos como los guarda la API. */
const PLAZOS = [1, 2, 3, 5, 7].map((dias) => dias * 1440)

/** Sección «Cobro» del Figma S3 2.1: modalidad, precios de colegiado y general, y plazo. */
export function CobroCursoFormulario({ valor, alCambiar, errores = {} }: {
  valor: PoliticaCobro; alCambiar: (valor: PoliticaCobro) => void; errores?: ErroresCobro
}) {
  const gratuito = valor.modalidadCobro === 'GRATUITO'
  const elegir = (modalidadCobro: ModalidadCobro) =>
    alCambiar({
      modalidadCobro,
      costo: modalidadCobro === 'GRATUITO' ? 0 : valor.costo,
      precioGeneral: modalidadCobro === 'GRATUITO' ? 0 : valor.precioGeneral,
      plazoPagoMinutos: modalidadCobro === 'PREVIO' ? valor.plazoPagoMinutos ?? 3 * 1440 : null,
    })
  const plazos = valor.plazoPagoMinutos && !PLAZOS.includes(valor.plazoPagoMinutos) ? [valor.plazoPagoMinutos, ...PLAZOS] : PLAZOS

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex min-w-0 flex-col gap-2" aria-describedby="cobro-ayuda">
        <legend className="flex items-center gap-1 text-sm leading-5 font-semibold text-ink">
          Modalidad de cobro <span aria-hidden className="font-bold text-required">*</span>
        </legend>
        <p id="cobro-ayuda" className="text-sm leading-5 text-muted">Define cuándo paga el participante.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {OPCIONES.map((opcion) => {
            const activa = valor.modalidadCobro === opcion.valor
            return (
              <label
                key={opcion.valor}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 rounded-lg p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand',
                  activa ? 'border-2 border-brand bg-brand-soft' : 'border border-line bg-white hover:border-brand/40',
                  errores.modalidadCobro && !activa && 'border-danger',
                )}
              >
                <input type="radio" name="modalidadCobro" value={opcion.valor} checked={activa} onChange={() => elegir(opcion.valor)} className="sr-only" />
                <span aria-hidden className={cn('flex size-5 items-center justify-center rounded-full border-2 bg-white', activa ? 'border-brand' : 'border-muted')}>
                  {activa && <span className="size-2.5 rounded-full bg-brand" />}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className={cn('text-base leading-6 font-medium', activa ? 'text-brand-ink' : 'text-ink')}>{opcion.titulo}</span>
                  <span className="text-sm leading-5 text-muted">{opcion.descripcion}</span>
                </span>
              </label>
            )
          })}
        </div>
        {errores.modalidadCobro && <MensajeError>{errores.modalidadCobro}</MensajeError>}
      </fieldset>

      {!gratuito && valor.modalidadCobro && (
        <>
          <hr className="border-line" />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoPrecio
              id="precio-colegiados"
              etiqueta={valor.modalidadCobro === 'CERTIFICADO' ? 'Constancia para colegiados (S/)' : 'Precio para colegiados (S/)'}
              ayuda="Colegiados habilitados del CPPP."
              valor={valor.costo}
              error={errores.costo}
              alCambiar={(costo) => alCambiar({ ...valor, costo })}
            />
            <CampoPrecio
              id="precio-general"
              etiqueta={valor.modalidadCobro === 'CERTIFICADO' ? 'Constancia general (S/)' : 'Precio general (S/)'}
              ayuda="Docentes externos o no colegiados."
              valor={valor.precioGeneral}
              error={errores.precioGeneral}
              alCambiar={(precioGeneral) => alCambiar({ ...valor, precioGeneral })}
            />
          </div>
        </>
      )}

      {valor.modalidadCobro === 'PREVIO' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plazo-pago" className="flex items-center gap-1 text-sm leading-5 font-semibold text-ink">
            Plazo para pagar después de inscribirse <span aria-hidden className="font-bold text-required">*</span>
          </label>
          <Selector
            id="plazo-pago"
            value={valor.plazoPagoMinutos ?? ''}
            estado={errores.plazoPagoMinutos ? 'error' : 'normal'}
            onChange={(e) => alCambiar({ ...valor, plazoPagoMinutos: Number(e.target.value) })}
            className="sm:h-12 sm:text-base"
          >
            {plazos.map((minutos) => (
              <option key={minutos} value={minutos}>{textoPlazo(minutos)}</option>
            ))}
          </Selector>
          {errores.plazoPagoMinutos ? (
            <MensajeError>{errores.plazoPagoMinutos}</MensajeError>
          ) : (
            <p className="text-sm leading-5 text-muted">Si no paga en ese plazo, la inscripción se cancela y el cupo se libera.</p>
          )}
        </div>
      )}
    </div>
  )
}

function MensajeError({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-1.5 text-sm leading-5 text-danger">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

function CampoPrecio({ id, etiqueta, ayuda, valor, error, alCambiar }: {
  id: string; etiqueta: string; ayuda: string; valor: number; error?: string; alCambiar: (valor: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1 text-sm leading-5 font-semibold text-ink">
        {etiqueta} <span aria-hidden className="font-bold text-required">*</span>
      </label>
      <div
        className={cn(
          'flex h-12 items-center gap-2 rounded-lg bg-white px-3 focus-within:ring-2 focus-within:ring-brand-light',
          error ? 'ring-2 ring-danger ring-inset' : 'ring-1 ring-muted-3 ring-inset',
        )}
      >
        <span className="text-sm leading-5 text-muted" aria-hidden>S/</span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={Number.isFinite(valor) && valor > 0 ? valor : ''}
          onChange={(e) => alCambiar(e.target.valueAsNumber)}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-ayuda`}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
        />
      </div>
      {error ? <div id={`${id}-ayuda`}><MensajeError>{error}</MensajeError></div> : <p id={`${id}-ayuda`} className="text-sm leading-5 text-muted">{ayuda}</p>}
    </div>
  )
}

/** Al editar un curso, el cobro se guarda aparte para respetar las inscripciones ya hechas. */
export function EditarCobroCurso({ curso }: { curso: DetalleCurso }) {
  const cache = useQueryClient()
  const [valor, cambiar] = useState<PoliticaCobro>({
    modalidadCobro: curso.modalidadCobro ?? '',
    costo: curso.costo,
    precioGeneral: curso.precioGeneral ?? Number.NaN,
    plazoPagoMinutos: curso.plazoPagoMinutos ?? null,
  })
  const [errores, cambiarErrores] = useState<ErroresCobro>({})
  const guardar = useMutation({
    mutationFn: () => cursos.actualizarCobro(curso.id, { ...valor, ...precioGeneralParaEnviar(valor), versionCobro: curso.versionCobro! }),
    onSuccess: async (actualizado) => {
      cache.setQueryData(['curso', curso.id], actualizado)
      await cache.invalidateQueries({ queryKey: ['cursos'] })
    },
  })
  return (
    <form
      aria-label="Cobro"
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault()
        const nuevos = validarCobro(valor)
        cambiarErrores(nuevos)
        if (Object.keys(nuevos).length === 0) guardar.mutate()
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-xl leading-7 font-bold text-ink">Cobro</h2>
        <p className="text-sm leading-5 text-muted">Los cambios se aplican a nuevas inscripciones. Las personas ya inscritas conservan sus condiciones.</p>
      </div>
      <fieldset disabled={guardar.isPending || curso.estado === 'CERRADO'} className="min-w-0">
        <CobroCursoFormulario valor={valor} alCambiar={cambiar} errores={errores} />
        <Boton type="submit" className="mt-4" disabled={!curso.versionCobro} cargando={guardar.isPending}>Guardar cobro</Boton>
      </fieldset>
      {guardar.isError && <p role="alert" className="text-sm text-danger">{mensajeDeError(guardar.error, 'No pudimos guardar el cobro.')}</p>}
      {guardar.isSuccess && <p role="status" className="text-sm text-success">Cobro guardado.</p>}
    </form>
  )
}
