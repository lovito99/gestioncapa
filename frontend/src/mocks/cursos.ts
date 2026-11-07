import { crearCursosDemo } from './cursosDemo'
import { http, HttpResponse } from 'msw'
import { usuarios, clases, inscripciones, asistencias } from './datos'
import type { DetalleCurso, MaterialCurso } from '@/servicios/cursos'
import { z } from 'zod'

const API = import.meta.env.VITE_API_URL ?? '/api'
const demo = crearCursosDemo()
const almacen: DetalleCurso[] = demo.cursos
const archivos = demo.archivos
let secuencia = demo.siguienteId
const nuevoId = () => String(secuencia++)
const error = (status: number, message: string) => HttpResponse.json({ code: status === 422 ? 'VALIDACION' : status === 401 ? 'NO_AUTENTICADO' : status === 403 ? 'SIN_PERMISO' : 'CURSO_NO_EXISTE', message }, { status })
function acceso(request: Request, roles?: string[]) {
  const usuario = usuarios.find(u => request.headers.get('Authorization') === `Bearer demo-${u.id}`)
  if (!usuario) return { fallo: error(401, 'Tu sesión expiró. Vuelve a iniciar sesión.') }
  if (roles && !roles.includes(usuario.rol)) return { fallo: error(403, 'No tienes permiso para realizar esta acción.') }
  return { usuario }
}
function detalle(request: Request, id: string) {
  const auth = acceso(request)
  if (auth.fallo) return { fallo: auth.fallo }
  const curso = almacen.find(c => c.id === id)
  if (!curso) return { fallo: error(404, 'El curso no existe.') }
  if (curso.estado === 'BORRADOR' && auth.usuario!.rol !== 'ADMIN' && curso.instructorId !== auth.usuario!.id) return { fallo: error(403, 'No tienes permiso para acceder a este curso.') }
  return { curso, usuario: auth.usuario! }
}
export const sesionesDeCurso = (id: string) => clases.filter(c => c.cursoId === id).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio))
const titulo = z.string().trim().min(1).max(160)
const esquema = z.object({
  titulo, descripcion: z.string().trim().max(5000).default(''), instructorId: z.string(),
  horasLectivas: z.number().positive().max(10000), modalidad: z.enum(['PRESENCIAL', 'VIRTUAL', 'HIBRIDA']),
  costo: z.number().min(0).max(9999999999.99).multipleOf(0.01), cupos: z.number().int().min(1).max(1000000),
  tipoCertificado: z.enum(['PARTICIPACION', 'APROBACION']), notaMinima: z.number().min(0).max(20).default(14),
  modulos: z.array(z.object({ titulo }).strict()).min(1).max(100),
}).strict()
export const handlersCursos = [
  http.get(`${API}/cursos/instructores`, ({ request }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    return HttpResponse.json(usuarios.filter(u => u.rol === 'INSTRUCTOR').map(u => ({ id: u.id, nombre: u.nombre })))
  }),
  http.get(`${API}/cursos`, ({ request }) => {
    const auth = acceso(request, ['ADMIN', 'INSTRUCTOR']); if (auth.fallo) return auth.fallo
    return HttpResponse.json(almacen.filter(c => auth.usuario!.rol === 'ADMIN' || c.instructorId === auth.usuario!.id))
  }),
  http.get(`${API}/catalogo/cursos`, ({ request }) => {
    const auth = acceso(request); if (auth.fallo) return auth.fallo
    return HttpResponse.json(almacen.filter(c => c.estado === 'PUBLICADO'))
  }),
  http.post(`${API}/cursos`, async ({ request }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    const datos = esquema.safeParse(await request.json())
    if (!datos.success) return error(422, 'Completa los campos obligatorios: horas mayores que cero, certificado y al menos un módulo.')
    const instructor = usuarios.find(u => u.id === datos.data.instructorId && u.rol === 'INSTRUCTOR')
    if (!instructor) return error(422, 'Selecciona un instructor válido.')
    const curso: DetalleCurso = { ...datos.data, id: nuevoId(), instructorNombre: instructor.nombre, estado: 'BORRADOR', sesiones: [],
      modulos: datos.data.modulos.map((m, i) => ({ ...m, id: nuevoId(), orden: i + 1, materiales: [] })) }
    almacen.push(curso)
    return HttpResponse.json(curso, { status: 201 })
  }),
  http.get(`${API}/cursos/:id`, ({ request, params }) => {
    const auth = detalle(request, String(params.id)); return auth.fallo ?? HttpResponse.json({ ...auth.curso, sesiones: sesionesDeCurso(String(params.id)) })
  }),
  http.post(`${API}/cursos/:id/sesiones`, async ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const curso = auth.curso!
    if (curso.modalidad === 'VIRTUAL') return HttpResponse.json({ code: 'MODALIDAD_NO_PRESENCIAL', message: 'Las sesiones presenciales requieren un curso presencial o híbrido.' }, { status: 409 })
    const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
      const d = new Date(`${v}T00:00:00Z`)
      return !v.startsWith('0000-') && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v
    })
    const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    const datos = z.object({ nombre: titulo, fecha, horaInicio: hora, horaFin: hora, lugar: titulo })
      .refine(v => v.horaFin > v.horaInicio).safeParse(await request.json())
    if (!datos.success) return error(422, 'Completa los datos de la sesión con una fecha y un horario válidos.')
    if (clases.some(c => c.estado === 'PROGRAMADA' && c.instructor.id === curso.instructorId && c.fecha === datos.data.fecha && c.horaInicio < datos.data.horaFin && datos.data.horaInicio < c.horaFin)) {
      return HttpResponse.json({ code: 'CONFLICTO_HORARIO', message: 'El instructor ya tiene una clase en ese horario. Elige otro horario.' }, { status: 409 })
    }
    const nueva = { ...datos.data, id: `sesion-${nuevoId()}`, cursoId: curso.id, estado: 'PROGRAMADA' as const, instructor: { id: curso.instructorId, nombre: curso.instructorNombre } }
    clases.push(nueva); inscripciones[nueva.id] = []
    return HttpResponse.json(nueva, { status: 201 })
  }),
  http.get(`${API}/cursos/:id/mi-asistencia`, ({ request, params }) => {
    const rol = acceso(request, ['PARTICIPANTE']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const sesiones = sesionesDeCurso(String(params.id)).filter(c => c.estado === 'PROGRAMADA')
    const presentes = sesiones.filter(c => asistencias[c.id]?.[auth.usuario!.id]).length
    return HttpResponse.json({ totalSesiones: sesiones.length, presentes, porcentaje: sesiones.length ? presentes * 100 / sesiones.length : 0,
      requisitoAsistencia: 80, cumpleAsistencia: sesiones.length > 0 && presentes * 100 >= sesiones.length * 80 })
  }),
  http.post(`${API}/cursos/:id/publicar`, ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    auth.curso!.estado = 'PUBLICADO'; return HttpResponse.json(auth.curso)
  }),
  http.post(`${API}/cursos/:id/modulos/:moduloId/materiales`, async ({ request, params }) => {
    const rol = acceso(request, ['INSTRUCTOR']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    if (auth.curso!.instructorId !== auth.usuario!.id) return error(403, 'Solo el instructor asignado puede agregar material.')
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
