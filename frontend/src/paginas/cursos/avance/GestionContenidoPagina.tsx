import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { avance, type ConfiguracionContenido, type GestionContenido, type MaterialContenido } from '@/servicios/avance'
import { fuenteVideo } from './reproduccion'

export function GestionContenidoPagina() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const admin = usuario?.rol === 'ADMIN'
  const cache = useQueryClient()
  const clave = ['gestionContenido', id, usuario?.id]
  const consulta = useQuery({ queryKey: clave, queryFn: () => avance.gestion(id), retry: false })
  const activar = useMutation({
    mutationFn: () => avance.activar(id),
    onSuccess: async () => {
      cache.setQueryData<GestionContenido>(clave, datos => datos && ({ ...datos, medido: true }))
      await Promise.all([cache.invalidateQueries({ queryKey: clave }), cache.invalidateQueries({ queryKey: ['avance', id] }),
        cache.invalidateQueries({ queryKey: ['gestionEvaluaciones', id] })])
    },
  })
  const guardar = useMutation({
    mutationFn: ({ unidad, datos }: { unidad: MaterialContenido; datos: ConfiguracionContenido }) => avance.configurar(id, unidad.id, datos),
    onSuccess: async unidad => {
      cache.setQueryData<GestionContenido>(clave, datos => datos && ({
        ...datos, unidades: datos.unidades.map(item => item.id === unidad.id ? unidad : item),
      }))
      await Promise.all([cache.invalidateQueries({ queryKey: clave }), cache.invalidateQueries({ queryKey: ['avance', id] }),
        cache.invalidateQueries({ queryKey: ['gestionEvaluaciones', id] })])
    },
  })

  return <section className="mx-auto max-w-240 space-y-5 px-4 py-6 sm:py-10">
    <EnlaceVolver to={admin ? `/admin/cursos/${id}/editar` : `/cursos/${id}`}>Volver al curso</EnlaceVolver>
    <h1 className="font-serif text-2xl font-bold text-ink">Configurar contenido y avance</h1>
    {consulta.isPending ? <Cargando texto="Cargando materiales…" /> : consulta.isError ?
      <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar los materiales.')} onReintentar={consulta.refetch} /> :
      <ContenidoGestion datos={consulta.data} admin={admin} activando={activar.isPending}
        errorActivacion={activar.isError ? mensajeDeError(activar.error, 'No pudimos activar el avance.') : ''}
        activar={() => activar.mutate()} guardar={(unidad, datos) => guardar.mutateAsync({ unidad, datos })} />}
  </section>
}

function ContenidoGestion({ datos, admin, activar, activando, errorActivacion, guardar }: {
  datos: GestionContenido
  admin: boolean
  activar: () => void
  activando: boolean
  errorActivacion: string
  guardar: (unidad: MaterialContenido, cambios: ConfiguracionContenido) => Promise<unknown>
}) {
  const fijo = datos.medido || datos.estado === 'CERRADO'
  const grabado = datos.modalidad === 'GRABADO'
  const obligatorios = datos.unidades.filter(unidad => unidad.tipo === 'VIDEO' && unidad.obligatorio && unidad.duracionMs)
  const preparado = obligatorios.length > 0 && datos.leccionesSalida.every(id => obligatorios.some(unidad => unidad.id === id))
  return <>
    <p className="font-semibold text-ink">{datos.titulo}</p>
    {datos.medido && <Aviso tipo="exito" titulo="Avance por reproducción activo" />}
    {grabado && !fijo && <Aviso titulo="Preparar el avance por reproducción">
      Marca los videos obligatorios y confirma sus duraciones. Incluye los videos del cuestionario de salida si ya está publicado.
      {admin && ' Al activar el avance quedará fijo el conjunto de lecciones obligatorias.'}
    </Aviso>}
    {admin && grabado && !fijo && <>
      <Boton disabled={!preparado} cargando={activando} onClick={activar}>Activar avance por reproducción</Boton>
      {errorActivacion && <p role="alert" className="text-sm text-danger">{errorActivacion}</p>}
    </>}
    {!datos.unidades.length && <p className="text-sm text-muted">Agrega materiales en los módulos del curso.</p>}
    <ul className="space-y-3">{datos.unidades.map(unidad => <li key={unidad.id}
      className="space-y-3 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-ink">{unidad.titulo}</h2>
          <p className="text-sm text-muted">{unidad.modulo} · {unidad.tipo}</p>
        </div>
        {unidad.obligatorio && <Etiqueta tono="marca">Obligatorio</Etiqueta>}
      </div>
      {datos.leccionesSalida.includes(unidad.id) && <p className="text-sm text-muted">Requerido por la salida publicada.</p>}
      {unidad.duracionMs !== null && <p className="text-sm text-muted">
        Duración registrada: {(unidad.duracionMs / 1000).toLocaleString('es-PE')} s
      </p>}
      {!admin && !fijo && <ConfigurarUnidad key={unidad.version} unidad={unidad} guardar={cambios => guardar(unidad, cambios)} />}
    </li>)}</ul>
  </>
}

function ConfigurarUnidad({ unidad, guardar }: {
  unidad: MaterialContenido
  guardar: (datos: ConfiguracionContenido) => Promise<unknown>
}) {
  const control = useId()
  const [obligatorio, cambiarObligatorio] = useState(unidad.obligatorio)
  const [previa, abrirPrevia] = useState(false)
  const [duracion, cambiarDuracion] = useState(unidad.duracionMs)
  const [ocupado, indicarOcupado] = useState(false)
  const [error, indicarError] = useState('')
  const [errorVideo, indicarErrorVideo] = useState('')
  const [guardado, indicarGuardado] = useState(false)
  const esVideo = unidad.tipo === 'VIDEO'
  const fuente = fuenteVideo(unidad.url)
  const puedeGuardar = !(esVideo && obligatorio && duracion === null) &&
    (obligatorio !== unidad.obligatorio || duracion !== unidad.duracionMs)

  async function confirmar() {
    indicarOcupado(true)
    indicarError('')
    indicarGuardado(false)
    try {
      await guardar({ obligatorio, duracionMs: duracion })
      indicarGuardado(true)
    } catch (fallo) {
      indicarError(mensajeDeError(fallo, 'No pudimos guardar la configuración.'))
    } finally {
      indicarOcupado(false)
    }
  }

  return <form className="space-y-3" onSubmit={evento => { evento.preventDefault(); void confirmar() }}>
    <fieldset disabled={ocupado} className="space-y-3">
      {esVideo && (fuente ? <>
        <Boton variante="secundario" aria-expanded={previa} onClick={() => abrirPrevia(!previa)}>
          {previa ? 'Cerrar vista previa' : 'Comprobar duración'}
        </Boton>
        {previa && <video className="aspect-video w-full max-w-120 rounded-lg bg-ink" src={fuente}
          aria-label={`Vista previa: ${unidad.titulo}`} preload="metadata" playsInline controls
          onLoadedMetadata={evento => {
            const ms = Math.round(evento.currentTarget.duration * 1000)
            if (ms > 0 && ms <= 86400000) {
              cambiarDuracion(ms)
              indicarErrorVideo('')
            } else indicarErrorVideo('La duración del archivo no se puede medir.')
          }} onError={() => indicarErrorVideo('No se pudo comprobar la duración de este video.')} />}
        {previa && !errorVideo && duracion !== null && <p role="status" className="text-sm text-muted">
          Duración para guardar: {(duracion / 1000).toLocaleString('es-PE')} s
        </p>}
      </> : <p className="text-sm text-muted">Para medir el video, agrega un archivo HTTPS reproducible en el navegador.</p>)}
      <label htmlFor={control} className="flex items-center gap-3 text-sm font-medium text-ink">
        <input id={control} type="checkbox" checked={obligatorio} disabled={esVideo && !fuente}
          className="size-4 accent-brand" onChange={evento => { cambiarObligatorio(evento.target.checked); indicarGuardado(false) }} />
        Unidad obligatoria: {unidad.titulo}
      </label>
      {errorVideo && <p role="alert" className="text-sm text-danger">{errorVideo}</p>}
      <Boton type="submit" disabled={!puedeGuardar} cargando={ocupado}>Guardar configuración</Boton>
    </fieldset>
    {guardado && <p role="status" className="text-sm text-success">Configuración guardada.</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </form>
}
