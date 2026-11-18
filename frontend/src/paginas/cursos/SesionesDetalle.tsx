import { MapPin, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fechaConAnio, hora12 } from '@/lib/formato'
import type { SesionCurso } from '@/servicios/cursos'
import { EtiquetaModalidadSesion } from './piezasCurso'

/** Lo mínimo para mostrar una sesión; la página pública no recibe la sala ni el estado. */
export type SesionPublica = Pick<SesionCurso, 'id' | 'nombre' | 'fecha' | 'horaInicio' | 'horaFin' | 'lugar' | 'modalidad'> & Partial<Pick<SesionCurso, 'reunion'>>

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC']

/** S3 4.1 · Sesiones con su fecha, horario, modalidad y lugar. */
export function SesionesDetalle({ sesiones }: { sesiones: SesionPublica[] }) {
  const virtuales = sesiones.filter(s => s.modalidad === 'VIRTUAL').length
  const presenciales = sesiones.filter(s => s.modalidad === 'PRESENCIAL').length
  const ambas = sesiones.length - virtuales - presenciales
  const resumen = [virtuales && `${virtuales} ${virtuales === 1 ? 'virtual' : 'virtuales'}`, presenciales && `${presenciales} ${presenciales === 1 ? 'presencial' : 'presenciales'}`, ambas && `${ambas} ${ambas === 1 ? 'híbrida' : 'híbridas'}`].filter(Boolean)
  return <section aria-labelledby="sesiones-detalle" className="flex flex-col rounded-xl border border-line bg-white p-5">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pb-1">
      <h2 id="sesiones-detalle" className="flex-1 font-serif text-xl leading-7 font-bold text-ink">Sesiones</h2>
      {sesiones.length > 0 && <p className="text-xs leading-4 text-muted">{sesiones.length} {sesiones.length === 1 ? 'sesión' : 'sesiones'} · {resumen.length > 1 ? `${resumen.slice(0, -1).join(', ')} y ${resumen.at(-1)}` : resumen[0]}</p>}
    </div>
    {sesiones.length === 0 ? <p className="border-t border-line pt-3 text-sm leading-5 text-muted">Aún no hay sesiones programadas.</p> :
      <ol>{sesiones.map((s, i) => {
        const [anio, mes, dia] = s.fecha.split('-').map(Number) as [number, number, number]
        const semana = fechaConAnio(s.fecha).split(' ')[0]
        const lugar = s.modalidad === 'VIRTUAL' ? 'Sala virtual del CPPP' : s.modalidad === 'AMBAS' ? `${s.lugar} y sala virtual` : s.lugar
        return <li key={s.id} className="flex items-start gap-3 border-t border-line py-3">
          <time dateTime={s.fecha} className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-brand-soft px-2 py-1.5 text-center text-brand">
            <span className="font-serif text-xl leading-7 font-bold">{dia}</span>
            <span className="text-xs leading-4 font-semibold">{MESES[mes - 1]}</span>
            <span className="sr-only">{anio}</span>
          </time>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm leading-5 font-semibold text-ink">{s.nombre.trim() || `Sesión ${i + 1}`} · {semana}</p>
              <EtiquetaModalidadSesion modalidad={s.modalidad} />
            </div>
            <p className="text-sm leading-5 text-muted">{hora12(s.horaInicio)} – {hora12(s.horaFin)}</p>
            <p className="flex items-start gap-1.5 text-xs leading-4 text-muted">
              {s.modalidad === 'VIRTUAL' ? <Video className="mt-px size-3.5 shrink-0" aria-hidden /> : <MapPin className="mt-px size-3.5 shrink-0" aria-hidden />}
              {lugar}
            </p>
            {s.modalidad !== 'PRESENCIAL' && s.reunion?.estado === 'iniciada' && <Link to={`/reuniones/${s.reunion.identificador}`} className="mt-1 inline-flex h-10 items-center self-start rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-ink">Entrar a la sala</Link>}
          </div>
        </li>
      })}</ol>}
  </section>
}
