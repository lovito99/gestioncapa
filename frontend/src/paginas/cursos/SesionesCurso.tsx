import type { DetalleCurso } from '@/servicios/cursos'

export function SesionesCurso({ curso }: { curso: DetalleCurso }) {
  const presencial = curso.modalidad !== 'VIRTUAL'
  return <section aria-labelledby="sesiones-curso" className="space-y-4 rounded-xl border border-line bg-white p-5">
    <h2 id="sesiones-curso" className="text-xl font-semibold">Sesiones del curso</h2>
    {presencial && <div className="space-y-1 rounded-lg bg-brand-soft p-3">
      <h3 className="font-semibold">Requisito para obtener la constancia</h3>
      <p>Asistencia mínima del 80 % de las sesiones presenciales. Las sesiones canceladas no cuentan.</p>
      {curso.tipoCertificado === 'APROBACION' && <p>Para obtener el certificado de aprobación también necesitas una nota mínima de {curso.notaMinima}.</p>}
    </div>}
    {curso.sesiones.length === 0 ? <p className="text-muted">Aún no hay sesiones programadas.</p> : <ul className="space-y-3">{curso.sesiones.map(sesion => <li key={sesion.id} className="space-y-1 rounded-lg border border-line p-3">
      <p className="font-semibold">{sesion.nombre}</p>
      <p><time dateTime={sesion.fecha}>{sesion.fecha.split('-').reverse().join('/')}</time> · {sesion.horaInicio}–{sesion.horaFin} (hora de Lima)</p>
      <p>{sesion.lugar}</p>
      <p className={sesion.estado === 'CANCELADA' ? 'text-danger' : 'text-muted'}>{sesion.estado === 'CANCELADA' ? 'Cancelada · no cuenta para asistencia' : 'Programada'}</p>
    </li>)}</ul>}
  </section>
}
