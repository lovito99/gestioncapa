import { useFieldArray, useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada } from '@/components/ui/Entrada'
import { mensajeDeError } from '@/lib/api'
import type { EvaluacionAutor, EvaluacionEntrada, LeccionEvaluacion } from '@/servicios/evaluaciones'
import type { ModalidadCurso } from '@/servicios/modalidadCurso'

type PreguntaFormulario = { enunciado: string; opciones: { texto: string }[]; correcta: number }
type Formulario = Omit<EvaluacionEntrada, 'preguntas'> & { preguntas: PreguntaFormulario[] }

const preguntaNueva = (): PreguntaFormulario => ({ enunciado: '', opciones: [{ texto: '' }, { texto: '' }], correcta: -1 })
const textoObligatorio = (texto: string) => !!texto.trim() || 'Completa este campo.'

export function EditorEvaluacion({ evaluacion, modalidad, lecciones, avanceMedido = false, guardar, publicar, ocupado }: {
  evaluacion?: EvaluacionAutor
  modalidad: ModalidadCurso
  lecciones: LeccionEvaluacion[]
  avanceMedido?: boolean
  guardar: (entrada: EvaluacionEntrada) => Promise<unknown>
  publicar?: () => void
  ocupado: boolean
}) {
  const formulario = useForm<Formulario>({ defaultValues: evaluacion ? {
    titulo: evaluacion.titulo,
    oficial: evaluacion.oficial,
    preguntas: evaluacion.preguntas.map(pregunta => ({
      ...pregunta, opciones: pregunta.opciones.map(texto => ({ texto })),
    })),
    leccionesIds: evaluacion.leccionesIds,
  } : { titulo: '', oficial: false, preguntas: [preguntaNueva()], leccionesIds: [] } })
  const { control, register, handleSubmit, setError, formState: { errors, isSubmitting, isDirty } } = formulario
  const preguntas = useFieldArray({ control, name: 'preguntas' })
  const oficial = useWatch({ control, name: 'oficial' })
  const seleccionadas = useWatch({ control, name: 'leccionesIds' })
  const requiereLecciones = modalidad === 'GRABADO' && oficial
  const deshabilitado = ocupado || isSubmitting

  const guardarBorrador = handleSubmit(async datos => {
    if (datos.preguntas.some(pregunta => pregunta.correcta < 0 || pregunta.correcta >= pregunta.opciones.length)) {
      setError('root', { message: 'Selecciona una respuesta correcta en cada pregunta.' })
      return
    }
    const entrada: EvaluacionEntrada = {
      titulo: datos.titulo.trim(), oficial: datos.oficial,
      preguntas: datos.preguntas.map(({ enunciado, opciones, correcta }) => ({
        enunciado: enunciado.trim(), opciones: opciones.map(opcion => opcion.texto.trim()), correcta,
      })),
      leccionesIds: requiereLecciones && !avanceMedido ? datos.leccionesIds : [],
    }
    if (entrada.preguntas.some(pregunta => new Set(pregunta.opciones).size !== pregunta.opciones.length)) {
      setError('root', { message: 'Ingresa opciones distintas en cada pregunta.' })
      return
    }
    try {
      await guardar(entrada)
      formulario.reset(datos)
    } catch (error) {
      setError('root', { message: mensajeDeError(error, 'No pudimos guardar el borrador.') })
    }
  })

  return <form onSubmit={guardarBorrador} noValidate className="space-y-5">
    <fieldset disabled={deshabilitado} className="space-y-4">
      <Campo etiqueta="Título de la evaluación" obligatorio error={errors.titulo?.message}>
        <Entrada required maxLength={160} {...register('titulo', { validate: textoObligatorio })} />
      </Campo>
      <label className="flex items-start gap-3 text-sm font-medium text-ink">
        <input type="checkbox" className="mt-0.5 size-4 accent-brand" {...register('oficial')} />
        Cuestionario oficial del curso
      </label>
      {requiereLecciones && (
        <fieldset className="space-y-2 rounded-lg border border-line p-4">
          <legend className="px-1 font-semibold text-ink">Lecciones obligatorias</legend>
          <p className="text-sm text-muted">{avanceMedido
            ? 'El cuestionario se habilita al completar todos los videos obligatorios del curso.'
            : 'El colegiado deberá completar las lecciones seleccionadas antes de rendir el cuestionario.'}</p>
          {lecciones.length === 0 && <p className="text-sm text-muted">Agrega un video a los materiales del curso para usarlo como lección.</p>}
          {avanceMedido && <ul className="space-y-1 text-sm text-ink">{lecciones.map(leccion =>
            <li key={leccion.id}>{leccion.titulo} <span className="text-muted">· {leccion.modulo}</span></li>
          )}</ul>}
          {!avanceMedido && lecciones.map(leccion => <label key={leccion.id} className="flex items-start gap-3 text-sm text-ink">
            <input type="checkbox" className="mt-0.5 size-4 accent-brand" value={leccion.id}
              disabled={seleccionadas.length >= 200 && !seleccionadas.includes(leccion.id)}
              checked={seleccionadas.includes(leccion.id)} onChange={evento => formulario.setValue('leccionesIds', evento.target.checked
                ? [...seleccionadas, leccion.id] : seleccionadas.filter(id => id !== leccion.id), { shouldDirty: true })} />
            {leccion.titulo} <span className="text-muted">· {leccion.modulo}</span>
          </label>)}
        </fieldset>
      )}
      {preguntas.fields.map((pregunta, indice) => <PreguntaEditor formulario={formulario} indice={indice}
        key={`${pregunta.id}:${indice}`} quitar={() => preguntas.remove(indice)} />)}
      <Boton variante="secundario" disabled={preguntas.fields.length >= 100} onClick={() => preguntas.append(preguntaNueva())}>Agregar pregunta</Boton>
    </fieldset>
    {errors.root?.message && <Aviso tipo="error" titulo="Revisa la evaluación">{errors.root.message}</Aviso>}
    {publicar && isDirty && <p className="text-sm text-muted">Guarda los cambios antes de publicar.</p>}
    <div className="flex flex-wrap gap-2">
      <Boton type="submit" cargando={isSubmitting} disabled={ocupado}>Guardar borrador</Boton>
      {publicar && <Boton variante="secundario" disabled={deshabilitado || isDirty || preguntas.fields.length === 0 ||
        (requiereLecciones && (avanceMedido ? lecciones.length === 0 : seleccionadas.length === 0))} onClick={publicar}>Publicar evaluación</Boton>}
    </div>
  </form>
}

function PreguntaEditor({ formulario, indice, quitar }: {
  formulario: UseFormReturn<Formulario>
  indice: number
  quitar: () => void
}) {
  const { control, register, setValue, formState: { errors } } = formulario
  const campoOpciones = `preguntas.${indice}.opciones` as const
  const campoCorrecta = `preguntas.${indice}.correcta` as const
  const opciones = useFieldArray({ control, name: campoOpciones })
  const correcta = useWatch({ control, name: campoCorrecta })

  function quitarOpcion(posicion: number) {
    opciones.remove(posicion)
    if (correcta >= posicion) setValue(campoCorrecta, correcta === posicion ? -1 : correcta - 1, { shouldDirty: true })
  }

  return <fieldset className="min-w-0 space-y-3 rounded-lg border border-line bg-surface-2 p-4">
    <legend className="px-1 text-sm font-semibold text-ink">Pregunta {indice + 1}</legend>
    <Campo etiqueta="Enunciado" obligatorio error={errors.preguntas?.[indice]?.enunciado?.message}>
      <Entrada required maxLength={1000} {...register(`preguntas.${indice}.enunciado`, { validate: textoObligatorio })} />
    </Campo>
    <p className="text-xs text-muted">Selecciona la respuesta correcta de esta pregunta.</p>
    {opciones.fields.map((opcion, posicion) => (
      <div key={opcion.id} className="flex items-end gap-2">
        <label className="flex h-12 shrink-0 items-center px-2 sm:h-10">
          <input type="radio" name={campoCorrecta} className="size-4 accent-brand" checked={correcta === posicion}
            aria-label={`Opción ${posicion + 1} correcta de la pregunta ${indice + 1}`}
            onChange={() => setValue(campoCorrecta, posicion, { shouldDirty: true })} />
        </label>
        <Campo etiqueta={`Opción ${posicion + 1}`} obligatorio className="min-w-0 flex-1"
          error={errors.preguntas?.[indice]?.opciones?.[posicion]?.texto?.message}>
          <Entrada required maxLength={400} {...register(`${campoOpciones}.${posicion}.texto`, { validate: textoObligatorio })} />
        </Campo>
        <Boton variante="secundario" className="h-12 px-3 sm:h-10" disabled={opciones.fields.length <= 2}
          aria-label={`Quitar opción ${posicion + 1} de la pregunta ${indice + 1}`} onClick={() => quitarOpcion(posicion)}>Quitar</Boton>
      </div>
    ))}
    <div className="flex flex-wrap gap-2">
      <Boton variante="secundario" disabled={opciones.fields.length >= 10} onClick={() => opciones.append({ texto: '' })}>Agregar opción</Boton>
      <Boton variante="secundario" aria-label={`Quitar pregunta ${indice + 1}`} onClick={quitar}>Quitar pregunta</Boton>
    </div>
  </fieldset>
}
