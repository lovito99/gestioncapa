import { categoriasCatalogo } from '@/servicios/cursos'
import { crearCursosDemo } from './cursosDemo'
import { http, HttpResponse } from 'msw'
import { usuarios, clases, asistencias, participantes, inscripciones } from './datos'
import { emitirCertificado, certificadoDe } from './certificados'
import type { DetalleCurso, MaterialCurso, SesionCurso, FilaCierre } from '@/servicios/cursos'
import { z } from 'zod'

const API = import.meta.env.VITE_API_URL ?? '/api'
const demo = crearCursosDemo()
export const cursosSimulados: DetalleCurso[] = demo.cursos.map(c => ({ ...c, requisitoAsistencia: 80, sesiones: [] }))
// «Didáctica y evaluación» reproduce el ejemplo del Figma (2.4): 6 inscritos y 4 sesiones ya dictadas
export const inscripcionesCursosDemo = new Map<string, Set<string>>(cursosSimulados.map(c => [c.id, new Set(c.titulo.includes('Seguridad y primeros') ? ['p-1','p-7'] : c.titulo.includes('Didáctica') ? ['p-1','p-2','p-3','p-4','p-5','p-6'] : c.titulo.includes('cupos agotados') ? ['p-7'] : [])]))

const diaRelativo = (dias: number) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10)
const didactica = cursosSimulados.find(c => c.titulo.includes('Didáctica'))!
const sesionDemo = (n: number, dias: number, lugar: string): SesionCurso =>
  ({ id: `s-d-${n}`, nombre: `Sesión ${n}`, fecha: diaRelativo(dias), horaInicio: '08:00', horaFin: '14:00', lugar, estado: 'PROGRAMADA' })
/** Sesiones demo con su asistencia (ids de agremiados presentes) */
const sesionesDemo = new Map<string, { sesion: SesionCurso; presentes: string[] }[]>([[didactica.id, [
  { sesion: sesionDemo(1, -21, 'Auditorio principal, piso 2'), presentes: ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6'] },
  { sesion: sesionDemo(2, -14, 'Auditorio principal, piso 2'), presentes: ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6'] },
  { sesion: sesionDemo(3, -7, 'Sala de capacitación B'), presentes: ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'] },
  { sesion: sesionDemo(4, -1, 'Auditorio principal, piso 2'), presentes: ['p-1', 'p-2', 'p-3', 'p-5'] },
]]])

/** Sesiones del curso = clases con ese `cursoId` (más las demo), en orden de fecha. */
function sesionesDe(cursoId: string): SesionCurso[] {
  const vinculadas = clases.filter(c => (c.curso?.id ?? c.cursoId) === cursoId)
    .map(c => ({ id: c.id, nombre: c.nombre, fecha: c.fecha, horaInicio: c.horaInicio, horaFin: c.horaFin, lugar: c.lugar, estado: c.estado }))
  return [...(sesionesDemo.get(cursoId) ?? []).map(s => s.sesion), ...vinculadas]
    .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio))
}

/** Asistencia de un agremiado sobre las sesiones no canceladas del curso. */
function filaCierre(curso: DetalleCurso, agremiadoId: string): FilaCierre {
  const demo = sesionesDemo.get(curso.id) ?? []
  const vinculadas = clases.filter(c => (c.curso?.id ?? c.cursoId) === curso.id && c.estado === 'PROGRAMADA')
  const sesiones = demo.length + vinculadas.length
  const presentes = demo.filter(s => s.presentes.includes(agremiadoId)).length + vinculadas.filter(c => asistencias[c.id]?.[agremiadoId]).length
  const porcentaje = sesiones ? Math.round((presentes / sesiones) * 100) : 0
  const nombre = participantes.find(p => p.id === agremiadoId)?.nombre ?? usuarios.find(u => u.id === agremiadoId)?.nombre ?? agremiadoId
  return { agremiado: { id: agremiadoId, nombre }, presentes, sesiones, porcentaje, cumple: sesiones > 0 && porcentaje >= curso.requisitoAsistencia }
}

function disponibilidad(curso: DetalleCurso, usuarioId?: string) {
  const inscritos = inscripcionesCursosDemo.get(curso.id) ?? new Set<string>()
  return { ...curso, sesiones: sesionesDe(curso.id), cuposDisponibles: Math.max(0, curso.cupos - inscritos.size), inscrito: !!usuarioId && inscritos.has(usuarioId) }
}
const archivos = demo.archivos
let secuencia = demo.siguienteId
const nuevoId = () => String(secuencia++)
const error = (status: number, message: string, code?: string) => HttpResponse.json({ code: code ?? (status === 422 ? 'VALIDACION' : status === 401 ? 'NO_AUTENTICADO' : status === 403 ? 'SIN_PERMISO' : 'CURSO_NO_EXISTE'), message }, { status })
function acceso(request: Request, roles?: string[]) {
  const usuario = usuarios.find(u => request.headers.get('Authorization') === `Bearer demo-${u.id}`)
  if (!usuario) return { fallo: error(401, 'Tu sesión expiró. Vuelve a iniciar sesión.') }
  if (roles && !roles.includes(usuario.rol)) return { fallo: error(403, 'No tienes permiso para realizar esta acción.') }
  return { usuario }
}
function detalle(request: Request, id: string) {
  const auth = acceso(request)
  if (auth.fallo) return { fallo: auth.fallo }
  const curso = cursosSimulados.find(c => c.id === id)
  if (!curso) return { fallo: error(404, 'El curso no existe.') }
  if (curso.estado === 'BORRADOR' && auth.usuario!.rol !== 'ADMIN' && curso.instructorId !== auth.usuario!.id) return { fallo: error(403, 'No tienes permiso para acceder a este curso.') }
  return { curso, usuario: auth.usuario! }
}
export const sesionesDeCurso = sesionesDe
const titulo = z.string().trim().min(1).max(160)
const fechaOpcional = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T00:00:00Z`); return v.slice(0,4) !== '0000' && Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v }).nullable().default(null)
const esquema = z.object({
  categoria: z.string().trim().min(1).max(80).default('General'),
  fechaInicio: fechaOpcional, fechaFin: fechaOpcional,
  titulo, descripcion: z.string().trim().max(5000).default(''), instructorId: z.string(),
  horasLectivas: z.number().positive().max(10000), modalidad: z.enum(['PRESENCIAL', 'VIRTUAL', 'HIBRIDA']),
  costo: z.number().min(0).max(9999999999.99).multipleOf(0.01), cupos: z.number().int().min(1).max(1000000),
  tipoCertificado: z.enum(['PARTICIPACION', 'APROBACION']), notaMinima: z.number().min(0).max(20).default(14),
  modulos: z.array(z.object({ titulo }).strict()).min(1).max(100),
}).strict().refine(d => (!d.fechaInicio && !d.fechaFin) || (!!d.fechaInicio && !!d.fechaFin && d.fechaFin >= d.fechaInicio))
// Al editar, cada módulo puede traer el id del que ya existe para conservar su material
const esquemaEdicion = esquema.safeExtend({ modulos: z.array(z.object({ id: z.string().optional(), titulo }).strict()).min(1).max(100) })
function resumenPublico(curso: DetalleCurso) {
  const { id, titulo, descripcion, instructorNombre, horasLectivas, modalidad, costo, cupos,
    cuposDisponibles, categoria, fechaInicio, fechaFin } = curso
  return { id, titulo, descripcion, instructorNombre, horasLectivas, modalidad, costo, cupos,
    cuposDisponibles, categoria, fechaInicio, fechaFin }
}
function catalogoPaginado(request: Request, publico = false, usuarioId = '') {
  const consulta = z.object({ buscar: z.string().trim().max(160).default(''), categoria: z.string().min(1).max(80).optional(), modalidad: z.enum(['PRESENCIAL','VIRTUAL','HIBRIDA']).optional(), pagina: z.coerce.number().int().min(1).max(100000).default(1), tamanoPagina: z.coerce.number().int().min(1).max(50).default(6) }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!consulta.success) return error(422, 'Revisa los filtros y la página solicitada.')
  const { buscar, categoria, modalidad, pagina, tamanoPagina } = consulta.data
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const publicados = cursosSimulados.filter(c => c.estado === 'PUBLICADO' && (!publico || !c.fechaFin || c.fechaFin >= hoy))
  const filtrados = publicados.filter(c => normalizar(c.titulo).includes(normalizar(buscar)) && (!categoria || c.categoria === categoria) && (!modalidad || c.modalidad === modalidad)).sort((a,b) => Number(b.id)-Number(a.id))
  return HttpResponse.json({ items: filtrados.slice((pagina-1)*tamanoPagina,pagina*tamanoPagina).map(c => publico ? resumenPublico(disponibilidad(c, '')) : disponibilidad(c, usuarioId)), total: filtrados.length, pagina, tamanoPagina, totalPaginas: Math.ceil(filtrados.length/tamanoPagina), categorias: [...categoriasCatalogo] })
}

export const handlersCursos = [
  http.get(`${API}/cursos/instructores`, ({ request }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    return HttpResponse.json(usuarios.filter(u => u.rol === 'INSTRUCTOR').map(u => ({ id: u.id, nombre: u.nombre })))
  }),
  http.get(`${API}/cursos`, ({ request }) => {
    const auth = acceso(request, ['ADMIN', 'COORDINADOR', 'INSTRUCTOR']); if (auth.fallo) return auth.fallo
    return HttpResponse.json(cursosSimulados.filter(c => auth.usuario!.rol !== 'INSTRUCTOR' || c.instructorId === auth.usuario!.id).map(c => disponibilidad(c, auth.usuario!.id)))
  }),
  http.get(`${API}/catalogo/cursos`, ({ request }) => {
    const auth = acceso(request); if (auth.fallo) return auth.fallo
    return HttpResponse.json(cursosSimulados.filter(c => c.estado === 'PUBLICADO').map(c => disponibilidad(c, auth.usuario!.id)))
  }),
  http.get(`${API}/publico/cursos`, ({ request }) => catalogoPaginado(request, true)),
  http.get(`${API}/catalogo/cursos/pagina`, ({ request }) => {
    const auth = acceso(request); if (auth.fallo) return auth.fallo
    return catalogoPaginado(request, false, auth.usuario!.id)
  }),
  http.post(`${API}/cursos/:id/inscribirme`, ({ request, params }) => {
    const auth = acceso(request, ['PARTICIPANTE']); if (auth.fallo) return auth.fallo
    const curso = cursosSimulados.find(c => c.id === params.id)
    if (!curso) return error(404, 'El curso no existe.')
    if (curso.estado !== 'PUBLICADO') return error(409, 'El curso no está publicado.', 'CURSO_NO_PUBLICADO')
    const inscritos = inscripcionesCursosDemo.get(curso.id) ?? new Set<string>()
    const yaInscrito = inscritos.has(auth.usuario!.id)
    if (!yaInscrito && inscritos.size >= curso.cupos) return error(409, 'El curso está sin cupos. Elige otra capacitación.', 'SIN_CUPOS')
    inscritos.add(auth.usuario!.id); inscripcionesCursosDemo.set(curso.id, inscritos)
    const estado = yaInscrito && auth.usuario!.id === 'p-1' && curso.titulo === 'Demo · Seguridad y primeros auxilios' ? 'TERMINADO' : curso.costo > 0 ? 'PENDIENTE_PAGO' : 'EN_CURSO'
    return HttpResponse.json({ cursoId: curso.id, estado, yaInscrito }, { status: yaInscrito ? 200 : 201 })
  }),
  http.post(`${API}/cursos`, async ({ request }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    const datos = esquema.safeParse(await request.json())
    if (!datos.success) return error(422, 'Completa los campos obligatorios: horas mayores que cero, certificado y al menos un módulo.')
    const instructor = usuarios.find(u => u.id === datos.data.instructorId && u.rol === 'INSTRUCTOR')
    if (!instructor) return error(422, 'Selecciona un instructor válido.')
    const curso: DetalleCurso = { ...datos.data, cuposDisponibles: datos.data.cupos, id: nuevoId(), instructorNombre: instructor.nombre, estado: 'BORRADOR', requisitoAsistencia: 80, sesiones: [],
      modulos: datos.data.modulos.map((m, i) => ({ ...m, id: nuevoId(), orden: i + 1, materiales: [] })) }
    cursosSimulados.push(curso)
    return HttpResponse.json(curso, { status: 201 })
  }),
  http.put(`${API}/cursos/:id`, async ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const datos = esquemaEdicion.safeParse(await request.json())
    if (!datos.success) return error(422, 'Completa los campos obligatorios: horas mayores que cero, certificado y al menos un módulo.')
    const instructor = usuarios.find(u => u.id === datos.data.instructorId && u.rol === 'INSTRUCTOR')
    if (!instructor) return error(422, 'Selecciona un instructor válido.')
    const curso = auth.curso!
    const inscritos = inscripcionesCursosDemo.get(curso.id)?.size ?? 0
    if (datos.data.cupos < inscritos) return error(422, `Ya hay ${inscritos} inscritos; los cupos no pueden ser menos.`)
    const anteriores = new Map(curso.modulos.map(m => [m.id, m]))
    Object.assign(curso, { ...datos.data, instructorNombre: instructor.nombre,
      modulos: datos.data.modulos.map((m, i) => ({ id: m.id && anteriores.has(m.id) ? m.id : nuevoId(), titulo: m.titulo, orden: i + 1, materiales: (m.id && anteriores.get(m.id)?.materiales) || [] })) })
    return HttpResponse.json(disponibilidad(curso, auth.usuario!.id))
  }),
  http.delete(`${API}/cursos/:id/modulos/:moduloId/materiales/:materialId`, ({ request, params }) => {
    const rol = acceso(request, ['ADMIN', 'INSTRUCTOR']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    if (auth.usuario!.rol === 'INSTRUCTOR' && auth.curso!.instructorId !== auth.usuario!.id) return error(403, 'Solo el instructor asignado puede quitar material.')
    const modulo = auth.curso!.modulos.find(m => m.id === params.moduloId)
    const indice = modulo?.materiales.findIndex(m => m.id === params.materialId) ?? -1
    if (!modulo || indice < 0) return error(404, 'El material no existe en este módulo.')
    const [quitado] = modulo.materiales.splice(indice, 1)
    archivos.delete(quitado!.id)
    return new HttpResponse(null, { status: 204 })
  }),
  // ---------- Cierre del curso y certificados (SCRUM-171) ----------
  http.get(`${API}/cursos/:id/cierre`, ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const curso = auth.curso!
    if (curso.estado === 'BORRADOR') return error(409, 'Publica el curso antes de cerrarlo.', 'CURSO_NO_PUBLICADO')
    if (curso.estado === 'CERRADO') return error(409, 'El curso ya está cerrado y sus certificados fueron emitidos.', 'CURSO_CERRADO')
    const filas = [...(inscripcionesCursosDemo.get(curso.id) ?? [])].map(id => filaCierre(curso, id))
    return HttpResponse.json({ curso: disponibilidad(curso), requisitoAsistencia: curso.requisitoAsistencia, filas })
  }),
  http.post(`${API}/cursos/:id/cerrar`, async ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const curso = auth.curso!
    if (curso.estado === 'CERRADO') return error(409, 'El curso ya está cerrado.', 'CURSO_CERRADO')
    if (curso.estado === 'BORRADOR') return error(409, 'Publica el curso antes de cerrarlo.', 'CURSO_NO_PUBLICADO')
    const { excepciones = [] } = await request.json() as { excepciones?: { agremiadoId: string; motivo: string }[] }
    const filas = new Map([...(inscripcionesCursosDemo.get(curso.id) ?? [])].map(id => [id, filaCierre(curso, id)]))
    for (const excepcion of excepciones) {
      const fila = filas.get(excepcion.agremiadoId)
      if (!fila) return error(422, 'La excepción es para alguien que no está inscrito en el curso.')
      if (fila.cumple) return error(422, `${fila.agremiado.nombre} ya cumple el requisito; no necesita excepción.`)
      if (!excepcion.motivo?.trim()) return error(422, 'Ingresa el motivo de la excepción.')
    }
    const motivos = new Map(excepciones.map(e => [e.agremiadoId, e.motivo.trim()]))
    let emitidos = 0
    for (const fila of filas.values()) {
      if (!fila.cumple && !motivos.has(fila.agremiado.id)) continue
      emitirCertificado({
        cursoId: curso.id, agremiadoId: fila.agremiado.id, porExcepcion: !fila.cumple, motivo: motivos.get(fila.agremiado.id),
        tipo: curso.tipoCertificado, nombre: fila.agremiado.nombre, dniEnmascarado: null, curso: curso.titulo, modalidad: curso.modalidad,
        horasLectivas: curso.horasLectivas, fechaInicio: curso.fechaInicio ?? '', fechaFin: curso.fechaFin ?? '', instructorNombre: curso.instructorNombre,
      })
      emitidos++
    }
    curso.estado = 'CERRADO'
    return HttpResponse.json({ emitidos })
  }),
  http.get(`${API}/cursos/:id/certificados`, ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const curso = auth.curso!
    if (curso.estado !== 'CERRADO') return error(409, 'Los certificados se emiten al cerrar el curso.', 'CURSO_NO_CERRADO')
    const filas = [...(inscripcionesCursosDemo.get(curso.id) ?? [])].map(id => {
      const fila = filaCierre(curso, id)
      const certificado = certificadoDe(curso.id, id)
      return {
        agremiado: fila.agremiado, cumple: fila.cumple, porExcepcion: !!certificado?.porExcepcion,
        certificado: certificado ? { codigo: certificado.codigo, estado: certificado.estado, nombre: certificado.nombre } : null,
      }
    })
    return HttpResponse.json({ curso: disponibilidad(curso), filas })
  }),
  http.get(`${API}/cursos/:id`, ({ request, params }) => {
    const auth = detalle(request, String(params.id)); return auth.fallo ?? HttpResponse.json(disponibilidad(auth.curso!, auth.usuario!.id))
  }),
  http.post(`${API}/cursos/:id/sesiones`, async ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const curso = auth.curso!
    if (curso.estado === 'CERRADO') return error(409, 'El curso ya está cerrado.', 'CURSO_CERRADO')
    if (curso.modalidad === 'VIRTUAL') return error(409, 'Las sesiones presenciales requieren un curso presencial o híbrido.', 'MODALIDAD_NO_PRESENCIAL')
    const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
      const d = new Date(`${v}T00:00:00Z`)
      return !v.startsWith('0000-') && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v
    })
    const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    const datos = z.object({ nombre: titulo, fecha, horaInicio: hora, horaFin: hora, lugar: titulo })
      .refine(v => v.horaFin > v.horaInicio).safeParse(await request.json())
    if (!datos.success) return error(422, 'Completa los datos de la sesión con una fecha y un horario válidos.')
    if (clases.some(c => c.estado === 'PROGRAMADA' && c.instructor.id === curso.instructorId && c.fecha === datos.data.fecha && c.horaInicio < datos.data.horaFin && datos.data.horaInicio < c.horaFin)) {
      return error(409, 'El instructor ya tiene una clase en ese horario. Elige otro horario.', 'CONFLICTO_HORARIO')
    }
    const nueva = { ...datos.data, id: `sesion-${nuevoId()}`, cursoId: curso.id, curso: { id: curso.id, titulo: curso.titulo }, estado: 'PROGRAMADA' as const, instructor: { id: curso.instructorId, nombre: curso.instructorNombre } }
    clases.push(nueva); inscripciones[nueva.id] = []
    return HttpResponse.json(nueva, { status: 201 })
  }),
  http.get(`${API}/cursos/:id/mi-asistencia`, ({ request, params }) => {
    const rol = acceso(request, ['PARTICIPANTE']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const sesiones = sesionesDe(String(params.id)).filter(c => c.estado === 'PROGRAMADA')
    const presentesDemo = (sesionesDemo.get(String(params.id)) ?? []).filter(s => s.sesion.estado === 'PROGRAMADA' && s.presentes.includes(auth.usuario!.id)).length
    const presentes = presentesDemo + sesiones.filter(c => asistencias[c.id]?.[auth.usuario!.id]).length
    const requisitoAsistencia = auth.curso!.requisitoAsistencia
    return HttpResponse.json({ totalSesiones: sesiones.length, presentes, porcentaje: sesiones.length ? presentes * 100 / sesiones.length : 0,
      requisitoAsistencia, cumpleAsistencia: sesiones.length > 0 && presentes * 100 >= sesiones.length * requisitoAsistencia })
  }),
  http.post(`${API}/cursos/:id/publicar`, ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    auth.curso!.estado = 'PUBLICADO'; return HttpResponse.json(disponibilidad(auth.curso!, auth.usuario!.id))
  }),
  http.post(`${API}/cursos/:id/modulos/:moduloId/materiales`, async ({ request, params }) => {
    // El Figma (2.2) también deja al administrador agregar material al editar el curso
    const rol = acceso(request, ['ADMIN', 'INSTRUCTOR']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    if (auth.usuario!.rol === 'INSTRUCTOR' && auth.curso!.instructorId !== auth.usuario!.id) return error(403, 'Solo el instructor asignado puede agregar material.')
    const modulo = auth.curso!.modulos.find(m => m.id === params.moduloId)
    if (!modulo) return error(404, 'El módulo no pertenece a este curso.')
    const entrada = await request.json() as Record<string, unknown>
    if (!titulo.safeParse(entrada.titulo).success || !['PDF', 'ENLACE', 'VIDEO'].includes(String(entrada.tipo))) return error(422, 'Revisa el título y el tipo de material.')
    let archivo: Uint8Array | undefined
    let url: string | null = null
    if (entrada.tipo === 'PDF') {
      try {
        const base64 = String(entrada.contenidoBase64 ?? '')
        if (base64.length > 6990508) return error(422, 'El PDF no puede superar 5 MB.')
        const contenido = atob(base64)
        if (!contenido.startsWith('%PDF-') || contenido.length > 5242880) return error(422, 'Selecciona un PDF válido de hasta 5 MB.')
        archivo = Uint8Array.from(contenido, letra => letra.charCodeAt(0))
      } catch { return error(422, 'El PDF no es válido.') }
    } else {
      try { const enlace = new URL(String(entrada.url)); if (enlace.protocol !== 'https:' || enlace.username || enlace.password) throw new Error(); url = String(entrada.url) }
      catch { return error(422, 'Usa una URL HTTPS válida sin credenciales.') }
    }
    const material: MaterialCurso = { id: nuevoId(), titulo: String(entrada.titulo).trim(), tipo: entrada.tipo as MaterialCurso['tipo'], url }
    modulo.materiales.push(material)
    if (archivo) archivos.set(material.id, archivo)
    return HttpResponse.json(material, { status: 201 })
  }),
  http.get(`${API}/cursos/:id/modulos/:moduloId/materiales/:materialId/archivo`, ({ request, params }) => {
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const material = auth.curso!.modulos.find(m => m.id === params.moduloId)?.materiales.find(m => m.id === params.materialId && m.tipo === 'PDF')
    const archivo = material && archivos.get(material.id)
    if (!archivo) return error(404, 'El PDF no existe en este módulo.')
    return new HttpResponse(archivo as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="material.pdf"' } })
  }),
]
