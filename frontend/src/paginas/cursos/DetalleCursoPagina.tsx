import { FechasCurso } from './CursosPagina'
import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { mensajeDeError } from '@/lib/api'
import { cursos, type MaterialEntrada, type ModuloCurso } from '@/servicios/cursos'

function leerPdf(archivo: File): Promise<string> {
  if (archivo.size > 5242880) return Promise.reject(new Error('El PDF no puede superar 5 MB.'))
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result).split(',')[1] ?? '')
    lector.onerror = () => reject(new Error('No pudimos leer el PDF. Selecciónalo de nuevo.'))
    lector.readAsDataURL(archivo)
  })
}

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
  return <div className="mx-auto max-w-240 space-y-5 px-4 py-6 wrap-anywhere">
    <EnlaceVolver to={gestion ? '/cursos' : '/catalogo'}>{gestion ? 'Mis cursos' : 'Catálogo'}</EnlaceVolver>
    <header className="space-y-2 rounded-xl border border-line bg-white p-5">
      <p className="font-semibold text-brand">{curso.estado === 'BORRADOR' ? 'Borrador' : 'Publicado'}</p>
      <h1 className="text-2xl font-semibold">{curso.titulo}</h1>
      <p className="whitespace-pre-wrap">{curso.descripcion}</p>
      <dl className="grid gap-3 py-3 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Instructor</dt><dd>{curso.instructorNombre}</dd></div>
        <div><dt className="font-semibold">Horas lectivas</dt><dd>{curso.horasLectivas}</dd></div>
        <div><dt className="font-semibold">Modalidad</dt><dd>{{ PRESENCIAL: 'Presencial', VIRTUAL: 'Virtual', HIBRIDA: 'Híbrida' }[curso.modalidad]}</dd></div>
        <div><dt className="font-semibold">Costo</dt><dd>S/ {curso.costo.toFixed(2)}</dd></div>
        <div><dt className="font-semibold">Cupos disponibles</dt><dd>{curso.cuposDisponibles === 0 ? 'Sin cupos' : curso.cuposDisponibles}</dd></div>
        <div><dt className="font-semibold">Categoría</dt><dd>{curso.categoria}</dd></div>
        <div><dt className="font-semibold">Fechas</dt><dd><FechasCurso curso={curso} /></dd></div>
        <div><dt className="font-semibold">Certificado</dt><dd>{curso.tipoCertificado === 'APROBACION' ? 'Aprobación' : 'Participación'}</dd></div>
        <div><dt className="font-semibold">Nota mínima</dt><dd>{curso.notaMinima}</dd></div>
      </dl>
      {usuario?.rol === 'ADMIN' && curso.estado === 'BORRADOR' && <Boton cargando={publicar.isPending} onClick={() => publicar.mutate()}>Publicar en catálogo</Boton>}
      {usuario?.rol === 'PARTICIPANTE' && curso.estado === 'PUBLICADO' && <div className="space-y-2">
        <Boton disabled={curso.inscrito || curso.cuposDisponibles === 0} cargando={inscripcion.isPending} onClick={() => inscripcion.mutate()}>{curso.inscrito ? 'Ya estás inscrito(a)' : curso.cuposDisponibles === 0 ? 'Sin cupos' : 'Inscribirme'}</Boton>
        {curso.costo > 0 && !curso.inscrito && <p className="text-sm text-muted">La inscripción no realiza un cobro.</p>}
        {inscripcion.isSuccess && <p role="status" className="text-success">Inscripción registrada. Puedes consultar el curso en Mi historial.</p>}
        {inscripcion.isError && <p role="alert" className="text-danger">{mensajeDeError(inscripcion.error, 'No pudimos registrar tu inscripción.')}</p>}
      </div>}
      {publicar.isError && <p role="alert" className="text-danger">{mensajeDeError(publicar.error, 'No pudimos publicar el curso.')}</p>}
    </header>
    <h2 className="text-xl font-semibold">Módulos y material</h2>
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
        {tipo === 'PDF' ? <Campo etiqueta="Archivo PDF" obligatorio className="sm:col-span-2"><Entrada className="h-auto min-h-11 py-2" name="archivo" type="file" accept="application/pdf,.pdf" required /></Campo> : <Campo etiqueta="URL HTTPS" obligatorio className="sm:col-span-2"><Entrada name="url" type="url" pattern="https://.*" maxLength={2048} required placeholder="https://…" /></Campo>}
        <Boton className="justify-self-start" type="submit" cargando={ocupado}>Guardar material</Boton>
      </fieldset>
    </form>}
    {error && <p role="alert" className="text-danger">{error}</p>}
  </li>
}
