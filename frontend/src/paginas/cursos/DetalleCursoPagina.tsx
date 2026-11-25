import { Award, Calendar, Clock, UserRound, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { EtiquetaEstadoCurso } from '@/components/ui/Etiqueta'
import { esApiError, mensajeDeError } from '@/lib/api'
import { cursoTieneAulaDemo, modoDemoActivo } from '@/lib/aulaGrabadaDemo'
import { cursos, descargarMaterialPdf, leerPdfBase64 as leerPdf, type DetalleCurso, type MaterialEntrada, type ModuloCurso } from '@/servicios/cursos'
import { BotonCompartir } from './CompartirCurso'
import { ConfirmarInscripcion } from './ConfirmarInscripcion'
import { cuposCurso, fechasCurso } from './formatoCurso'
import { PagoCurso } from './PagoCurso'
import { EtiquetaCategoria, EtiquetaCobro, EtiquetaModalidad, FilaDato, PortadaCurso, PreciosCurso } from './piezasCurso'
import { modalidadCobroDe, precioPara, soles, textoPlazo } from './reglasCurso'
import { SesionesCurso } from './SesionesCurso'
import { SesionesDetalle } from './SesionesDetalle'

import { GestionLeccionesYoutube } from './lecciones/GestionLeccionesYoutube'

export function DetalleCursoPagina() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const cache = useQueryClient()
  const navegar = useNavigate()
  const [confirmando, cambiarConfirmando] = useState(false)
  const consulta = useQuery({ queryKey: ['curso', id], queryFn: () => cursos.obtener(id),
    refetchInterval:query=>query.state.data?.miInscripcion?.estadoEntrega==='RETENIDA' && query.state.data.miInscripcion.estadoFinanciero==='PAGADO'?3000:false })
  const inscripcion = useMutation({ mutationFn: () => cursos.inscribirme(id, consulta.data?.versionCobro, consulta.data?.miPrecio?.tipo), onSuccess: async (resultado) => {
    await Promise.all([cache.invalidateQueries({ queryKey: ['curso', id] }), cache.invalidateQueries({ queryKey: ['cursos'] }), cache.invalidateQueries({ queryKey: ['historial'] }), cache.invalidateQueries({ queryKey: ['participante', 'clases'] })])
    cambiarConfirmando(false)
    if (resultado.estado === 'PENDIENTE_PAGO') navegar(`/cursos/${id}/pagar`)
    else toast.success('Inscripción confirmada. Ya puedes ver el curso.')
  }, onError: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['curso', id] }), cache.invalidateQueries({ queryKey: ['cursos'] })]) } })
  const publicar = useMutation({ mutationFn: () => cursos.publicar(id), onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['curso', id] }), cache.invalidateQueries({ queryKey: ['cursos'] })]) } })
  if (consulta.isPending) return <Cargando texto="Cargando curso…" />
  // Curso ajeno (instructor no asignado, borrador): la ficha pública sí está disponible.
  if (esApiError(consulta.error, 'SIN_PERMISO')) return <Navigate to={`/capacitaciones/${id}`} replace />
  if (consulta.isError) return <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el curso.')} onReintentar={consulta.refetch} />
  const curso = consulta.data
  const gestion = usuario?.rol === 'ADMIN' || usuario?.rol === 'INSTRUCTOR'
  const agremiado = usuario?.rol === 'AGREMIADO'
  const aulaDemo = cursoTieneAulaDemo(id) && curso.modalidad === 'GRABADO'
  const grabado = curso.modalidad === 'GRABADO'
  const inscripcionVigente = curso.estadoInscripcion === 'EN_CURSO' || curso.estadoInscripcion === 'TERMINADO'
  const puedeAgregar = usuario?.rol === 'INSTRUCTOR' && usuario.id === curso.instructorId
  const sesiones = curso.sesiones.filter(s => s.estado === 'PROGRAMADA')

  return <div className="mx-auto flex max-w-300 flex-col gap-4 px-4 pt-4 pb-8 wrap-anywhere sm:px-10 sm:pt-10">
    <EnlaceVolver to={gestion ? '/cursos' : '/catalogo'}>{gestion ? 'Volver a mis cursos' : 'Volver al catálogo'}</EnlaceVolver>
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        <PortadaCurso curso={curso} className="rounded-xl" />
        <div className="flex flex-wrap gap-2">
          <EtiquetaModalidad modalidad={curso.modalidad} />
          <EtiquetaCobro curso={curso} />
          <EtiquetaCategoria categoria={curso.categoria} />
          {gestion && <EtiquetaEstadoCurso estado={curso.estado} />}
        </div>
        <div className="flex items-start gap-3">
          <h1 className="min-w-0 flex-1 font-serif text-2xl leading-8 font-bold text-ink">{curso.titulo}</h1>
          {curso.estado === 'PUBLICADO' && <>
            <span className="sm:hidden"><BotonCompartir curso={curso} grande /></span>
            <span className="hidden sm:inline-flex"><BotonCompartir curso={curso} conTexto /></span>
          </>}
        </div>
        {curso.descripcion && <p className="text-base leading-6 whitespace-pre-wrap text-muted">{curso.descripcion}</p>}
        <dl className="flex flex-col gap-2.5 rounded-xl border border-line bg-white p-5">
          <FilaDato icono={UserRound} etiqueta="Instructor">{curso.instructorNombre}</FilaDato>
          <FilaDato icono={Calendar} etiqueta="Fechas">{fechasCurso(curso)}</FilaDato>
          <FilaDato icono={Clock} etiqueta="Horas">{curso.horasLectivas} horas lectivas</FilaDato>
          <FilaDato icono={Users} etiqueta="Cupos" alerta={curso.cuposDisponibles === 0}>{cuposCurso(curso)}</FilaDato>
          <FilaDato icono={Award} etiqueta="Certificado">
            {aulaDemo ? 'Constancia de demostración al completar los módulos' : <>
              {curso.tipoCertificado === 'APROBACION' ? `Certificado de aprobación · nota mínima ${curso.notaMinima}` : 'Constancia de participación'}
              {grabado ? ' · Lecciones y cuestionario de salida' : ` · asistencia mínima ${curso.requisitoAsistencia} %`}
            </>}
          </FilaDato>
        </dl>
        {!grabado && <SesionesDetalle sesiones={sesiones} />}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-32">
        {agremiado && curso.estado === 'PUBLICADO' && <TarjetaInscripcion curso={curso} aulaDemo={aulaDemo} alInscribirme={() => { inscripcion.reset(); cambiarConfirmando(true) }} />}
        {agremiado && curso.estado === 'CERRADO' && inscripcionVigente && curso.accesoContenido !== false && !modoDemoActivo &&
          <EnlaceEvaluaciones curso={curso} />}
        {puedeAgregar && curso.estado !== 'CERRADO' && !modoDemoActivo && <Link to={`/instructor/cursos/${id}/contenido`}
          className="inline-flex h-12 items-center justify-center rounded-lg border border-brand bg-white px-5 text-base font-semibold text-brand hover:bg-brand-soft">Configurar contenido</Link>}
        {puedeAgregar && curso.estado !== 'CERRADO' && !modoDemoActivo && <Link to={`/instructor/cursos/${id}/evaluaciones`}
          className="inline-flex h-12 items-center justify-center rounded-lg border border-brand bg-white px-5 text-base font-semibold text-brand hover:bg-brand-soft">Gestionar evaluaciones</Link>}
        {usuario?.rol === 'ADMIN' && <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-6">
          <p className="text-xs leading-4 font-semibold text-brand">Gestión del curso</p>
          <PreciosCurso curso={curso} />
          {curso.estado === 'BORRADOR' && <Boton cargando={publicar.isPending} onClick={() => publicar.mutate()} className="h-12 w-full text-base">Publicar en catálogo</Boton>}
          {aulaDemo ? <p className="text-sm text-muted">El programa y la gratuidad son fijos en este curso de demostración.</p> : <Link to={`/admin/cursos/${curso.id}/editar`} className="inline-flex h-12 items-center justify-center rounded-lg border border-brand bg-white px-5 text-base font-semibold text-brand hover:bg-brand-soft">Editar curso</Link>}
          {!modoDemoActivo && <Link to={`/admin/cursos/${id}/contenido`}
            className="inline-flex h-12 items-center justify-center rounded-lg border border-brand bg-white px-5 text-base font-semibold text-brand hover:bg-brand-soft">Configurar contenido</Link>}
          {curso.estado !== 'CERRADO' && !modoDemoActivo && <Link to={`/admin/cursos/${curso.id}/evaluaciones/configuracion`}
            className="inline-flex h-12 items-center justify-center rounded-lg border border-brand bg-white px-5 text-base font-semibold text-brand hover:bg-brand-soft">Configurar evaluaciones</Link>}
          {curso.estado === 'PUBLICADO' && grabado && curso.tipoCertificado === 'APROBACION' && !modoDemoActivo &&
            <Link to={`/admin/cursos/${curso.id}/certificados`} className="inline-flex h-12 items-center justify-center rounded-lg border border-brand bg-white px-5 text-base font-semibold text-brand hover:bg-brand-soft">Evaluar inscritos</Link>}
          {publicar.isError && <p role="alert" className="text-sm text-danger">{mensajeDeError(publicar.error, 'No pudimos publicar el curso.')}</p>}
        </div>}
      </aside>
    </div>

    <ConfirmarInscripcion key={`${curso.versionCobro}:${curso.miPrecio?.tipo}:${curso.miPrecio?.importe}`}
      curso={curso} abierto={confirmando} onCerrar={() => cambiarConfirmando(false)} onConfirmar={() => inscripcion.mutate()}
      confirmando={inscripcion.isPending} error={inscripcion.isError ? mensajeDeError(inscripcion.error, 'No pudimos registrar tu inscripción.') : undefined} />

    {curso.miInscripcion && agremiado && curso.miInscripcion.estadoEntrega === 'RETENIDA' && <Aviso tipo="advertencia" titulo={curso.miInscripcion.estadoFinanciero === 'PAGADO' ? 'Pago confirmado' : 'Constancia retenida'}>
      {curso.miInscripcion.estadoFinanciero === 'PAGADO' ? 'Estamos preparando tu constancia.' : 'Cumples los requisitos académicos y falta confirmar el pago de la constancia.'}
    </Aviso>}
    {agremiado && curso.miInscripcion?.pagoId && curso.estadoInscripcion !== 'PENDIENTE_PAGO' && <PagoCurso pagoId={curso.miInscripcion.pagoId} />}
    {/* La asistencia, los requisitos y el material son para quien gestiona el curso o ya está inscrito */}
    {!grabado && (gestion || curso.inscrito) && <SesionesCurso curso={curso} administrador={usuario?.rol === 'ADMIN' && curso.estado !== 'CERRADO'} participante={agremiado} sinLista />}
    {puedeAgregar && grabado && !modoDemoActivo && <GestionLeccionesYoutube key={id} cursoId={id} modulos={curso.modulos} />}
    {(gestion || (curso.inscrito && curso.accesoContenido !== false && !aulaDemo)) && <>
      <h2 className="font-serif text-xl leading-7 font-bold text-ink">Módulos y material</h2>
      <ol className="space-y-4">{curso.modulos.map(modulo => <Modulo key={modulo.id} cursoId={id} modulo={modulo} puedeAgregar={puedeAgregar} />)}</ol>
    </>}
  </div>
}

function EnlaceEvaluaciones({ curso }: { curso: DetalleCurso }) {
  const grabado = curso.modalidad === 'GRABADO'
  return <Link to={`/cursos/${curso.id}/${grabado ? 'aula' : 'evaluaciones'}`}
    className="inline-flex h-12 items-center justify-center rounded-lg bg-brand px-5 text-base font-semibold text-white hover:bg-brand-ink">
    {grabado ? 'Abrir aula grabada' : 'Ver contenido y evaluaciones'}
  </Link>
}

/** S3 4.1 · Tarjeta «Tu precio» con el aviso del cobro y el botón «Inscribirme». */
function TarjetaInscripcion({ curso, aulaDemo, alInscribirme }: { curso: DetalleCurso; aulaDemo: boolean; alInscribirme: () => void }) {
  if (curso.impedimentoInscripcion && !curso.inscrito) return <section aria-label="Inscripción">
    <Aviso tipo="advertencia" titulo="Inscripción no disponible">{curso.impedimentoInscripcion.mensaje}</Aviso>
  </section>
  const cobro = modalidadCobroDe(curso)
  const precio = precioPara(curso)
  const pendiente = curso.estadoInscripcion === 'PENDIENTE_PAGO'
  const sinCupos = curso.cuposDisponibles === 0
  const plazo = curso.plazoPagoMinutos ? textoPlazo(curso.plazoPagoMinutos) : 'unos días'
  return <section aria-label="Inscripción" className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-6">
    {cobro === 'GRATUITO' ? <>
      <p className="text-xs leading-4 font-semibold text-brand">Precio</p>
      <p className="font-serif text-[28px] leading-9 font-bold text-success">Gratuito</p>
    </> : <>
      <p className="text-xs leading-4 font-semibold text-brand">{cobro === 'CERTIFICADO' ? 'Tu constancia' : 'Tu precio'}</p>
      <p className="flex flex-wrap items-end gap-x-2">
        <span className="font-serif text-[28px] leading-9 font-bold text-ink">{soles(precio.importe)}</span>
        {precio.tipo && <span className="text-sm leading-5 text-muted">{precio.tipo === 'COLEGIADO' ? 'precio de colegiado' : 'precio general'}</span>}
      </p>
      {precio.otro !== precio.importe && <p className="text-xs leading-4 text-muted">{precio.tipo === 'COLEGIADO' ? 'Precio general' : 'Precio de colegiado'}: {soles(precio.otro)}</p>}
    </>}
    {curso.inscrito ? (
      pendiente ? <>
        <Aviso tipo="advertencia" titulo="Inscripción pendiente de pago">Tu cupo está reservado. Paga antes de que venza el plazo para acceder al curso.</Aviso>
        <Link to={`/cursos/${curso.id}/pagar`} className="inline-flex h-12 items-center justify-center rounded-lg bg-brand px-5 text-base font-semibold text-white hover:bg-brand-ink">Ir a pagar</Link>
      </> : <>
        <Aviso tipo="exito" titulo="Ya estás inscrito(a)">{curso.modalidad === 'GRABADO'
          ? 'Entra al aula para empezar o retomar tus actividades.' : 'Revisa las sesiones y el material del curso.'}</Aviso>
        {curso.accesoContenido !== false && curso.estadoInscripcion !== 'CANCELADA' && (aulaDemo || !modoDemoActivo) && <EnlaceEvaluaciones curso={curso} />}
      </>
    ) : <>
      {cobro === 'PREVIO' && <Aviso tipo="advertencia" titulo="Pago antes de llevar el curso">Al inscribirte tendrás {plazo} para pagar. Mientras tanto no podrás ver el contenido ni registrar asistencia.</Aviso>}
      {cobro === 'CERTIFICADO' && <Aviso titulo="Pagas solo el certificado">Llevas el curso gratis. Pagas la constancia al terminar, si cumples los requisitos.</Aviso>}
      {cobro === 'GRATUITO' && <Aviso tipo="exito" titulo="Curso gratuito">Ni la inscripción ni la constancia requieren pago.</Aviso>}
      <Boton onClick={alInscribirme} disabled={sinCupos} className="h-12 w-full text-base">{sinCupos ? 'Sin cupos' : 'Inscribirme'}</Boton>
      {cobro !== 'GRATUITO' && <p className="text-xs leading-4 text-muted">Formas de pago: tarjeta o Yape (en línea), transferencia BCP o efectivo en la sede.</p>}
    </>}
  </section>
}

function Modulo({ cursoId, modulo, puedeAgregar }: { cursoId: string; modulo: ModuloCurso; puedeAgregar: boolean }) {
  const cache = useQueryClient()
  const [tipo, cambiarTipo] = useState<'PDF' | 'ENLACE' | 'VIDEO'>('PDF')
  const [error, cambiarError] = useState('')
  const [ocupado, cambiarOcupado] = useState(false)
  const [descargando, cambiarDescargando] = useState(false)
  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const datos = new FormData(formulario)
    cambiarError(''); cambiarOcupado(true)
    try {
      const titulo = String(datos.get('titulo') ?? '').trim()
      let entrada: MaterialEntrada
      if (tipo === 'PDF') {
        const archivo = datos.get('archivo')
        if (!(archivo instanceof File) || !archivo.size) throw new Error('Selecciona un archivo PDF.')
        entrada = { titulo, tipo, contenidoBase64: await leerPdf(archivo) }
      } else entrada = { titulo, tipo, url: String(datos.get('url') ?? '').trim() }
      await cursos.material(cursoId, modulo.id, entrada)
      formulario.reset()
      await cache.invalidateQueries({ queryKey: ['curso', cursoId] })
    } catch (fallo) { cambiarError(fallo instanceof Error ? fallo.message : 'No pudimos agregar el material.') }
    finally { cambiarOcupado(false) }
  }
  const descargar = async (materialId: string) => {
    cambiarError(''); cambiarDescargando(true)
    try {
      await descargarMaterialPdf(cursoId, modulo.id, materialId)
    } catch { cambiarError('No pudimos descargar el PDF. Revisa tu conexión e intenta de nuevo.') }
    finally { cambiarDescargando(false) }
  }
  return <li className="min-w-0 space-y-3 rounded-xl border border-line bg-white p-4">
    <h3 className="text-lg font-semibold">{modulo.orden}. {modulo.titulo}</h3>
    {modulo.materiales.length === 0 ? <p className="text-sm text-muted">Aún no hay material en este módulo.</p> : <ul className="space-y-2">{modulo.materiales.map(material => <li key={material.id}>
      {material.tipo === 'PDF' ? <button disabled={descargando} className="text-left text-brand underline" onClick={() => void descargar(material.id)}>Descargar PDF: {material.titulo}</button> :
        material.url ? <a className="text-brand underline" href={material.url} target="_blank" rel="noopener noreferrer">{material.tipo === 'VIDEO' ? 'Video' : 'Enlace'}: {material.titulo} <span className="sr-only">(abre otra pestaña)</span></a> :
          <Link className="text-brand underline" to={`/cursos/${cursoId}/aula`}>Ver en el aula: {material.titulo}</Link>}
    </li>)}</ul>}
    {puedeAgregar && <form onSubmit={e => void guardar(e)} className="border-t border-line pt-4">
      <fieldset disabled={ocupado} className="grid min-w-0 gap-3 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">Agregar material a {modulo.titulo}</legend>
        <Campo etiqueta="Título del material" obligatorio><Entrada name="titulo" required maxLength={160} /></Campo>
        <Campo etiqueta="Tipo de material"><Selector value={tipo} onChange={e => cambiarTipo(e.target.value as typeof tipo)}><option value="PDF">Archivo PDF (hasta 5 MB)</option><option value="ENLACE">Enlace</option><option value="VIDEO">Video por URL</option></Selector></Campo>
        {tipo === 'PDF' ? <Campo etiqueta="Archivo PDF" obligatorio className="sm:col-span-2"><Entrada className="h-auto min-h-11 py-2 sm:h-auto" name="archivo" type="file" accept="application/pdf,.pdf" required /></Campo> : <Campo etiqueta="URL HTTPS" obligatorio className="sm:col-span-2"><Entrada name="url" type="url" pattern="https://.*" maxLength={2048} required placeholder="https://…" /></Campo>}
        <Boton className="justify-self-start" type="submit" cargando={ocupado}>Guardar material</Boton>
      </fieldset>
    </form>}
    {error && <p role="alert" className="text-danger">{error}</p>}
  </li>
}
