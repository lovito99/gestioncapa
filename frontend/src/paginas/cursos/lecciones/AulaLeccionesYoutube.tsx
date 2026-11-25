import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { leccionesYoutube, type LeccionYoutube, type ListaLecciones, type MarcaLeccion } from '@/servicios/lecciones'
import { formatearDuracion } from './presentacionLecciones'

export function AulaLeccionesYoutube({ cursoId }: { cursoId: string }) {
  const { usuario } = useAuth()
  const cache = useQueryClient()
  const clave = ['leccionesYoutube', cursoId, usuario?.id]
  const consulta = useQuery({ queryKey: clave, queryFn: () => leccionesYoutube.listar(cursoId), retry: false })
  const [abierta, cambiarAbierta] = useState('')
  const progreso = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: MarcaLeccion }) => leccionesYoutube.marcar(cursoId, id, estado),
    onSuccess: (marca, { id, estado }) => {
      cache.setQueryData<ListaLecciones>(clave, lista => lista && ({
        ...lista, lecciones: lista.lecciones.map(actual => actual.id === id ? { ...actual, ...marca } : actual),
      }))
      if (estado === 'EN_CURSO') cambiarAbierta(id)
    },
    onError: () => { void cache.invalidateQueries({ queryKey: clave }) },
  })
  const descarga = useMutation({ mutationFn: (id: string) => leccionesYoutube.descargar(cursoId, id) })

  if (consulta.isError) return <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar las lecciones de YouTube.')}
    onReintentar={consulta.refetch} />
  if (!consulta.data?.lecciones.length) return null
  const error = progreso.error ?? descarga.error

  return <section aria-label="Lecciones complementarias" className="space-y-3">
    <h2 className="font-serif text-xl font-bold text-ink">Lecciones complementarias</h2>
    {error && <Aviso tipo="error" titulo="Acción pendiente">
      {mensajeDeError(error, 'No pudimos completar la acción. Intenta nuevamente.')}
    </Aviso>}
    <ol className="space-y-3">
      {consulta.data.lecciones.map(leccion => <FilaLeccionAula key={leccion.id} leccion={leccion} abierta={abierta === leccion.id}
        ocupada={progreso.isPending || descarga.isPending}
        abrir={() => {
          descarga.reset()
          if (abierta === leccion.id) cambiarAbierta('')
          else progreso.mutate({ id: leccion.id, estado: 'EN_CURSO' })
        }}
        completar={() => { descarga.reset(); progreso.mutate({ id: leccion.id, estado: 'COMPLETADA' }) }}
        descargar={() => { progreso.reset(); descarga.mutate(leccion.id) }} />)}
    </ol>
  </section>
}

const estados = { PENDIENTE: 'Pendiente', EN_CURSO: 'En curso', COMPLETADA: 'Completada' } as const

export function FilaLeccionAula({ leccion, abierta, ocupada, abrir, completar, descargar }: {
  leccion: LeccionYoutube
  abierta: boolean
  ocupada: boolean
  abrir: () => void
  completar: () => void
  descargar: () => void
}) {
  const puedeAbrir = Boolean(leccion.youtubeId && /^[A-Za-z0-9_-]{11}$/.test(leccion.youtubeId))
  return <li className="space-y-3 rounded-xl border border-line bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="font-semibold text-ink">{leccion.orden}. {leccion.titulo}</h3>
        <p className="text-sm text-muted">{leccion.modulo} · {formatearDuracion(leccion.duracionSegundos)}</p>
      </div>
      <Etiqueta tono={leccion.estado === 'COMPLETADA' ? 'exito' : 'marca'}>{estados[leccion.estado]}</Etiqueta>
    </div>
    {!puedeAbrir && <p className="text-sm text-muted">Video no disponible. Puedes consultar el PDF si está adjunto.</p>}
    <div className="flex flex-wrap gap-2">
      {puedeAbrir && <Boton variante="secundario" aria-expanded={abierta} disabled={ocupada}
        aria-label={`${abierta ? 'Cerrar' : 'Abrir'} lección: ${leccion.titulo}`} onClick={abrir}>
        {abierta ? 'Cerrar lección' : 'Abrir lección'}
      </Boton>}
      {leccion.tienePdf && <Boton variante="secundario" aria-label={`Descargar PDF: ${leccion.titulo}`}
        disabled={ocupada} onClick={descargar}>Descargar PDF</Boton>}
      {leccion.estado === 'EN_CURSO' && <Boton variante="secundario" aria-label={`Marcar como completada: ${leccion.titulo}`}
        disabled={ocupada} onClick={completar}>Marcar como completada</Boton>}
    </div>
    {abierta && puedeAbrir && <>
      <iframe className="aspect-video min-h-50 min-w-50 w-full rounded-lg border-0 bg-ink"
        src={`https://www.youtube-nocookie.com/embed/${leccion.youtubeId}`} title={`YouTube: ${leccion.titulo}`}
        allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin" />
      <p className="text-sm text-muted">Video de YouTube. El estado de la lección lo guardas en GestionCapa.</p>
    </>}
  </li>
}
