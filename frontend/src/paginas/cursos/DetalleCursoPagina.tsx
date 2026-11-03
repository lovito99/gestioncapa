import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { EtiquetaEstadoCurso } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { fechaCorta, rangoHorario } from '@/lib/formato'
import { CERTIFICADOS_CURSO, cursos, leerPdfBase64 as leerPdf, type MaterialEntrada, type ModuloCurso } from '@/servicios/cursos'
import { costoCurso, cuposCurso, ETIQUETA_MODALIDAD, fechasCurso } from './formatoCurso'
import { DatoCurso, EtiquetasCurso } from './presentacion'

export function DetalleCursoPagina() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const cache = useQueryClient()
  const consulta = useQuery({ queryKey: ['curso', id], queryFn: () => cursos.obtener(id) })
  const inscripcion = useMutation({ mutationFn: () => cursos.inscribirme(id), onSuccess: async () => {
    await Promise.all([cache.invalidateQueries({ queryKey: ['curso', id] }), cache.invalidateQueries({ queryKey: ['cursos'] }), cache.invalidateQueries({ queryKey: ['historial'] }), cache.invalidateQueries({ queryKey: ['participante', 'clases'] })])
  }, onError: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['curso', id] }), cache.invalidateQueries({ queryKey: ['cursos'] })]) } })
  const publicar = useMutation({ mutationFn: () => cursos.publicar(id), onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['curso', id] }), cache.invalidateQueries({ queryKey: ['cursos'] })]) } })
  if (consulta.isPending) return <Cargando texto="Cargando curso…" />
  if (consulta.isError) return <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el curso.')} onReintentar={consulta.refetch} />
  const curso = consulta.data
  const gestion = usuario?.rol === 'ADMIN' || usuario?.rol === 'INSTRUCTOR'
  const puedeAgregar = usuario?.rol === 'INSTRUCTOR' && usuario.id === curso.instructorId
  const sinCupos = curso.cuposDisponibles === 0
  return <div className="mx-auto flex max-w-240 flex-col gap-4 px-4 pt-6 pb-8 wrap-anywhere sm:pt-10">
    <EnlaceVolver to={gestion ? '/cursos' : '/catalogo'}>{gestion ? 'Volver a cursos' : 'Volver al catálogo'}</EnlaceVolver>
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-[22px] font-bold text-ink">{curso.titulo}</h1>
      {gestion && <EtiquetaEstadoCurso estado={curso.estado} />}
    </div>
    <EtiquetasCurso curso={curso} />
    <p className="text-base whitespace-pre-wrap text-muted">{curso.descripcion}</p>
    <dl className="flex flex-col gap-2.5 rounded-xl border border-line bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <DatoCurso termino="Instructor">{curso.instructorNombre}</DatoCurso>
      <DatoCurso termino="Modalidad">{ETIQUETA_MODALIDAD[curso.modalidad]}</DatoCurso>
      <DatoCurso termino="Categoría">{curso.categoria}</DatoCurso>
      <DatoCurso termino="Fechas">{fechasCurso(curso)}</DatoCurso>
      <DatoCurso termino="Horas">{curso.horasLectivas} horas lectivas</DatoCurso>
      <DatoCurso termino="Costo">{costoCurso(curso.costo)}</DatoCurso>
      <DatoCurso termino="Cupos" alerta={sinCupos}>{cuposCurso(curso)}</DatoCurso>
      {gestion && <>
        <DatoCurso termino="Certificado">{CERTIFICADOS_CURSO[curso.tipoCertificado]}</DatoCurso>
        <DatoCurso termino="Nota mínima">{curso.notaMinima}</DatoCurso>
      </>}
    </dl>
    {/* 2.2 · Sesiones del curso y requisito para la constancia (SCRUM-171) */}
    {curso.sesiones.some(s => s.estado === 'PROGRAMADA') && <section aria-labelledby="titulo-sesiones" className="flex flex-col gap-2.5">
      <h2 id="titulo-sesiones" className="font-serif text-lg font-bold text-ink">Sesiones</h2>
      <ol className="divide-y divide-line rounded-xl border border-line bg-white px-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
        {curso.sesiones.filter(s => s.estado === 'PROGRAMADA').map((s, i) => <li key={s.id} className="flex flex-col gap-0.5 py-3">
          <p className="text-sm font-medium text-ink">Sesión {i + 1} · {fechaCorta(s.fecha)} {s.fecha.slice(0, 4)}</p>
          <p className="text-[13px] text-muted">{rangoHorario(s.horaInicio, s.horaFin)} · {s.lugar}</p>
        </li>)}
      </ol>
    </section>}
    {curso.estado !== 'BORRADOR' && <div className="flex flex-col gap-0.5 rounded-lg border border-brand bg-brand-soft px-4 py-3 text-sm text-brand">
      <p className="font-semibold">Requisito para la {curso.tipoCertificado === 'APROBACION' ? 'certificación' : 'constancia'}</p>
      <p>Asistir al menos al {curso.requisitoAsistencia} % de las sesiones.</p>
    </div>}
    {usuario?.rol === 'ADMIN' && <div className="flex flex-wrap gap-3">
      <Link to={`/admin/cursos/${curso.id}/editar`} className="inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-semibold text-ink-2 ring-1 ring-line-2 ring-inset hover:bg-surface-2">Editar curso</Link>
      {curso.estado === 'BORRADOR' && <Boton cargando={publicar.isPending} onClick={() => publicar.mutate()}>Publicar en catálogo</Boton>}
    </div>}
    {usuario?.rol === 'PARTICIPANTE' && curso.estado === 'PUBLICADO' && <div className="flex flex-col gap-3">
      {/* 2.2a: sin cupos se avisa y el botón queda deshabilitado */}
      {sinCupos && !curso.inscrito && <Alerta tipo="error">Este curso no tiene cupos disponibles. No es posible inscribirse.</Alerta>}
      {inscripcion.isSuccess && (inscripcion.data.estado === 'PENDIENTE_PAGO'
        ? <Alerta tipo="advertencia" titulo="Inscripción pendiente de pago">Tu vacante quedó reservada. Podrás pagar cuando se habilite el pago en línea; mientras tanto, el curso aparece en Mis cursos.</Alerta>
        : <Alerta tipo="exito">Inscripción registrada. Puedes ver el curso en Mis cursos.</Alerta>)}
      {inscripcion.isError && <Alerta tipo="error">{mensajeDeError(inscripcion.error, 'No pudimos registrar tu inscripción.')}</Alerta>}
      <Boton className="h-12 w-full text-base disabled:bg-surface-3 disabled:text-muted" disabled={curso.inscrito || sinCupos} cargando={inscripcion.isPending} onClick={() => inscripcion.mutate()}>{curso.inscrito ? 'Ya estás inscrito(a)' : sinCupos ? 'Sin cupos' : 'Inscribirme'}</Boton>
      {curso.costo > 0 && !curso.inscrito && !sinCupos && <p className="text-sm text-muted">La inscripción queda pendiente de pago hasta que se habilite el pago en línea.</p>}
    </div>}
    {publicar.isError && <Alerta tipo="error">{mensajeDeError(publicar.error, 'No pudimos publicar el curso.')}</Alerta>}
    <h2 className="mt-4 font-serif text-xl font-bold text-ink">Módulos y material</h2>
    <ol className="space-y-4">{curso.modulos.map(modulo => <Modulo key={modulo.id} cursoId={id} modulo={modulo} puedeAgregar={puedeAgregar} />)}</ol>
  </div>
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
      const archivo = await cursos.descargar(cursoId, modulo.id, materialId)
      const url = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')
      enlace.href = url; enlace.download = 'material.pdf'; enlace.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { cambiarError('No pudimos descargar el PDF. Revisa tu conexión e intenta de nuevo.') }
    finally { cambiarDescargando(false) }
  }
  return <li className="min-w-0 space-y-3 rounded-xl border border-line bg-white p-4">
    <h3 className="text-lg font-semibold">{modulo.orden}. {modulo.titulo}</h3>
    {modulo.materiales.length === 0 ? <p className="text-sm text-muted">Aún no hay material en este módulo.</p> : <ul className="space-y-2">{modulo.materiales.map(material => <li key={material.id}>
      {material.tipo === 'PDF' ? <button disabled={descargando} className="text-left text-brand underline" onClick={() => void descargar(material.id)}>Descargar PDF: {material.titulo}</button> : <a className="text-brand underline" href={material.url!} target="_blank" rel="noopener noreferrer">{material.tipo === 'VIDEO' ? 'Video' : 'Enlace'}: {material.titulo} <span className="sr-only">(abre otra pestaña)</span></a>}
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
