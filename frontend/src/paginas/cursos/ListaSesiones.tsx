import { Link } from 'react-router-dom'
import type { SesionCurso } from '@/servicios/cursos'
import { ETIQUETA_MODALIDAD_SESION } from './formatoCurso'

/** HU-36: cada sesión dice dónde se dicta; la virtual o «ambas» ofrece el acceso a su sala. */
export function ListaSesiones({ sesiones }: { sesiones: SesionCurso[] }) {
  if (sesiones.length === 0) return <p>Aún no hay sesiones programadas.</p>
  return <ul className="space-y-3">{sesiones.map(sesion => {
    const programada = sesion.estado === 'PROGRAMADA'
    return <li key={sesion.id} className="rounded-lg border border-line p-3">
      <p className="font-semibold">{sesion.nombre}</p>
      <p className="text-sm font-medium text-brand">{ETIQUETA_MODALIDAD_SESION[sesion.modalidad]}</p>
      <p><time dateTime={sesion.fecha}>{sesion.fecha.split('-').reverse().join('/')}</time> · {sesion.horaInicio}–{sesion.horaFin} (hora de Lima)</p>
      {sesion.modalidad !== 'VIRTUAL' && <p>{sesion.lugar}</p>}
      {programada && sesion.modalidad !== 'PRESENCIAL' && <AccesoSala reunion={sesion.reunion} />}
      <p className="text-sm text-muted">{programada ? 'Programada' : 'Cancelada · no cuenta para asistencia'}</p>
    </li>
  })}</ul>
}

function AccesoSala({ reunion }: { reunion: SesionCurso['reunion'] }) {
  if (!reunion) return <p className="text-sm">El acceso a la sala es para inscritos.</p>
  if (reunion.estado !== 'iniciada') return <p className="text-sm">La sala se habilita al iniciar la sesión.</p>
  return <Link to={`/reuniones/${reunion.identificador}`} className="mt-1 inline-flex min-h-11 items-center rounded-lg border border-line px-3 py-2 font-semibold">Entrar a la sala</Link>
}
