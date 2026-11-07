import { Calendar } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fechaCorta, rangoFechasCorto } from '@/lib/formato'
import { CERTIFICADOS_CURSO } from '@/servicios/cursos'
import { queTeFalta, type Aviso } from './progreso'
import { guardarDescarga, historiales, type Historial, type ResumenAsistencia, type SesionHistorial } from '@/servicios/historial'

type CursoHistorial = Historial['cursos'][number]

const ESTADO_SESION: Record<SesionHistorial['estado'], { texto: string; tono: 'exito' | 'peligro' | 'neutro' }> = {
  PRESENTE: { texto: 'Presente', tono: 'exito' },
  AUSENTE: { texto: 'Ausente', tono: 'peligro' },
  PENDIENTE: { texto: 'Pendiente', tono: 'neutro' },
  CANCELADA: { texto: 'Cancelada', tono: 'neutro' },
}

const tarjeta = 'flex min-w-0 flex-col gap-2.5 rounded-xl border border-line bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]'
const anioEnLima = (fechaIso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric' }).format(new Date(fechaIso))

/** 4.1 · Mi historial (y el historial de un colegiado cuando lo abre el administrador). */
export function HistorialPagina() {
  const { usuarioId } = useParams()
  const { usuario } = useAuth()
  const id = usuarioId ?? usuario?.id ?? ''
  const consulta = useQuery({ queryKey: ['historial', usuario?.id, id], queryFn: () => historiales.obtener(id), enabled: !!id, retry: false })
  const [descargando, cambiarDescargando] = useState(false)
  const [error, cambiarError] = useState('')
  const [anio, cambiarAnio] = useState(() => anioEnLima(new Date().toISOString()))
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
  const esAdmin = usuario?.rol === 'ADMIN'
  // Cada curso con certificado suma sus horas una sola vez, en el año en que se emitió
  const certificadosPorAnio = historial.cursos.flatMap(c => c.certificados.filter(cert => cert.estado === 'VALIDO')
    .map(cert => ({ anio: anioEnLima(cert.emitidoEn), cursoId: c.id, horas: c.horasLectivas })))
  const anios = [...new Set([anio, ...certificadosPorAnio.map(c => c.anio)])].sort().reverse()
  const horas = [...new Map(certificadosPorAnio.filter(c => c.anio === anio).map(c => [c.cursoId, c.horas])).values()].reduce((suma, h) => suma + h, 0)
  const enCurso = historial.cursos.filter(c => c.estado === 'EN_CURSO')
  const pendientes = historial.cursos.filter(c => c.estado === 'PENDIENTE_PAGO')
  const terminados = historial.cursos.filter(c => c.estado === 'TERMINADO')

  const selectorAnio = (oculto: string) => <Campo etiqueta="Año" className={oculto}>
    <Selector value={anio} onChange={e => cambiarAnio(e.target.value)} className="sm:h-12 sm:text-base">
      {anios.map(a => <option key={a} value={a}>{a}</option>)}
    </Selector>
  </Campo>
  const botonResumen = <Boton variante="secundario" className="h-12 w-full text-base sm:h-10 sm:text-sm" disabled={descargando} onClick={() => void descargar()}>Descargar resumen en PDF</Boton>

  return <div className="mx-auto flex max-w-160 flex-col gap-4 px-4 pt-6 pb-8 wrap-anywhere sm:max-w-200 sm:pt-10">
    {esAdmin && <Link className="text-sm font-semibold text-brand hover:underline" to="/admin/historial">← Volver a historiales</Link>}
    <h1 className="text-[22px] font-bold text-ink">{esAdmin ? 'Historial del colegiado' : 'Mi historial'}</h1>
    {esAdmin
      ? <p className="text-sm text-muted"><strong className="font-semibold text-ink">{historial.colegiado.nombre}</strong> · DNI {historial.colegiado.dniEnmascarado ?? 'no registrado'}</p>
      : <p className="text-sm text-muted">Tus cursos, asistencias y certificados.</p>}

    <div className="grid gap-4 sm:grid-cols-[1fr_14.5rem] sm:items-stretch sm:gap-5">
    <section aria-labelledby="horas-acumuladas" className={cn(tarjeta, 'gap-2')}>
      <h2 id="horas-acumuladas" className="text-sm font-semibold text-muted">Horas de capacitación acumuladas</h2>
      <p className="font-serif text-[32px] font-bold text-brand">{horas.toLocaleString('es-PE')} {horas === 1 ? 'hora' : 'horas'}</p>
      <p className="text-[13px] text-muted">{horas > 0
        ? 'Suma de las horas lectivas de tus certificados válidos.'
        : 'Aún no tienes certificados válidos. Las horas se suman cuando obtienes un certificado.'}</p>
      {/* En celular (4.1) el año va dentro de la tarjeta; en escritorio (5.1), a la derecha */}
      {selectorAnio('sm:hidden')}
    </section>
    <div className="flex flex-col gap-3 sm:justify-between">
      {selectorAnio('max-sm:hidden')}
      {botonResumen}
    </div>
    </div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}

    <h2 className="text-lg font-bold text-ink">Cursos en curso</h2>
    {enCurso.length === 0
      ? <p className="text-sm text-muted">No tienes cursos en curso.</p>
      : enCurso.map(curso => <TarjetaCurso key={curso.id} curso={curso} descargando={descargando} onDescargar={certificadoId => void descargar(certificadoId)} />)}

    {pendientes.length > 0 && <>
      <h2 className="text-lg font-bold text-ink">Inscripciones pendientes de pago</h2>
      {pendientes.map(curso => <TarjetaCurso key={curso.id} curso={curso} descargando={descargando} onDescargar={certificadoId => void descargar(certificadoId)} />)}
    </>}
    <h2 className="text-lg font-bold text-ink">Cursos terminados</h2>
    {terminados.length === 0
      ? <p className="text-sm text-muted">Todavía no has terminado ningún curso.</p>
      : terminados.map(curso => <TarjetaCurso key={curso.id} curso={curso} descargando={descargando} onDescargar={certificadoId => void descargar(certificadoId)} />)}

    {historial.sesionesIndependientes.length > 0 && <section aria-labelledby="sesiones-independientes" className="flex flex-col gap-2.5">
      <h2 id="sesiones-independientes" className="text-lg font-bold text-ink">Otras sesiones de capacitación</h2>
      <p className="text-sm text-muted">Clases inscritas que no figuran en los cursos de este historial.</p>
      <div className={tarjeta}><Sesiones sesiones={historial.sesionesIndependientes} conTitulo /></div>
    </section>}
  </div>
}

function TarjetaCurso({ curso, descargando, onDescargar }: { curso: CursoHistorial; descargando: boolean; onDescargar: (certificadoId: string) => void }) {
  const terminado = curso.estado === 'TERMINADO'
  const fechas = curso.sesiones.map(s => s.fecha).sort()
  return <article className={tarjeta}>
    <div className="flex items-start gap-2">
      <h3 className="min-w-0 flex-1 text-base font-semibold text-ink">{curso.titulo}</h3>
      <Etiqueta tono={curso.estado === 'PENDIENTE_PAGO' ? 'advertencia' : terminado ? 'exito' : 'marca'}>{curso.estado === 'PENDIENTE_PAGO' ? 'Pendiente de pago' : terminado ? 'Terminado' : 'En curso'}</Etiqueta>
    </div>
    {fechas.length > 0 && <p className="flex items-center gap-2 text-sm text-muted">
      <Calendar className="size-4 shrink-0 text-brand" aria-hidden />{rangoFechasCorto(fechas[0]!, fechas.at(-1)!)}
    </p>}
    <Avance asistencia={curso.asistencia} />
    {curso.sesiones.length > 0 && <div className="border-t border-line pt-2.5"><Sesiones sesiones={curso.sesiones} /></div>}
    {terminado && <AvisoProgreso aviso={queTeFalta(curso)} />}
    {curso.certificados.filter(cert => cert.estado === 'ANULADO').map(cert => <p key={cert.id} className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
      <Etiqueta tono="peligro">Anulado</Etiqueta> {CERTIFICADOS_CURSO[cert.tipo]} · código {cert.codigo}. No suma horas.
    </p>)}
    {curso.certificados.filter(cert => cert.estado === 'VALIDO').map(cert => <div key={cert.id} className="flex flex-col gap-2 rounded-lg bg-brand-soft p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-brand">{CERTIFICADOS_CURSO[cert.tipo]}</p>
        <p className="text-[13px] text-muted">Código {cert.codigo} · {curso.horasLectivas} horas lectivas</p>
      </div>
      <div className="flex flex-col items-center gap-2 sm:flex-row-reverse sm:gap-4">
        <Boton variante="secundario" className="w-full sm:w-auto" disabled={descargando} onClick={() => onDescargar(cert.id)} aria-label={`Descargar certificado ${cert.codigo}`}>Descargar certificado</Boton>
        <Link to={`/certificados/${encodeURIComponent(cert.codigo)}`} className="text-sm font-semibold text-brand underline">Ver certificado</Link>
      </div>
    </div>)}
  </article>
}

const TONO_AVISO = {
  exito: 'border-success bg-success-soft text-success',
  advertencia: 'border-warning bg-warning-soft text-warning',
  peligro: 'border-danger bg-danger-soft text-danger',
}

export function AvisoProgreso({ aviso }: { aviso: Aviso | null }) {
  if (!aviso) return null
  return <p className={cn('rounded-lg border px-4 py-3 text-sm', TONO_AVISO[aviso.tono])}>{aviso.texto}</p>
}

/** Texto y barra de asistencia: verde al 100 %, vino mientras falte. */
export function Avance({ asistencia }: { asistencia: ResumenAsistencia }) {
  if (asistencia.porcentaje === null) return <p className="text-sm font-medium text-ink">Asistencia: sin sesiones realizadas</p>
  const completo = asistencia.porcentaje >= 100
  return <>
    <p className="text-sm font-medium text-ink">Asistencia: {asistencia.porcentaje.toLocaleString('es-PE')} % ({asistencia.presentes} de {asistencia.realizadas} {asistencia.realizadas === 1 ? 'sesión' : 'sesiones'})</p>
    <div role="progressbar" aria-label="Asistencia" aria-valuemin={0} aria-valuemax={100} aria-valuenow={asistencia.porcentaje} className="h-2 w-full overflow-hidden rounded bg-line">
      <div className={cn('h-full rounded', completo ? 'bg-success' : 'bg-brand')} style={{ width: `${Math.min(100, asistencia.porcentaje)}%` }} />
    </div>
  </>
}

function Sesiones({ sesiones, conTitulo = false }: { sesiones: SesionHistorial[]; conTitulo?: boolean }) {
  return <ul className="flex flex-col gap-2">{sesiones.map((s, i) => <li key={s.id} className="flex items-center justify-between gap-3 text-sm text-muted">
    <span className="min-w-0">{conTitulo ? s.titulo : `Sesión ${i + 1}`} · {fechaCorta(s.fecha)}</span>
    <Etiqueta tono={ESTADO_SESION[s.estado].tono}>{ESTADO_SESION[s.estado].texto}</Etiqueta>
  </li>)}</ul>
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
