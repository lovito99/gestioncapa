import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Circle, Download, LockKeyhole, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { idCursoAulaDemo } from '@/lib/aulaGrabadaDemo'
import { esApiError, mensajeDeError } from '@/lib/api'
import { aulaGrabada, type ActividadAula, type AulaGrabada, type EvaluacionAula } from '@/servicios/aulaGrabada'
import { guardarDescarga } from '@/servicios/historial'

export function AulaGrabadaPagina() {
  const { usuario } = useAuth()
  const clave = ['aulaGrabadaDemo', idCursoAulaDemo, usuario?.id]
  const cache = useQueryClient()
  const consulta = useQuery({ queryKey: clave, queryFn: () => aulaGrabada.obtener(idCursoAulaDemo), retry: false })
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return <div className="mx-auto max-w-300 space-y-5 px-4 py-6 sm:px-8 sm:py-10">
    <EnlaceVolver to={`/cursos/${idCursoAulaDemo}`}>Volver al curso</EnlaceVolver>
    {consulta.isPending ? <Cargando texto="Cargando aula grabada…" /> : consulta.isError ? (
      esApiError(consulta.error, 'AULA_REQUIERE_INSCRIPCION')
        ? <Aviso tipo="advertencia" titulo="Inscripción requerida">Confirma tu inscripción para entrar al aula.</Aviso>
        : <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el aula.')} onReintentar={consulta.refetch} />
    ) : <ContenidoAula key={usuario?.id} aula={consulta.data} guardar={completadas => {
      cache.setQueryData<AulaGrabada>(clave, { ...consulta.data, completadas })
    }} />}
  </div>
}

function ContenidoAula({ aula, guardar }: { aula: AulaGrabada; guardar: (completadas: string[]) => void }) {
  const [seleccionada, seleccionar] = useState<string>()
  const encabezadoActividad = useRef<HTMLHeadingElement>(null)
  const siguienteAccion = useRef<HTMLButtonElement>(null)
  const actividades = aula.modulos.flatMap(modulo => modulo.actividades)
  const avance = aula.completadas.length
  const porcentaje = Math.round(avance * 100 / actividades.length)
  const fin = avance === actividades.length
  const actividad = actividades.find(item => item.id === seleccionada) ?? actividades[avance] ?? actividades.at(-1)!
  const siguiente = actividades[actividades.indexOf(actividad) + 1]
  const completada = aula.completadas.includes(actividad.id)
  const [feedback, cambiarFeedback] = useState('')
  const completar = useMutation({
    mutationFn: (opcion?: number) => aulaGrabada.completar(idCursoAulaDemo, actividad.id, opcion),
    onSuccess: resultado => {
      guardar(resultado.completadas)
      cambiarFeedback(resultado.correcta ? 'Actividad completada.' : 'Revisa la lección e inténtalo otra vez.')
    },
    onError: error => cambiarFeedback(mensajeDeError(error, 'No pudimos guardar tu avance. Intenta de nuevo.')),
  })
  const descarga = useMutation({
    mutationFn: () => aulaGrabada.constancia(idCursoAulaDemo),
    onSuccess: archivo => guardarDescarga(archivo, 'constancia-aula-demo.pdf'),
  })
  const pasoConfirmado = completar.data?.correcta && completada
  useEffect(() => {
    if (pasoConfirmado) siguienteAccion.current?.focus()
  }, [pasoConfirmado])

  function abrir(id: string) {
    seleccionar(id)
    cambiarFeedback('')
    completar.reset()
    requestAnimationFrame(() => encabezadoActividad.current?.focus())
  }

  function guardarActividad(opcion?: number) {
    seleccionar(actividad.id)
    cambiarFeedback('')
    completar.mutate(opcion)
  }

  return <>
    <header className="space-y-4 rounded-xl border border-line bg-white px-5 py-5 sm:px-7">
      <div>
        <p className="text-sm font-semibold text-brand">Aula grabada · Demostración</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">{aula.titulo}</h1>
      </div>
      <div className="max-w-140 space-y-1">
        <div className="flex flex-wrap justify-between gap-x-3 text-sm font-semibold">
          <label htmlFor="avance-aula" className="text-ink">Avance del curso</label>
          <span className="text-brand">{avance} de {actividades.length} actividades · {porcentaje} %</span>
        </div>
        <progress id="avance-aula" className="block h-3 w-full overflow-hidden rounded-full bg-brand-soft [&::-moz-progress-bar]:bg-brand [&::-webkit-progress-bar]:bg-brand-soft [&::-webkit-progress-value]:bg-brand" value={avance} max={actividades.length} />
      </div>
    </header>

    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
      <section aria-labelledby="titulo-actividad" className="min-w-0 space-y-4 rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 id="titulo-actividad" ref={encabezadoActividad} tabIndex={-1} className="scroll-mt-32 font-serif text-xl font-bold text-ink">{actividad.titulo}</h2>
        {actividad.tipo === 'LECCION' ? <>
          <video key={actividad.id} aria-label={actividad.titulo} className="aspect-video w-full rounded-lg bg-brand-soft" controls playsInline preload="metadata" src={actividad.video} />
          <p className="max-w-160 text-base leading-6 text-muted">{actividad.resumen}</p>
          {!completada && <Boton cargando={completar.isPending} onClick={() => guardarActividad()}>Completar lección</Boton>}
        </> : <FormularioEvaluacion key={actividad.id} actividad={actividad} completada={completada} ocupado={completar.isPending} comprobar={guardarActividad} />}
        <p role="status" className="text-sm font-medium text-ink">{feedback || (completada ? 'Actividad completada.' : '')}</p>
        {completada && siguiente && <Boton ref={siguienteAccion} onClick={() => abrir(siguiente.id)}>Siguiente actividad <ArrowRight size={16} aria-hidden /></Boton>}
      </section>

      <aside className="space-y-4">
        <nav aria-label="Módulos del curso" className="space-y-4 rounded-xl border border-line bg-white p-4">
          <h2 className="text-lg font-semibold text-ink">Módulos del curso</h2>
          <ol className="space-y-4">
            {aula.modulos.map((modulo, indice) => <li key={modulo.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-ink">{indice + 1}. {modulo.titulo}</h3>
              <ul className="space-y-1">
                {modulo.actividades.map(item => <li key={item.id}>
                  <AccesoActividad actividad={item} actual={actividad.id === item.id} completada={aula.completadas.includes(item.id)} bloqueada={actividades.indexOf(item) > avance} ocupado={completar.isPending} abrir={() => abrir(item.id)} />
                </li>)}
              </ul>
            </li>)}
          </ol>
        </nav>

        <section aria-labelledby="titulo-constancia" className="space-y-3 rounded-xl border border-line bg-white p-4">
          <h2 id="titulo-constancia" className="text-lg font-semibold text-ink">Constancia de demostración</h2>
          <p className="text-sm text-muted">{fin ? 'Terminaste los módulos. Tu PDF de demostración está disponible.' : 'Completa todas las actividades para habilitar la descarga.'}</p>
          <Boton ref={siguiente ? undefined : siguienteAccion} variante="secundario" className="w-full" disabled={!fin} cargando={descarga.isPending} onClick={() => descarga.mutate()}>
            <Download size={16} aria-hidden /> Descargar constancia demo
          </Boton>
          {descarga.isError && <p role="alert" className="text-sm text-danger">No pudimos descargar la constancia. Intenta de nuevo.</p>}
        </section>
      </aside>
    </div>
  </>
}

function AccesoActividad({ actividad, actual, completada, bloqueada, ocupado, abrir }: {
  actividad: ActividadAula; actual: boolean; completada: boolean; bloqueada: boolean; ocupado: boolean; abrir: () => void
}) {
  const Icono = completada ? CheckCircle2 : bloqueada ? LockKeyhole : actividad.tipo === 'LECCION' ? Play : Circle

  return <button type="button" aria-current={actual ? 'step' : undefined} aria-label={actividad.titulo}
    aria-description={completada ? 'Completada' : bloqueada ? 'Completa la actividad anterior para continuar' : undefined}
    disabled={bloqueada || ocupado} onClick={abrir}
    className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${actual ? 'bg-brand-soft font-semibold text-brand' : 'text-ink hover:bg-surface-2'} disabled:cursor-default disabled:text-muted`}>
    <Icono size={16} className="shrink-0" aria-hidden /> {actividad.titulo}
  </button>
}

function FormularioEvaluacion({ actividad, completada, ocupado, comprobar }: {
  actividad: EvaluacionAula; completada: boolean; ocupado: boolean; comprobar: (opcion: number) => void
}) {
  const [opcion, elegir] = useState<number>()
  return <form className="space-y-4" onSubmit={evento => {
    evento.preventDefault()
    if (opcion !== undefined && !completada && !ocupado) comprobar(opcion)
  }}>
    <fieldset disabled={ocupado || completada} className="min-w-0 space-y-2">
      <legend className="pb-2 text-base font-semibold text-ink">{actividad.pregunta}</legend>
      {actividad.opciones.map((texto, indice) => <label key={texto} className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm text-ink has-checked:border-brand has-checked:bg-brand-soft">
        <input type="radio" name={actividad.id} value={indice} checked={opcion === indice} onChange={() => elegir(indice)} className="size-4 shrink-0 accent-brand" />
        {texto}
      </label>)}
    </fieldset>
    {!completada && <Boton type="submit" disabled={opcion === undefined} cargando={ocupado}>Comprobar respuesta</Boton>}
  </form>
}
