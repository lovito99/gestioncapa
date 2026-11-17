import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cursos, type DetalleCurso } from '@/servicios/cursos'
import { ListaSesiones } from './ListaSesiones'

/** `sinLista` oculta la lista cuando la página ya muestra las sesiones con el diseño del Figma S3 4.1. */
export function SesionesCurso({ curso, administrador, participante, sinLista = false }: { curso: DetalleCurso; administrador?: boolean; participante?: boolean; sinLista?: boolean }) {
  const asistencia = useQuery({ queryKey: ['curso', curso.id, 'mi-asistencia'], queryFn: () => cursos.miAsistencia(curso.id), enabled: participante })
  return <section aria-labelledby="sesiones-titulo" className="space-y-4 rounded-xl border border-line bg-white p-4 sm:p-5">
    <h2 id="sesiones-titulo" className="text-xl font-semibold">{sinLista ? 'Asistencia y requisitos' : 'Sesiones del curso'}</h2>
    <div className="space-y-1 rounded-lg bg-brand-soft p-3">
      <p className="font-semibold">Requisito para obtener la constancia</p>
      <p>Asistencia mínima del {curso.requisitoAsistencia} % de las sesiones. En el aula virtual, la asistencia cuenta si estuviste conectado el tiempo mínimo que fija el instructor. Las sesiones canceladas no cuentan.</p>
      {curso.tipoCertificado === 'APROBACION' && <p>Para obtener el certificado de aprobación también necesitas una nota mínima de {curso.notaMinima}.</p>}
    </div>
    {!sinLista && <ListaSesiones sesiones={curso.sesiones} />}
    {participante && <div>
      {asistencia.isPending && <p role="status">Consultando tu asistencia…</p>}
      {asistencia.isError && <p role="alert" className="text-danger">No pudimos consultar tu asistencia. <button className="underline" onClick={() => void asistencia.refetch()}>Reintentar</button></p>}
      {asistencia.data && <p>Tu asistencia: {asistencia.data.presentes} de {asistencia.data.totalSesiones} sesiones ({asistencia.data.porcentaje.toLocaleString('es-PE', { maximumFractionDigits: 1 })} %). {asistencia.data.cumpleAsistencia ? 'Cumples el requisito de asistencia.' : 'Aún no cumples el requisito de asistencia.'}</p>}
    </div>}
    {administrador && <div className="flex flex-wrap gap-3 border-t border-line pt-4">
      <Link to={`/admin/cursos/${curso.id}/sesiones/nueva`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-ink">Programar sesión</Link>
      <Link to={`/admin/cursos/${curso.id}/sesiones`} className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-ink-2 ring-1 ring-line-2 ring-inset hover:bg-surface-2">Ver y editar sesiones</Link>
    </div>}
  </section>
}
