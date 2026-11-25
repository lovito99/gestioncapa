import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { modoDemoActivo } from '@/lib/aulaGrabadaDemo'
import { avance, type AulaContenido as DatosContenido, type ProgresoContenido, type UnidadContenido } from '@/servicios/avance'
import { AulaContenido } from '../avance/AulaContenido'
import { AulaLeccionesYoutube } from '../lecciones/AulaLeccionesYoutube'
import { evaluaciones, type AulaEvaluacion, type LeccionEvaluacion } from '@/servicios/evaluaciones'
import { EstadoRendicion } from './EstadoRendicion'

export function AulaEvaluacionesPagina() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const cache = useQueryClient()
  const clave = ['evaluaciones', id, usuario?.id]
  const consulta = useQuery({ queryKey: clave, queryFn: () => evaluaciones.aula(id), retry: false })
  const titular = usuario?.id ?? ''
  const claveContenido = ['avance', id, titular]
  const contenido = useQuery({
    queryKey: claveContenido,
    queryFn: () => avance.aula(id, String(titular)),
    enabled: Boolean(titular) && !modoDemoActivo,
    retry: false,
  })
  const actualizarContenido = (unidad: UnidadContenido, resultado: ProgresoContenido) => {
    cache.setQueryData<DatosContenido>(claveContenido, anterior => anterior && ({
      ...anterior, unidades: anterior.unidades.map(item => item.id === unidad.id && item.version === unidad.version ?
        { ...item, ...resultado } : item),
    }))
    void cache.invalidateQueries({ queryKey: claveContenido })
    if (!unidad.completadaEn && resultado.completadaEn) void cache.invalidateQueries({ queryKey: clave })
  }
  const progreso = useMutation({
    mutationFn: (leccionId: string) => evaluaciones.completar(id, leccionId),
    onSuccess: () => Promise.all([
      cache.invalidateQueries({ queryKey: clave }),
      cache.invalidateQueries({ queryKey: claveContenido }),
    ]),
  })

  return <section className="mx-auto max-w-240 space-y-5 px-4 py-6 sm:py-10">
    <EnlaceVolver to={`/cursos/${id}`}>Volver al curso</EnlaceVolver>
    {progreso.isError && <Aviso tipo="error" titulo="Lección sin completar">
      {mensajeDeError(progreso.error, 'No pudimos guardar tu avance.')}
    </Aviso>}
    {!modoDemoActivo && (contenido.isPending ? <Cargando texto="Cargando contenido…" /> : contenido.isError ?
      <ErrorCarga mensaje={mensajeDeError(contenido.error, 'No pudimos cargar el contenido.')} onReintentar={contenido.refetch} /> :
      <AulaContenido key={`${id}:${titular}`} cursoId={id} datos={contenido.data}
        videosHistoricos={consulta.data?.lecciones.map(leccion => leccion.id) ?? []} alGuardar={actualizarContenido} />)}
    {!modoDemoActivo && !contenido.isError && contenido.data?.modalidad === 'GRABADO' &&
      <AulaLeccionesYoutube key={`youtube:${id}:${titular}`} cursoId={id} />}
    {consulta.isPending ? <Cargando texto="Cargando el curso…" /> : consulta.isError ? (
      <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar tus evaluaciones.')} onReintentar={consulta.refetch} />
    ) : <AulaEvaluaciones cursoId={id} aula={consulta.data} completar={leccionId => progreso.mutate(leccionId)}
      completando={progreso.isPending ? progreso.variables : undefined}
      conContenido={Boolean(contenido.data) && !contenido.isError} ocultarLecciones={contenido.data?.medido} />}
  </section>
}

export function AulaEvaluaciones({ cursoId, aula, completar, completando, conContenido, ocultarLecciones }: {
  cursoId: string
  aula: AulaEvaluacion
  completar: (leccionId: string) => void
  completando?: string
  conContenido?: boolean
  ocultarLecciones?: boolean
}) {
  const grabado = aula.modalidad === 'GRABADO'
  const avance = aula.lecciones.filter(leccion => leccion.completada).length

  return <>
    {!conContenido && <header className="space-y-2 rounded-xl border border-line bg-white p-5 sm:p-6">
      <p className="text-sm font-semibold text-brand">{grabado ? 'Aula grabada' : 'Evaluaciones del curso'}</p>
      <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">{aula.titulo}</h1>
      {aula.lecciones.length > 0 && <div className="max-w-140 space-y-1.5">
        <label htmlFor="avance-lecciones" className="flex flex-wrap justify-between gap-x-3 text-sm font-semibold text-ink">
          Avance de lecciones <span className="text-brand" aria-live="polite">{avance} de {aula.lecciones.length} completadas</span>
        </label>
        <progress id="avance-lecciones" className="block h-3 w-full overflow-hidden rounded-full bg-brand-soft [&::-moz-progress-bar]:bg-brand [&::-webkit-progress-bar]:bg-brand"
          value={avance} max={aula.lecciones.length} />
      </div>}
    </header>}
    {grabado && !ocultarLecciones && <section aria-labelledby="lecciones-aula" className="space-y-3">
      <h2 id="lecciones-aula" className="font-serif text-xl font-bold text-ink">Lecciones obligatorias</h2>
      {conContenido && aula.lecciones.length > 0 && <p className="text-sm text-muted" aria-live="polite">
        {avance} de {aula.lecciones.length} lecciones completadas
      </p>}
      {aula.lecciones.length === 0 ? <p className="text-sm text-muted">Aún no hay lecciones publicadas.</p> :
        <ol className="space-y-3">{aula.lecciones.map(leccion => <li key={leccion.id} className="space-y-3 rounded-xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-ink">{leccion.titulo}</h3>
              <p className="text-sm text-muted">{leccion.modulo}</p>
            </div>
            {leccion.completada && <Etiqueta tono="exito">Completada</Etiqueta>}
          </div>
          <VideoLeccion leccion={leccion} />
          {!leccion.completada && <Boton variante="secundario" cargando={completando === leccion.id} disabled={Boolean(completando)}
            aria-label={`Completar lección: ${leccion.titulo}`} onClick={() => completar(leccion.id)}>Completar lección</Boton>}
        </li>)}</ol>}
    </section>}
    <section aria-labelledby="evaluaciones-aula" className="space-y-3">
      <h2 id="evaluaciones-aula" className="font-serif text-xl font-bold text-ink">Evaluaciones</h2>
      {aula.evaluaciones.length === 0 ? <p className="text-sm text-muted">Aún no hay evaluaciones publicadas.</p> :
        <ul className="space-y-3">{aula.evaluaciones.map(evaluacion => <li key={evaluacion.id} className="space-y-3 rounded-xl border border-line bg-white p-4">
          <h3 className="font-semibold text-ink">{evaluacion.titulo}</h3>
          {evaluacion.oficial && <p className="text-sm font-semibold text-brand">
            {grabado ? 'Cuestionario de salida obligatorio' : 'Cuestionario oficial del curso'}
          </p>}
          <EstadoRendicion evaluacion={evaluacion} />
          {evaluacion.bloqueada ? <p className="text-sm text-muted">Completa todas las lecciones obligatorias para rendir la evaluación.</p> :
            <Link to={`/cursos/${cursoId}/evaluaciones/${evaluacion.id}`}
              className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-ink"
              aria-label={`${evaluacion.estado.finalizado || !evaluacion.estado.intentosRestantes ? 'Ver resultado' : 'Rendir evaluación'}: ${evaluacion.titulo}`}>
              {evaluacion.estado.finalizado || !evaluacion.estado.intentosRestantes ? 'Ver resultado' : 'Rendir evaluación'}
            </Link>}
        </li>)}</ul>}
    </section>
  </>
}

function VideoLeccion({ leccion }: { leccion: LeccionEvaluacion }) {
  let url: URL
  try {
    url = new URL(leccion.url)
  } catch {
    return <p className="text-sm text-muted">El video no está disponible.</p>
  }
  if (url.protocol !== 'https:' || url.username || url.password) return <p className="text-sm text-muted">El video no está disponible.</p>
  return <div className="space-y-2">
    {/\.(mp4|webm|ogv)$/i.test(url.pathname) && <video className="aspect-video w-full rounded-lg bg-ink" src={url.href}
      aria-label={leccion.titulo} controls playsInline preload="none" />}
    <a className="inline-flex w-fit text-sm font-semibold text-brand underline" href={url.href} rel="noopener noreferrer" target="_blank">
      Abrir video en otra pestaña
    </a>
  </div>
}
