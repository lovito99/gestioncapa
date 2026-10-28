import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Boton } from '@/components/ui/Boton'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { guardarDescarga, historiales, type ResumenAsistencia, type SesionHistorial } from '@/servicios/historial'

function Resumen({ asistencia }: { asistencia: ResumenAsistencia }) {
  return <p className="text-sm"><strong>{asistencia.porcentaje === null ? 'Sin sesiones realizadas' : `${asistencia.porcentaje.toLocaleString('es-PE')} % de asistencia`}</strong>{asistencia.realizadas > 0 && ` · ${asistencia.presentes} de ${asistencia.realizadas} sesiones realizadas`}</p>
}
function Sesiones({ sesiones }: { sesiones: SesionHistorial[] }) {
  const estados = { PRESENTE: 'Presente', AUSENTE: 'Ausente', PENDIENTE: 'Pendiente', CANCELADA: 'Cancelada' }
  return sesiones.length ? <ul className="space-y-2">{sesiones.map(s => <li key={s.id} className="rounded-lg border border-line px-3 py-2 text-sm">
    <p className="font-semibold">{s.titulo}</p><p>{s.fecha} · {s.horaInicio}–{s.horaFin} (hora de Lima)</p>
    <p className={s.estado === 'PRESENTE' ? 'font-semibold text-success' : 'text-ink-2'}>{estados[s.estado]}</p>
    {s.horaRegistro && <p>Registro: {new Date(s.horaRegistro).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>}
  </li>)}</ul> : <p className="text-sm text-muted">Sin sesiones registradas.</p>
}
export function HistorialPagina() {
  const { usuarioId } = useParams()
  const { usuario } = useAuth()
  const id = usuarioId ?? usuario?.id ?? ''
  const consulta = useQuery({ queryKey: ['historial', usuario?.id, id], queryFn: () => historiales.obtener(id), enabled: !!id, retry: false })
  const [descargando, cambiarDescargando] = useState(false)
  const [error, cambiarError] = useState('')
  const descargar = async (certificadoId?: string) => {
    if (descargando) return
    cambiarDescargando(true); cambiarError('')
    try { guardarDescarga(certificadoId ? await historiales.certificado(id, certificadoId) : await historiales.pdf(id), certificadoId ? 'certificado.pdf' : 'historial-capacitacion.pdf') }
    catch { cambiarError('No pudimos descargar el archivo. Revisa tu conexión y tus permisos e intenta de nuevo.') }
    finally { cambiarDescargando(false) }
  }
  if (consulta.isPending) return <Cargando texto="Cargando historial…" />
  if (consulta.isError) return <div className="mx-auto max-w-240 px-4 py-6"><ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el historial.')} onReintentar={consulta.refetch} /></div>
  const historial = consulta.data
  return <div className="mx-auto max-w-240 space-y-5 px-4 py-6 wrap-anywhere">
    <header className="space-y-3">
      {usuario?.rol === 'ADMIN' && <Link className="text-brand underline" to="/admin/historial">Volver a historiales</Link>}
      <h1 className="text-2xl font-semibold">{usuario?.rol === 'ADMIN' ? 'Historial del colegiado' : 'Mi historial'}</h1>
      <p className="font-semibold">{historial.colegiado.nombre}</p>
      <p>DNI: {historial.colegiado.dniEnmascarado ?? 'No registrado'}</p>
      <Boton disabled={descargando} onClick={() => void descargar()}>Descargar historial PDF</Boton>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </header>
    <section aria-labelledby="resumen-asistencia" className="space-y-2 rounded-xl border border-line bg-white p-4">
      <h2 id="resumen-asistencia" className="text-lg font-semibold">Asistencia general</h2>
      <Resumen asistencia={historial.asistenciaGeneral} />
      <p className="text-sm text-muted">El porcentaje cuenta las sesiones iniciadas. Excluye las futuras y canceladas.</p>
    </section>
    <h2 className="text-xl font-semibold">Mis cursos</h2>
    {historial.cursos.length === 0 ? <p>Aún no tienes cursos inscritos.</p> : historial.cursos.map(curso => <article key={curso.id} className="min-w-0 space-y-4 rounded-xl border border-line bg-white p-4">
      <header><h3 className="text-lg font-semibold">{curso.titulo}</h3><p>{curso.estado === 'EN_CURSO' ? 'En curso' : 'Terminado'} · {curso.horasLectivas} horas lectivas</p></header>
      <Resumen asistencia={curso.asistencia} />
      <h4 className="font-semibold">Asistencia por sesión</h4>
      <Sesiones sesiones={curso.sesiones} />
      <h4 className="font-semibold">Certificados</h4>
      {curso.certificados.length === 0 ? <p className="text-sm text-muted">Sin certificados emitidos.</p> : <ul className="space-y-3">{curso.certificados.map(cert => <li key={cert.id} className="space-y-2">
        <p className="text-sm">{cert.tipo === 'APROBACION' ? 'Aprobación' : 'Participación'} · {cert.codigo} · {new Date(cert.emitidoEn).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</p>
        <Boton variante="secundario" className="h-auto min-h-11 whitespace-normal" disabled={descargando} onClick={() => void descargar(cert.id)} aria-label={`Descargar certificado ${cert.codigo}`}>Descargar certificado</Boton>
      </li>)}</ul>}
    </article>)}
    <section aria-labelledby="sesiones-independientes" className="space-y-3">
      <h2 id="sesiones-independientes" className="text-xl font-semibold">Otras sesiones de capacitación</h2>
      <p className="text-sm text-muted">Clases inscritas que no figuran en los cursos de este historial.</p>
      <Sesiones sesiones={historial.sesionesIndependientes} />
    </section>
  </div>
}

export function HistorialesAdminPagina() {
  const consulta = useQuery({ queryKey: ['colegiados', 'historial'], queryFn: historiales.colegiados })
  const [busqueda, cambiarBusqueda] = useState('')
  if (consulta.isPending) return <Cargando texto="Cargando colegiados…" />
  if (consulta.isError) return <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar los colegiados.')} onReintentar={consulta.refetch} />
  const visibles = consulta.data.filter(p => p.nombre.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')))
  return <div className="mx-auto max-w-240 space-y-4 px-4 py-6 wrap-anywhere">
    <h1 className="text-2xl font-semibold">Historiales de colegiados</h1>
    <label className="block">Buscar por nombre<input className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3" value={busqueda} onChange={e => cambiarBusqueda(e.target.value)} /></label>
    {visibles.length ? <ul className="space-y-3">{visibles.map(p => <li className="rounded-xl border border-line bg-white p-4" key={p.id}><Link className="font-semibold text-brand underline" to={`/historial/${p.id}`}>Ver historial de {p.nombre}</Link><p className="text-sm">DNI: {p.dniEnmascarado ?? 'No registrado'}</p></li>)}</ul> : <p>No hay colegiados para mostrar.</p>}
  </div>
}
