import { useId, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { esApiError, mensajeDeError } from '@/lib/api'
import { avance, type AulaContenido as DatosAula, type ProgresoContenido, type UnidadContenido } from '@/servicios/avance'
import { descargarMaterialPdf } from '@/servicios/cursos'
import { formatearDuracion } from '../lecciones/presentacionLecciones'
import { fechaFinalizacion, fuenteHttps, fuenteVideo } from './reproduccion'
import { VideoMedido, type ControlVideo } from './VideoMedido'

export function ResumenContenido({ titulo, modalidad, medido, porcentaje, obligatorias, completadas }: DatosAula) {
  const id = useId()
  const grabado = modalidad === 'GRABADO'
  return <header className="space-y-3 rounded-xl border border-line bg-white p-5 sm:p-6">
    <p className="text-sm font-semibold text-brand">{grabado ? 'Aula grabada' : 'Contenido del curso'}</p>
    <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">{titulo}</h1>
    <div className="max-w-140 space-y-1.5">
      <label htmlFor={id} className="flex flex-wrap justify-between gap-x-3 text-sm font-semibold text-ink">
        Avance del curso <span className="text-brand">{porcentaje.toLocaleString('es-PE', { maximumFractionDigits: 2 })} %</span>
      </label>
      <progress id={id} className="block h-3 w-full overflow-hidden rounded-full bg-brand-soft [&::-moz-progress-bar]:bg-brand [&::-webkit-progress-bar]:bg-brand"
        value={porcentaje} max={100} />
      <p className="text-sm text-muted">{grabado && !medido ? 'El curso todavía usa el seguimiento por lecciones.' :
        obligatorias ? `${completadas} de ${obligatorias} unidades obligatorias completadas` :
          'Aún no hay unidades obligatorias para calcular el avance.'}</p>
      {grabado && medido && <p className="text-sm text-muted">El porcentaje se calcula con el tiempo visto de los videos obligatorios.</p>}
    </div>
  </header>
}

export function AulaContenido({ cursoId, titular, idLeccion, datos, videosHistoricos, alGuardar }: {
  cursoId: string
  titular: string
  idLeccion?: string
  datos: DatosAula
  videosHistoricos: string[]
  alGuardar: (unidad: UnidadContenido, resultado: ProgresoContenido) => void
}) {
  const [abiertoLocal, cambiarAbierto] = useState('')
  const abierto = idLeccion ?? abiertoLocal
  const [cerrando, indicarCierre] = useState(false)
  const controlVideo = useRef<ControlVideo>(null)
  const navegar = useNavigate()
  const rutaAula = `/cursos/${cursoId}/aula`

  async function abrirUnidad(unidad: UnidadContenido) {
    indicarCierre(true)
    await controlVideo.current?.cerrar()
    cambiarAbierto(abierto === unidad.id ? '' : unidad.id)
    if (idLeccion) void navegar(rutaAula)
    indicarCierre(false)
  }
  const seccion = useId()
  const medible = datos.modalidad !== 'GRABADO' || datos.medido
  const unidades = datos.unidades.filter(unidad => medible || !videosHistoricos.includes(unidad.id))
  const seleccionada = unidades.find(unidad => unidad.id === abierto)
  const consultarLeccion = Boolean(idLeccion) || seleccionada?.bloqueo === null
  const detalle = useQuery({
    queryKey: ['leccion-curso', cursoId, titular, abierto],
    queryFn: () => avance.leccion(cursoId, abierto),
    enabled: consultarLeccion,
    gcTime: 0,
    retry: false,
  })
  const modulos = new Map<string, UnidadContenido[]>()
  for (const unidad of unidades) {
    const grupo = modulos.get(unidad.moduloId)
    if (grupo) grupo.push(unidad)
    else modulos.set(unidad.moduloId, [unidad])
  }
  const marcar = useMutation({
    mutationFn: (unidad: UnidadContenido) => avance.marcar(cursoId, unidad.id),
    onSuccess: (resultado, unidad) => alGuardar(unidad, resultado),
  })
  const descargar = useMutation({
    mutationFn: (unidad: UnidadContenido) => descargarMaterialPdf(cursoId, unidad.moduloId, unidad.id),
  })

  return <>
    <ResumenContenido {...datos} />
    {consultarLeccion && (detalle.isPending ? <Cargando texto="Cargando lección…" /> :
      detalle.isError && (esApiError(detalle.error, 'LECCION_BLOQUEADA') ?
        <Aviso tipo="advertencia" titulo="Lección bloqueada">
          <p>{detalle.error.message}</p>
          <Link className="font-semibold underline" to={rutaAula}>Volver al aula</Link>
        </Aviso> : <ErrorCarga mensaje={mensajeDeError(detalle.error, 'No pudimos abrir la lección.')}
          onReintentar={detalle.refetch} />))}
    <section aria-labelledby={seccion} className="space-y-3">
      <h2 id={seccion} className="font-serif text-xl font-bold text-ink">Módulos y materiales</h2>
      {!modulos.size && <p className="text-sm text-muted">
        {videosHistoricos.length ? 'Las lecciones de este curso están disponibles abajo.' : 'Aún no hay materiales en este curso.'}
      </p>}
      {Array.from(modulos, ([moduloId, grupo]) => <section key={moduloId} className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h3 className="font-semibold text-ink">{grupo[0]?.modulo}</h3>
        <ol className="divide-y divide-line">
          {grupo.map(unidad => {
            const fuente = fuenteHttps(unidad.url)
            const mostrandoVideo = abierto === unidad.id
            const enSecuencia = unidad.bloqueo !== undefined
            const detalleAutorizado = mostrandoVideo && consultarLeccion && detalle.isSuccess
            const bloqueo = detalleAutorizado ? null : unidad.bloqueo
            const video = medible && unidad.tipo === 'VIDEO' && unidad.duracionMs ?
              fuenteVideo(enSecuencia ? (detalleAutorizado ? detalle.data.url : null) : unidad.url) : null
            return <li key={unidad.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-ink">{unidad.titulo}</h4>
                  <p className="text-sm text-muted">{unidad.tipo === 'ENLACE' ? 'Enlace' : unidad.tipo === 'VIDEO' ? 'Video' : 'PDF'}
                    {unidad.obligatorio && ' · Obligatorio'}
                    {unidad.duracionMs && ` · ${formatearDuracion(Math.max(1, Math.round(unidad.duracionMs / 1000)))}`}</p>
                </div>
                {bloqueo ? <Etiqueta><Lock className="mr-1 size-3.5" aria-hidden />Bloqueada</Etiqueta> :
                  unidad.completadaEn && <Etiqueta tono="exito">Completada</Etiqueta>}
              </div>
              {unidad.completadaEn && <p className="text-sm text-muted">Completada el{' '}
                <time dateTime={unidad.completadaEn}>{fechaFinalizacion(unidad.completadaEn)}</time></p>}
              {bloqueo ? <p className="text-sm text-muted">
                {`Completa ${bloqueo.titulo} para habilitar esta lección.`}
              </p> : <div className="flex flex-wrap items-center gap-3">
                {enSecuencia || video ? <Boton variante="secundario" aria-expanded={mostrandoVideo}
                  aria-label={`${mostrandoVideo ? 'Cerrar lección' : 'Abrir lección'}: ${unidad.titulo}`}
                  disabled={cerrando} onClick={() => void abrirUnidad(unidad)}>
                  {mostrandoVideo ? 'Cerrar lección' : 'Abrir lección'}
                </Boton> : unidad.tipo === 'PDF' ? <Boton variante="secundario" disabled={descargar.isPending}
                  cargando={descargar.isPending && descargar.variables?.id === unidad.id}
                  onClick={() => descargar.mutate(unidad)}>Descargar PDF</Boton> :
                  fuente ? <a href={fuente.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand underline">
                    Abrir {unidad.tipo === 'VIDEO' ? 'video' : 'enlace'} <span className="sr-only">(abre otra pestaña)</span>
                  </a> : <p className="text-sm text-muted">Recurso no disponible.</p>}
                {unidad.tipo !== 'VIDEO' && !unidad.completadaEn && <Boton variante="secundario" disabled={marcar.isPending}
                  cargando={marcar.isPending && marcar.variables?.id === unidad.id} onClick={() => marcar.mutate(unidad)}
                  aria-label={`Marcar como visto: ${unidad.titulo}`}>Marcar como visto</Boton>}
              </div>}
              {descargar.isError && descargar.variables?.id === unidad.id &&
                <p role="alert" className="text-sm text-danger">{mensajeDeError(descargar.error, 'No pudimos descargar el PDF.')}</p>}
              {marcar.isError && marcar.variables?.id === unidad.id &&
                <p role="alert" className="text-sm text-danger">{mensajeDeError(marcar.error, 'No pudimos guardar la marca.')}</p>}
              {mostrandoVideo && enSecuencia && detalle.isSuccess && !video &&
                <p className="text-sm text-muted">El video no está disponible.</p>}
              {!bloqueo && mostrandoVideo && video && unidad.duracionMs && <VideoMedido key={unidad.version} ref={controlVideo} cursoId={cursoId}
                unidadId={unidad.id} titulo={unidad.titulo} fuente={video} duracionMs={unidad.duracionMs} inicial={unidad}
                alGuardar={resultado => alGuardar(unidad, resultado)} />}
            </li>
          })}
        </ol>
      </section>)}
    </section>
  </>
}
