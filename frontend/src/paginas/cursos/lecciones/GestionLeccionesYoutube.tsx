import { useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { esApiError, mensajeDeError } from '@/lib/api'
import { leerPdfBase64, type ModuloCurso } from '@/servicios/cursos'
import { leccionesYoutube, type LeccionYoutube, type ListaLecciones, type NuevaLeccion, type OrdenLecciones } from '@/servicios/lecciones'
import { formatearDuracion, moverLeccion } from './presentacionLecciones'

export function GestionLeccionesYoutube({ cursoId, modulos }: { cursoId: string; modulos: ModuloCurso[] }) {
  const { usuario } = useAuth()
  const cache = useQueryClient()
  const clave = ['leccionesYoutube', cursoId, usuario?.id]
  const consulta = useQuery({ queryKey: clave, queryFn: () => leccionesYoutube.listar(cursoId), retry: false })
  const [borradorOrden, editarOrden] = useState<OrdenLecciones | null>(null)
  const [anuncio, anunciar] = useState('')
  const recuperarFoco = useRef<HTMLButtonElement | null>(null)
  useLayoutEffect(() => {
    const boton = recuperarFoco.current
    if (boton?.isConnected) boton.focus({ preventScroll: true })
    recuperarFoco.current = null
  }, [borradorOrden])
  const [editandoPdf, editarPdf] = useState<string | null>(null)
  const tituloSeccion = useId()
  const actualizar = () => cache.invalidateQueries({ queryKey: ['leccionesYoutube', cursoId] })

  const alta = useMutation({
    mutationFn: (datos: NuevaLeccion) => leccionesYoutube.crear(cursoId, datos),
    onSuccess: async () => { anunciar('Lección guardada.'); await actualizar() },
  })
  const guardarOrden = useMutation({
    mutationFn: (orden: OrdenLecciones) => leccionesYoutube.ordenar(cursoId, orden),
    onSuccess: async lista => {
      cache.setQueryData<ListaLecciones>(clave, actual => actual && ({ ...actual, ...lista }))
      editarOrden(null)
      anunciar('Orden guardado.')
      await actualizar()
    },
  })
  const adjuntar = useMutation({
    mutationFn: async ({ id, archivo }: { id: string; archivo: File }) =>
      leccionesYoutube.adjuntar(cursoId, id, await leerPdfBase64(archivo)),
    onSuccess: async () => {
      anunciar('PDF guardado.')
      editarPdf(null)
      await actualizar()
    },
  })

  if (consulta.isPending) return <Cargando texto="Cargando lecciones…" />
  if (consulta.isError) return <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar las lecciones.')}
    onReintentar={consulta.refetch} />
  const datos = consulta.data
  const ids = borradorOrden?.ids ?? datos.lecciones.map(item => item.id)
  const porId = new Map(datos.lecciones.map(item => [item.id, item]))
  const lista = ids.flatMap(id => { const item = porId.get(id); return item ? [item] : [] })
  const ocupada = alta.isPending || guardarOrden.isPending || adjuntar.isPending

  function mover(item: LeccionYoutube, paso: -1 | 1, boton: HTMLButtonElement) {
    if (ocupada) return
    const siguiente = moverLeccion(ids, item.id, paso)
    if (siguiente === ids) return
    if (document.activeElement === boton) recuperarFoco.current = boton
    editarOrden({ revision: borradorOrden?.revision ?? datos.revision, ids: siguiente })
    anunciar(`${item.titulo}, posición ${siguiente.indexOf(item.id) + 1} de ${siguiente.length}.`)
  }

  async function recargarOrden() {
    editarOrden(null)
    guardarOrden.reset()
    await consulta.refetch()
  }

  return <section aria-labelledby={tituloSeccion} className="space-y-4">
    <h2 id={tituloSeccion} className="font-serif text-xl font-bold text-ink">Lecciones de YouTube</h2>
    {datos.puedeGestionar && <FormularioLeccion modulos={modulos} bloqueado={ocupada || borradorOrden !== null}
      error={alta.error} crear={alta.mutateAsync} />}
    {!datos.puedeGestionar && datos.lecciones.length === 0 &&
      <p className="text-sm text-muted">Las lecciones de YouTube se agregan en cursos grabados abiertos con acceso gratuito al video.</p>}
    {anuncio && <p role="status" className="text-sm text-muted">{anuncio}</p>}
    {lista.length > 0 && <ol className="space-y-2">
      {lista.map((item, indice) => <li key={item.id} className="space-y-3 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">{indice + 1}. {item.titulo}</h3>
            <p className="text-sm text-muted">{item.modulo} · {formatearDuracion(item.duracionSegundos)}</p>
          </div>
          {datos.puedeGestionar && <div className="flex flex-wrap gap-2">
            <Boton variante="secundario" aria-label={`Subir: ${item.titulo}`} aria-disabled={indice === 0 || ocupada}
              onClick={evento => mover(item, -1, evento.currentTarget)}>Subir</Boton>
            <Boton variante="secundario" aria-label={`Bajar: ${item.titulo}`} aria-disabled={indice === lista.length - 1 || ocupada}
              onClick={evento => mover(item, 1, evento.currentTarget)}>Bajar</Boton>
            <Boton variante="secundario" disabled={ocupada} aria-expanded={editandoPdf === item.id}
              aria-label={`${item.tienePdf ? 'Reemplazar' : 'Adjuntar'} PDF: ${item.titulo}`}
              onClick={() => { adjuntar.reset(); editarPdf(editandoPdf === item.id ? null : item.id) }}>
              {item.tienePdf ? 'Reemplazar PDF' : 'Adjuntar PDF'}
            </Boton>
          </div>}
        </div>
        {editandoPdf === item.id && <form className="space-y-2" onSubmit={evento => {
          evento.preventDefault()
          const archivo = new FormData(evento.currentTarget).get('archivo')
          if (archivo instanceof File) adjuntar.mutate({ id: item.id, archivo })
        }}>
          <Campo etiqueta="Archivo PDF de la lección" obligatorio ayuda="Hasta 5 MB">
            <Entrada className="h-auto min-h-11 py-2" name="archivo" type="file" accept=".pdf,application/pdf" required />
          </Campo>
          {adjuntar.error && <p role="alert" className="text-sm text-danger">
            {mensajeDeError(adjuntar.error, adjuntar.error instanceof Error ? adjuntar.error.message : 'No se pudo guardar el PDF.')}
          </p>}
          <Boton type="submit" cargando={adjuntar.isPending} disabled={ocupada}>Guardar PDF</Boton>
        </form>}
      </li>)}
    </ol>}
    {borradorOrden && <div className="space-y-2">
      {guardarOrden.error && <Aviso tipo="error" titulo="Orden sin guardar">
        {mensajeDeError(guardarOrden.error, 'No se pudo guardar el orden.')}
      </Aviso>}
      <div className="flex flex-wrap gap-2">
        <Boton cargando={guardarOrden.isPending} disabled={ocupada}
          onClick={() => guardarOrden.mutate(borradorOrden)}>Guardar orden</Boton>
        <Boton variante="secundario" disabled={ocupada} onClick={() => void recargarOrden()}>Recargar orden</Boton>
      </div>
    </div>}
  </section>
}

function FormularioLeccion({ modulos, bloqueado, error, crear }: {
  modulos: ModuloCurso[]
  bloqueado: boolean
  error: unknown
  crear: (datos: NuevaLeccion) => Promise<unknown>
}) {
  const solicitud = useRef<{ clave: string; operacionId: string } | null>(null)
  const campos = esApiError(error) ? error.fields : {}
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const entrada = new FormData(formulario)
    const titulo = String(entrada.get('titulo') ?? '').trim()
    const moduloId = String(entrada.get('moduloId') ?? '')
    const url = String(entrada.get('url') ?? '').trim()
    const clave = JSON.stringify([titulo, moduloId, url])
    if (solicitud.current?.clave !== clave) solicitud.current = { clave, operacionId: crypto.randomUUID() }
    try {
      await crear({ titulo, moduloId, url, operacionId: solicitud.current.operacionId })
      solicitud.current = null
      formulario.reset()
    } catch {
      // El error de la mutación mantiene el formulario disponible para corregir o reintentar.
    }
  }

  return <form className="space-y-3 rounded-xl border border-line bg-white p-4" onSubmit={evento => void guardar(evento)}>
    <fieldset disabled={bloqueado} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <legend className="mb-2 font-semibold text-ink">Agregar lección de YouTube</legend>
      <Campo etiqueta="Título de la lección" obligatorio error={campos.titulo}>
        <Entrada name="titulo" required maxLength={160} />
      </Campo>
      <Campo etiqueta="Módulo" obligatorio error={campos.moduloId}>
        <Selector name="moduloId" required>{modulos.map(modulo => <option key={modulo.id} value={modulo.id}>{modulo.titulo}</option>)}</Selector>
      </Campo>
      <Campo etiqueta="Enlace de YouTube" obligatorio className="sm:col-span-2" error={campos.url}
        ayuda="Usa un video no listado que permita inserción. La duración se obtiene al guardar.">
        <Entrada name="url" type="url" required maxLength={2048} />
      </Campo>
      <Boton className="justify-self-start" type="submit" disabled={!modulos.length}>Guardar lección</Boton>
    </fieldset>
    {!!error && <Aviso tipo="error" titulo="Lección sin guardar">{mensajeDeError(error, 'No se pudo guardar la lección.')}</Aviso>}
  </form>
}
