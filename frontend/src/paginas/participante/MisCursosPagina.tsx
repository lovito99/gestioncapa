import { useQuery } from '@tanstack/react-query'
import { Calendar, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { rangoFechasCorto } from '@/lib/formato'
import { CERTIFICADOS_CURSO } from '@/servicios/cursos'
import { historiales, type Historial } from '@/servicios/historial'
import { AvisoProgreso, Avance } from '../historial/HistorialPagina'
import { queTeFalta } from '../historial/progreso'

type CursoInscrito = Historial['cursos'][number]

const enlaceSecundario =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-base font-semibold text-ink-2 ring-1 ring-line-2 ring-inset hover:bg-surface-2 sm:h-10 sm:text-sm'

/**
 * «Mis cursos» del agremiado (HU-16 y HU-20 A.4): sus inscripciones, cuánto le falta para la
 * constancia y si el pago está pendiente. El Figma solo la nombra en el menú; usa el mismo
 * diseño de tarjetas que el historial (4.1). Los datos vienen del historial del colegiado.
 */
export function MisCursosPagina() {
  const { usuario } = useAuth()
  const id = usuario?.id ?? ''
  const consulta = useQuery({ queryKey: ['historial', usuario?.id, id], queryFn: () => historiales.obtener(id), enabled: !!id, retry: false })

  return (
    <div className="mx-auto flex max-w-160 flex-col gap-4 px-4 pt-6 pb-8 wrap-anywhere sm:max-w-200 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold text-ink">Mis cursos</h1>
          <p className="text-sm text-muted">Los cursos en los que te inscribiste y lo que te falta para tu constancia.</p>
        </div>
        {/* El registro de asistencia vive en «Mis clases» (3.1), que no está en el menú del Figma */}
        <Link to="/participante/clases" className={enlaceSecundario}>
          <ScanLine className="size-4" aria-hidden />
          Registrar asistencia
        </Link>
      </div>

      {consulta.isPending ? (
        <Cargando texto="Cargando tus cursos…" />
      ) : consulta.isError ? (
        <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar tus cursos.')} onReintentar={consulta.refetch} />
      ) : consulta.data.cursos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white px-5 py-10 text-center">
          <p className="text-sm text-muted">Aún no te inscribes en ningún curso.</p>
          <Link to="/catalogo" className="text-sm font-semibold text-brand underline">
            Explorar el catálogo
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {consulta.data.cursos.map((curso) => (
            <li key={curso.id}>
              <TarjetaCurso curso={curso} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TarjetaCurso({ curso }: { curso: CursoInscrito }) {
  const terminado = curso.estado === 'TERMINADO'
  const fechas = curso.sesiones.map((s) => s.fecha).sort()
  const certificado = curso.certificados.find((c) => c.estado === 'VALIDO')

  return (
    <article className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-line bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-start gap-2">
        <h2 className="min-w-0 flex-1 basis-full text-base font-semibold text-ink sm:basis-0">
          <Link to={`/cursos/${curso.id}`} className="hover:text-brand hover:underline">
            {curso.titulo}
          </Link>
        </h2>
        {curso.estado === 'PENDIENTE_PAGO' ? <Etiqueta tono="advertencia">Pendiente de pago</Etiqueta> : <>
          {curso.pagoPendiente && <Etiqueta tono="advertencia">Pendiente de pago</Etiqueta>}
          <Etiqueta tono={terminado ? 'exito' : 'marca'}>{terminado ? 'Terminado' : 'En curso'}</Etiqueta>
        </>}
      </div>
      {fechas.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Calendar className="size-4 shrink-0 text-brand" aria-hidden />
          {rangoFechasCorto(fechas[0]!, fechas.at(-1)!)} · {curso.horasLectivas} horas lectivas
        </p>
      )}
      <Avance asistencia={curso.asistencia} />
      <AvisoProgreso aviso={queTeFalta(curso)} />
      {certificado && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand">
          <span className="font-semibold">Obtuviste tu {CERTIFICADOS_CURSO[certificado.tipo].toLowerCase()}.</span>
          <Link to={`/certificados/${encodeURIComponent(certificado.codigo)}`} className="font-semibold underline">
            Ver certificado
          </Link>
        </p>
      )}
    </article>
  )
}
