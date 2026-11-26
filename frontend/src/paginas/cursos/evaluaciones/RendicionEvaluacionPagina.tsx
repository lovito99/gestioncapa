import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { esApiError, mensajeDeError } from '@/lib/api'
import { notaVigesimal } from '@/lib/formato'
import { evaluaciones, type EstadoEvaluacion, type EvaluacionPublica, type IntentoEvaluacion, type IntentoEvaluacionEntrada } from '@/servicios/evaluaciones'
import { EstadoRendicion } from './EstadoRendicion'

export function RendicionEvaluacionPagina() {
  const { id = '', evaluacionId = '' } = useParams()
  const { usuario } = useAuth()
  const cache = useQueryClient()
  const base = ['evaluaciones', id, usuario?.id]
  const clave = [...base, evaluacionId]
  const consulta = useQuery({ queryKey: clave, queryFn: () => evaluaciones.obtener(id, evaluacionId), retry: false })
  const perdioAcceso = esApiError(consulta.error) && [401, 403, 404].includes(consulta.error.status)
  async function enviar(entrada: IntentoEvaluacionEntrada) {
    try {
      const resultado = await evaluaciones.rendir(id, evaluacionId, entrada)
      cache.setQueryData<EvaluacionPublica>(clave, actual => actual && { ...actual, estado: resultado.estado })
      return resultado
    } finally {
      void cache.invalidateQueries({ queryKey: base })
    }
  }

  return <section className="mx-auto max-w-160 space-y-5 px-4 py-6 sm:py-10">
    <EnlaceVolver to={`/cursos/${id}/evaluaciones`}>Volver a evaluaciones</EnlaceVolver>
    {consulta.isPending ? <Cargando texto="Cargando evaluación…" /> : esApiError(consulta.error, 'LECCIONES_PENDIENTES') ? (
      <Aviso tipo="info" titulo="Evaluación bloqueada">{consulta.error.message}</Aviso>
    ) : perdioAcceso || (consulta.isError && !consulta.data) ? (
      <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar la evaluación.')} onReintentar={consulta.refetch} />
    ) : consulta.data && <>
      <h1 className="font-serif text-2xl font-bold text-ink">{consulta.data.titulo}</h1>
      <FormularioRendicion key={`${usuario?.id}:${id}:${evaluacionId}`} evaluacion={consulta.data} enviar={enviar} />
    </>}
  </section>
}

function estadoDeConflicto(error: unknown): EstadoEvaluacion | null {
  if (!esApiError(error) || error.status !== 409) return null
  const estado = error.details.estado as Partial<EstadoEvaluacion> | undefined
  return estado && (typeof estado.mejorNota === 'number' || estado.mejorNota === null) &&
    typeof estado.intentosUsados === 'number' && typeof estado.intentosRestantes === 'number' &&
    typeof estado.aprobado === 'boolean' && typeof estado.finalizado === 'boolean' ? estado as EstadoEvaluacion : null
}

export function FormularioRendicion({ evaluacion, enviar }: {
  evaluacion: EvaluacionPublica
  enviar: (entrada: IntentoEvaluacionEntrada) => Promise<IntentoEvaluacion>
}) {
  const [respuestas, elegir] = useState<Record<string, string>>({})
  const [resultado, mostrarResultado] = useState<IntentoEvaluacion>()
  const [conflicto, guardarConflicto] = useState<EstadoEvaluacion | null>(null)
  const [ocupado, cambiarOcupado] = useState(false)
  const [error, mostrarError] = useState('')
  const [pendiente, guardarPendiente] = useState<IntentoEvaluacionEntrada | null>(null)
  const [paso, irAPaso] = useState(0)
  const enCurso = useRef(false)
  const salida = useRef<HTMLDivElement>(null)
  const estadoLocal = conflicto ?? resultado?.estado
  const estado = estadoLocal && !evaluacion.estado.finalizado && estadoLocal.intentosUsados >= evaluacion.estado.intentosUsados
    ? estadoLocal : evaluacion.estado
  const puedeRendir = !evaluacion.bloqueada && !estado.finalizado && estado.intentosRestantes > 0 && evaluacion.preguntas.length > 0
  const completo = evaluacion.preguntas.every(pregunta => Boolean(respuestas[pregunta.id]))
  const reintentando = pendiente !== null
  const total = evaluacion.preguntas.length
  const indice = Math.min(paso, Math.max(total - 1, 0))
  const actual = evaluacion.preguntas[indice]
  const ultima = indice === total - 1

  useEffect(() => {
    if (resultado || conflicto) salida.current?.focus()
  }, [resultado, conflicto])

  async function entregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    // Con Enter antes de la última pregunta solo se avanza
    if (!pendiente && !ultima) {
      if (actual && respuestas[actual.id]) irAPaso(indice + 1)
      return
    }
    if (enCurso.current || (!pendiente && (!puedeRendir || !completo))) return
    const entrada = pendiente ?? {
      operacionId: crypto.randomUUID(),
      respuestas: evaluacion.preguntas.map(pregunta => ({ preguntaId: pregunta.id, opcionId: respuestas[pregunta.id] })),
    }
    enCurso.current = true
    guardarPendiente(entrada)
    cambiarOcupado(true)
    mostrarError('')
    try {
      mostrarResultado(await enviar(entrada))
      guardarPendiente(null)
    } catch (fallo) {
      if (esApiError(fallo) && fallo.status >= 400 && fallo.status < 500 && fallo.status !== 408) guardarPendiente(null)
      guardarConflicto(estadoDeConflicto(fallo))
      mostrarError(mensajeDeError(fallo, 'No pudimos confirmar el envío. Reintenta para recuperar el resultado.'))
    } finally {
      cambiarOcupado(false)
      enCurso.current = false
    }
  }

  function prepararOtroIntento() {
    elegir({})
    irAPaso(0)
    mostrarResultado(undefined)
    guardarConflicto(null)
    mostrarError('')
  }

  return <div className="space-y-4">
    <section className="space-y-2 rounded-xl border border-line bg-white p-5 sm:p-6" aria-label="Estado de la evaluación">
      <EstadoRendicion evaluacion={{ ...evaluacion, estado }} />
    </section>
    <div ref={salida} tabIndex={-1} className="space-y-3 rounded-lg">
      {resultado && <Resultado resultado={resultado} notaMinima={evaluacion.notaMinima} />}
      {error && <Aviso tipo="error" titulo="No se pudo confirmar el envío">{error}</Aviso>}
      {evaluacion.bloqueada && <Aviso tipo="info" titulo="Evaluación bloqueada">
        Completa todas las lecciones obligatorias para rendir la evaluación.
      </Aviso>}
    </div>
    {resultado && puedeRendir && <Boton onClick={prepararOtroIntento}>Rendir de nuevo</Boton>}
    {(puedeRendir || reintentando) && !resultado && actual && <form noValidate onSubmit={entregar}
      className="space-y-4 rounded-xl border border-line bg-white p-5 sm:px-8 sm:py-7">
      <div className="flex items-center gap-3">
        <p className="shrink-0 text-base font-medium text-brand" aria-live="polite">Pregunta {indice + 1} de {total}</p>
        <progress aria-label="Preguntas respondidas" value={Object.keys(respuestas).length} max={total}
          className="h-1.5 w-full overflow-hidden rounded-full bg-line [&::-moz-progress-bar]:bg-brand [&::-webkit-progress-bar]:bg-line [&::-webkit-progress-value]:bg-brand" />
      </div>
      <fieldset key={actual.id} disabled={ocupado || reintentando} className="min-w-0 space-y-3">
        <legend className="mb-3 font-serif text-lg leading-6 font-bold wrap-anywhere text-ink">{actual.enunciado}</legend>
        {actual.opciones.map((opcion, posicion) => <label key={opcion.id}
          className="flex min-h-12 items-center gap-3 rounded-lg border border-line px-4 py-3 text-sm text-ink hover:bg-surface-2 has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand">
          <input type="radio" className="size-4 shrink-0 accent-brand" name={actual.id} value={opcion.id} required
            checked={respuestas[actual.id] === opcion.id} onChange={() => elegir(actuales => ({ ...actuales, [actual.id]: opcion.id }))} />
          <span aria-hidden>{String.fromCharCode(65 + posicion)}.</span>
          <span className="min-w-0 wrap-anywhere">{opcion.texto}</span>
        </label>)}
      </fieldset>
      <div className="flex flex-wrap justify-between gap-3">
        <Boton variante="secundario" className="text-brand ring-brand" disabled={indice === 0 || ocupado || reintentando}
          onClick={() => irAPaso(indice - 1)}>← Anterior</Boton>
        {ultima || reintentando
          ? <Boton key="enviar" type="submit" cargando={ocupado} disabled={!reintentando && !completo}>{reintentando ? 'Reintentar envío' : 'Enviar respuestas'}</Boton>
          : <Boton key="siguiente" disabled={!respuestas[actual.id]} onClick={() => irAPaso(indice + 1)}>Siguiente →</Boton>}
      </div>
    </form>}
  </div>
}

function Resultado({ resultado, notaMinima }: { resultado: IntentoEvaluacion; notaMinima: number }) {
  const { aprobado, nota } = resultado
  const color = aprobado ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
  return <div role="status" className="flex flex-col items-center gap-4 rounded-xl border border-line bg-white px-5 py-7 text-center">
    <div aria-hidden className={`flex size-30 flex-col items-center justify-center rounded-full ${color}`}>
      <span className="font-serif text-[32px] leading-10 font-bold">{nota}</span>
      <span className="text-xs font-medium">de 20</span>
    </div>
    <p className={`font-serif text-2xl font-bold ${aprobado ? 'text-success' : 'text-danger'}`}>
      {aprobado ? '¡Aprobaste este intento!' : 'Aún no alcanzas la nota mínima'}
    </p>
    <p className="text-base text-muted">Nota del intento: {notaVigesimal(nota)}.</p>
    {!aprobado && <p className="text-sm text-muted">La nota mínima es {notaVigesimal(notaMinima)}.</p>}
  </div>
}
