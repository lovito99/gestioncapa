import { useQuery } from '@tanstack/react-query'
import { MapPin, Plus, SlidersHorizontal, Video } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Aviso } from '@/components/ui/Aviso'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { fechaConAnio, hora12 } from '@/lib/formato'
import { cursos, type DetalleCurso } from '@/servicios/cursos'
import { ETIQUETA_MODALIDAD } from '../formatoCurso'
import { EtiquetaModalidad, EtiquetaModalidadSesion } from '../piezasCurso'
import { lugarSesion, sesionesProgramadas } from './reglasSesion'

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC']

const MOTIVO: Record<DetalleCurso['modalidad'], string> = {
  HIBRIDA: 'Porque tiene sesiones virtuales y presenciales. Se calcula solo a partir de las sesiones.',
  PRESENCIAL: 'Porque todas sus sesiones son presenciales. Se calcula solo a partir de las sesiones.',
  VIRTUAL: 'Porque todas sus sesiones son virtuales. Se calcula solo a partir de las sesiones.',
  GRABADO: 'Un curso grabado no tiene sesiones con fecha: su contenido son lecciones en video.',
}

const ESTADO: Record<DetalleCurso['estado'], { texto: string; tono: 'exito' | 'neutro' | 'marca' }> = {
  PUBLICADO: { texto: 'Publicado', tono: 'exito' },
  BORRADOR: { texto: 'Borrador', tono: 'neutro' },
  CERRADO: { texto: 'Cerrado', tono: 'marca' },
}

/** S3 6.3 · Sesiones del curso con su modalidad. La modalidad del curso se calcula a partir de ellas. */
export function SesionesCursoPagina() {
  const { id = '' } = useParams()
  const consulta = useQuery({ queryKey: ['curso', id], queryFn: () => cursos.obtener(id) })
  const [hoy] = useState(() => new Date().toISOString().slice(0, 10))

  if (consulta.isPending) return <Cargando texto="Cargando las sesiones del curso…" />
  if (consulta.isError) {
    return <Contenedor><ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el curso.')} onReintentar={consulta.refetch} /></Contenedor>
  }
  const curso = consulta.data
  const sesiones = sesionesProgramadas(curso.sesiones)
  const proximaVirtual = sesiones.find(s => s.modalidad !== 'PRESENCIAL' && s.fecha >= hoy)?.id
  const puedeProgramar = curso.estado !== 'CERRADO' && curso.modalidad !== 'GRABADO'

  return (
    <Contenedor>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-serif text-2xl leading-8 font-bold text-ink">{curso.titulo}</h1>
          <div className="flex flex-wrap gap-2">
            <Etiqueta tono={ESTADO[curso.estado].tono}>{ESTADO[curso.estado].texto}</Etiqueta>
            <EtiquetaModalidad modalidad={curso.modalidad} />
          </div>
        </div>
        {puedeProgramar && (
          <Link to={`/admin/cursos/${curso.id}/sesiones/nueva`} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-base font-semibold text-white hover:bg-brand-ink sm:h-10 sm:text-sm">
            <Plus className="size-[18px]" aria-hidden />
            Programar sesión
          </Link>
        )}
      </div>

      {sesiones.length > 0 && (
        <Aviso titulo={`El curso se muestra como «${ETIQUETA_MODALIDAD[curso.modalidad]}»`}>{MOTIVO[curso.modalidad]}</Aviso>
      )}

      <section aria-label="Sesiones" className="rounded-xl border border-line bg-white px-4 py-3 sm:p-6">
        {sesiones.length === 0
          ? <p className="py-3 text-sm leading-5 text-muted">Aún no hay sesiones. Programa la primera para registrar la asistencia del curso.</p>
          : <ol className="divide-y divide-line">
            {sesiones.map((s, i) => {
              const [anio, mes, dia] = s.fecha.split('-').map(Number) as [number, number, number]
              const semana = fechaConAnio(s.fecha).split(' ')[0]
              const nombre = s.nombre.trim() || `Sesión ${i + 1}`
              const Icono = s.modalidad === 'VIRTUAL' ? Video : MapPin
              return (
                <li key={s.id} className="flex items-start gap-3 py-3">
                  <time dateTime={s.fecha} className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-brand-soft px-2 py-1.5 text-center text-brand">
                    <span className="font-serif text-xl leading-7 font-bold">{dia}</span>
                    <span className="text-xs leading-4 font-semibold">{MESES[mes - 1]}</span>
                    <span className="sr-only">{anio}</span>
                  </time>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm leading-5 font-semibold text-ink">{nombre} · {semana}</p>
                      <EtiquetaModalidadSesion modalidad={s.modalidad} />
                    </div>
                    <p className="text-sm leading-5 text-muted">{hora12(s.horaInicio)} – {hora12(s.horaFin)}</p>
                    <p className="flex items-start gap-1.5 text-xs leading-4 text-muted">
                      <Icono className="mt-px size-3.5 shrink-0" aria-hidden />
                      {lugarSesion(s)}{s.id === proximaVirtual && ' · se habilita 15 min antes'}
                    </p>
                  </div>
                  {curso.estado !== 'CERRADO' && (
                    <Link to={`/admin/cursos/${curso.id}/sesiones/${s.id}/editar`} aria-label={`Editar ${nombre}`}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-brand hover:bg-brand-soft">
                      <SlidersHorizontal className="size-[18px] rotate-90" aria-hidden />
                      <span className="hidden sm:inline">Editar</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>}
      </section>
    </Contenedor>
  )
}

function Contenedor({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-200 flex-col gap-6 px-4 pt-6 pb-16 wrap-anywhere sm:pt-10">
      <EnlaceVolver to="/cursos">Volver a cursos</EnlaceVolver>
      {children}
    </div>
  )
}
