import { categoriasCatalogo } from '@/servicios/cursos'
import { crearCursosDemo } from './cursosDemo'
import { http, HttpResponse } from 'msw'
import { usuarios, clases, asistencias, participantes, inscripciones } from './datos'
import { emitirCertificado, certificadoDe } from './certificados'
import { dniPorUsuario, enmascararDni } from './asistenciaPuerta'
import { crearPago, pagoDeInscripcion, sembrarPagosDemo } from './pagos'
import type { DetalleCurso, MaterialCurso, SesionCurso, FilaCierre, MiPrecio, ModalidadCobro } from '@/servicios/cursos'
import { z } from 'zod'
import { modalidadDerivada, modalidadesCurso, modalidadesSesion } from '@/servicios/modalidadCurso'
import { idCursoAulaDemo } from '@/lib/aulaGrabadaDemo'
import { actividadesAulaDemo, avanceAulaDemo, completadasAulaDemo, guardarAvanceAulaDemo, modulosAulaDemo, respuestasAulaDemo, tituloAulaDemo } from './aulaGrabada'
import { pdfTextoDemo } from './pdfTexto'

const API = import.meta.env.VITE_API_URL ?? '/api'
const demo = crearCursosDemo()
// SCRUM-190: los cursos con costo tienen un precio general mayor que el de colegiado
export const cursosSimulados: DetalleCurso[] = demo.cursos.map(c => ({ ...c, requisitoAsistencia: 80, sesiones: [], precioGeneral: c.costo > 0 ? c.costo + 50 : 0, portadaUrl: null }))
/** DNI del padrón de colegiados (SCRUM-191): quien se registra en la demo es docente externo. */
const padronColegiados = new Set(Object.values(dniPorUsuario))
const modalidadCobroDe = (c: Pick<DetalleCurso, 'modalidadCobro' | 'costo'>): ModalidadCobro => c.modalidadCobro ?? (c.costo === 0 ? 'GRATUITO' : 'PREVIO')
// «Didáctica y evaluación» reproduce el ejemplo del Figma (2.4): 6 inscritos y 4 sesiones ya dictadas
export const inscripcionesCursosDemo = new Map<string, Set<string>>(cursosSimulados.map(c => [c.id, new Set(c.titulo.includes('Seguridad y primeros') ? ['p-1','p-7'] : c.titulo.includes('Didáctica') ? ['p-1','p-2','p-3','p-4','p-5','p-6'] : c.titulo.includes('cupos agotados') ? ['p-7'] : [])]))

const diaRelativo = (dias: number) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10)
const didactica = cursosSimulados.find(c => c.titulo.includes('Didáctica'))!
const sesionDemo = (n: number, dias: number, lugar: string): SesionCurso =>
  ({ id: `s-d-${n}`, nombre: `Sesión ${n}`, fecha: diaRelativo(dias), horaInicio: '08:00', horaFin: '14:00', lugar, estado: 'PROGRAMADA', modalidad: 'PRESENCIAL', reunion: null })
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
    .map(c => {
      const modalidad = c.modalidad ?? 'PRESENCIAL'
      // La demo no simula salas: las sesiones con sala aparecen como «se habilita al iniciar».
      const extra = c as Partial<Pick<SesionCurso, 'sede' | 'aula' | 'encargadoId' | 'qrRotatorio' | 'sala'>>
      return { id: c.id, nombre: c.nombre, fecha: c.fecha, horaInicio: c.horaInicio, horaFin: c.horaFin, lugar: c.lugar, estado: c.estado, modalidad,
        sede: extra.sede, aula: extra.aula, encargadoId: extra.encargadoId, qrRotatorio: extra.qrRotatorio, sala: extra.sala,
        reunion: modalidad === 'PRESENCIAL' ? null : { identificador: `demo-${c.id}`, estado: 'programada' } }
    })
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

function disponibilidad(curso: DetalleCurso, usuarioId?: string): DetalleCurso {
  const inscritos = inscripcionesCursosDemo.get(curso.id) ?? new Set<string>()
  const inscrito = !!usuarioId && inscritos.has(usuarioId)
  const pago = inscrito ? pagoDeInscripcion(curso.id, usuarioId!) : undefined
  const guardado = inscrito ? estadosInscripcionDemo.get(`${curso.id}:${usuarioId}`) : undefined
  // Al confirmarse el pago previo, la inscripción pasa a «en curso»
  const estadoInscripcion = inscrito
    ? (guardado === 'PENDIENTE_PAGO' && pago?.estado === 'PAGADO' ? 'EN_CURSO' : guardado) ?? (usuarioId === 'p-1' && curso.titulo === 'Demo · Seguridad y primeros auxilios' ? 'TERMINADO' : 'EN_CURSO')
    : null
  const sesiones = sesionesDe(curso.id)
  // HU-36: `curso.modalidad` guarda la planificada; la respuesta la clasifica por sesiones.
  const modalidad = modalidadDerivada(sesiones.filter(s => s.estado === 'PROGRAMADA').map(s => s.modalidad), curso.modalidad)
  return { ...curso,modalidad,versionCobro:curso.versionCobro??1,estadoInscripcion, sesiones, cuposDisponibles: Math.max(0, curso.cupos - inscritos.size), inscrito, miPrecio: miPrecio(curso, usuarioId),
    miInscripcion: pago ? { intentoId: pago.id, modalidadCobro: modalidadCobroDe(curso), importeCentimos: pago.importeCentimos, moneda: 'PEN', plazoPagoMinutos: curso.plazoPagoMinutos ?? null,
      inscritoEn: new Date().toISOString(), venceEn: pago.venceEn ?? null, pagoId: pago.id, estado: estadoInscripcion ?? 'EN_CURSO', estadoFinanciero: pago.estado === 'PAGADO' ? 'PAGADO' : 'PENDIENTE' } : null,
    accesoContenido: estadoInscripcion === 'PENDIENTE_PAGO' ? false : curso.accesoContenido }
}

/** Precio según el padrón: colegiado con DNI en el padrón; si no, precio general. */
function miPrecio(curso: DetalleCurso, usuarioId?: string): MiPrecio | null {
  if (!usuarioId || usuarios.find(u => u.id === usuarioId)?.rol !== 'AGREMIADO') return null
  const dni = dniPorUsuario[usuarioId]
  const enPadron = !!dni && padronColegiados.has(dni)
  return { tipo: enPadron ? 'COLEGIADO' : 'GENERAL', importe: enPadron ? curso.costo : curso.precioGeneral ?? curso.costo, dniParcial: enmascararDni(dni), enPadron }
}

const archivos = demo.archivos
let secuencia = demo.siguienteId
const nuevoId = () => String(secuencia++)
for (const extra of [
  { titulo: 'Evaluación formativa en el aula', categoria: 'Evaluación', descripcion: 'Estrategias para recoger evidencias de aprendizaje y dar retroalimentación oportuna a tus estudiantes. Incluye ejemplos para inicial, primaria y secundaria.', costo: 60, precioGeneral: 90, modalidadCobro: 'PREVIO' as const, plazoPagoMinutos: 4320, inicio: 7, fin: 28, horas: 24, cupos: 30, modalidad: 'HIBRIDA' as const },
  { titulo: 'Comprensión lectora en primaria', categoria: 'Tecnología educativa', descripcion: 'Estrategias de lectura con recursos digitales para el aula de primaria.', costo: 30, precioGeneral: 50, modalidadCobro: 'CERTIFICADO' as const, plazoPagoMinutos: null, inicio: 19, fin: 33, horas: 16, cupos: 25, modalidad: 'PRESENCIAL' as const },
]) {
  cursosSimulados.push({ id: nuevoId(), titulo: extra.titulo, descripcion: extra.descripcion, instructorId: 'i-1', instructorNombre: 'Carlos Mendoza Ríos', horasLectivas: extra.horas,
    modalidad: extra.modalidad, costo: extra.costo, precioGeneral: extra.precioGeneral, modalidadCobro: extra.modalidadCobro, plazoPagoMinutos: extra.plazoPagoMinutos, versionCobro: 1,
    cupos: extra.cupos, cuposDisponibles: extra.cupos, categoria: extra.categoria, fechaInicio: diaRelativo(extra.inicio), fechaFin: diaRelativo(extra.fin), portadaUrl: null,
    tipoCertificado: 'PARTICIPACION', notaMinima: 14, estado: 'PUBLICADO', requisitoAsistencia: 80, sesiones: [],
    modulos: [{ id: nuevoId(), titulo: 'Módulo 1', orden: 1, materiales: [] }] })
  inscripcionesCursosDemo.set(cursosSimulados.at(-1)!.id, new Set())
}
cursosSimulados.push({
  id: idCursoAulaDemo, titulo: tituloAulaDemo,
  descripcion: 'Aprende a recoger evidencias y a dar retroalimentación concreta. Recorre dos módulos breves a tu ritmo y descarga una constancia de demostración.',
  instructorId: 'i-1', instructorNombre: 'Carlos Mendoza Ríos', horasLectivas: 1, modalidad: 'GRABADO',
  costo: 0, precioGeneral: 0, modalidadCobro: 'GRATUITO', plazoPagoMinutos: null, versionCobro: 1,
  cupos: 100, cuposDisponibles: 100, categoria: 'Educación', fechaInicio: null, fechaFin: null, portadaUrl: null,
  tipoCertificado: 'PARTICIPACION', notaMinima: 14, estado: 'PUBLICADO', requisitoAsistencia: 0, sesiones: [],
  modulos: modulosAulaDemo.map(({ id, titulo }, indice) => ({ id, titulo, orden: indice + 1, materiales: [] })),
})
inscripcionesCursosDemo.set(idCursoAulaDemo, new Set(usuarios.filter(usuario => avanceAulaDemo(usuario.id) !== undefined).map(usuario => usuario.id)))

const error = (status: number, message: string, code?: string) => HttpResponse.json({ code: code ?? (status === 422 ? 'VALIDACION' : status === 401 ? 'NO_AUTENTICADO' : status === 403 ? 'SIN_PERMISO' : 'CURSO_NO_EXISTE'), message }, { status })
const errorCursoAulaFijo = () => error(409, 'El programa y la gratuidad son fijos en este curso de demostración.', 'CURSO_AULA_DEMO_FIJO')
function acceso(request: Request, roles?: string[]) {
  const usuario = usuarios.find(u => u.activo !== false && request.headers.get('Authorization') === `Bearer demo-${u.id}`)
  if (!usuario) return { fallo: error(401, 'Tu sesión expiró. Vuelve a iniciar sesión.') }
  if (roles && !roles.includes(usuario.rol)) return { fallo: error(403, 'No tienes permiso para realizar esta acción.') }
  return { usuario }
}
type AccesoAula = { fallo: ReturnType<typeof error> } | { curso: DetalleCurso; usuarioId: string; avance: number }

function accesoAula(request: Request, id: unknown): AccesoAula {
  const auth = acceso(request, ['AGREMIADO'])
  if (auth.fallo) return auth
  const curso = cursosSimulados.find(c => c.id === id && c.id === idCursoAulaDemo && c.modalidad === 'GRABADO' && c.estado === 'PUBLICADO')
  if (!curso) return { fallo: error(404, 'El aula no está disponible.') }
  const usuarioId = auth.usuario!.id
  const disponible = disponibilidad(curso, usuarioId)
  if (!disponible.inscrito || disponible.accesoContenido === false) {
    return { fallo: error(403, 'Confirma tu inscripción para entrar al aula.', 'AULA_REQUIERE_INSCRIPCION') }
  }
  return { usuarioId, curso, avance: avanceAulaDemo(usuarioId) ?? 0 }
}
function detalle(request: Request, id: string) {
  const auth = acceso(request)
  if (auth.fallo) return { fallo: auth.fallo }
  const curso = cursosSimulados.find(c => c.id === id)
  if (!curso) return { fallo: error(404, 'El curso no existe.') }
  if (auth.usuario!.rol === 'INSTRUCTOR' && curso.instructorId !== auth.usuario!.id) return { fallo: error(403, 'No tienes permiso para acceder a este curso.') }
  if (curso.estado === 'BORRADOR' && auth.usuario!.rol !== 'ADMIN' && curso.instructorId !== auth.usuario!.id) return { fallo: error(403, 'No tienes permiso para acceder a este curso.') }
  return { curso, usuario: auth.usuario! }
}
export const sesionesDeCurso = sesionesDe
const titulo = z.string().trim().min(1).max(160)
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
/** S3 6.1: campos nuevos opcionales (sede, aula, encargado, QR rotatorio y reglas de la sala). */
const salaSesion = z.object({ grabacionPrevista: z.boolean(), pantallaPermitida: z.boolean(), microfonoPermitido: z.boolean(), manoPermitida: z.boolean(),
  porcentajeMinimo: z.number().int().min(1).max(100) }).strict()
const esquemaSesion = (fecha: z.ZodType<string>) => z.object({ nombre: titulo, fecha, horaInicio: hora, horaFin: hora, lugar: z.string().trim().max(160).default(''),
  modalidad: z.enum(modalidadesSesion).default('PRESENCIAL'), sede: z.string().trim().max(120).optional(), aula: z.string().trim().max(100).optional(),
  encargadoId: z.string().optional(), qrRotatorio: z.boolean().optional(), sala: salaSesion.optional() })
  .refine(v => v.horaFin > v.horaInicio && (v.modalidad === 'VIRTUAL' || v.lugar.length > 0))
  .transform(v => ({ ...v, lugar: v.lugar || 'Aula virtual', ...(v.modalidad === 'VIRTUAL' && { sede: undefined, aula: undefined, encargadoId: undefined, qrRotatorio: undefined }),
    ...(v.modalidad === 'PRESENCIAL' && { sala: undefined }) }))
const fechaOpcional = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T00:00:00Z`); return v.slice(0,4) !== '0000' && Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v }).nullable().default(null)
const esquema = z.object({
  modalidadCobro: z.enum(['PREVIO', 'CERTIFICADO', 'GRATUITO']).optional(),
  plazoPagoMinutos: z.number().int().min(1).max(525600).nullable().optional(),
  categoria: z.string().trim().min(1).max(80).default('General'),
  fechaInicio: fechaOpcional, fechaFin: fechaOpcional,
  titulo, descripcion: z.string().trim().max(5000).default(''), instructorId: z.string(),
  horasLectivas: z.number().positive().max(10000), modalidad: z.enum(modalidadesCurso),
  costo: z.number().min(0).max(9999999999.99).multipleOf(0.01), precioGeneral: z.number().min(0).max(9999999999.99).multipleOf(0.01).optional(),
  cupos: z.number().int().min(1).max(1000000),
  tipoCertificado: z.enum(['PARTICIPACION', 'APROBACION']), notaMinima: z.number().min(0).max(20).default(14),
  modulos: z.array(z.object({ titulo }).strict()).min(1).max(100),
}).strict().refine(d => (!d.fechaInicio && !d.fechaFin) || (!!d.fechaInicio && !!d.fechaFin && d.fechaFin >= d.fechaInicio))
// Al editar, cada módulo puede traer el id del que ya existe para conservar su material
const esquemaEdicion = esquema.safeExtend({ modulos: z.array(z.object({ id: z.string().optional(), titulo }).strict()).min(1).max(100) })
function resumenPublico(curso: DetalleCurso) {
  const { id, titulo, descripcion, instructorNombre, horasLectivas, modalidad, costo, cupos,
    cuposDisponibles, categoria, fechaInicio, fechaFin } = curso
  return { id, titulo, descripcion, instructorNombre, horasLectivas, modalidad, costo, cupos,
    cuposDisponibles, categoria, fechaInicio, fechaFin, modalidadCobro: curso.modalidadCobro ?? (costo === 0 ? 'GRATUITO' : null),
    precioGeneral: curso.precioGeneral ?? costo, portadaUrl: curso.portadaUrl ?? null, admiteExternos: true,
    plazoPagoMinutos: curso.plazoPagoMinutos ?? null, versionCobro: curso.versionCobro ?? 1 }
}
function catalogoPaginado(request: Request, publico = false, usuarioId = '') {
  const consulta = z.object({ buscar: z.string().trim().max(160).default(''), categoria: z.string().min(1).max(80).optional(), modalidad: z.enum(modalidadesCurso).optional(), cobro: z.enum(['PREVIO', 'CERTIFICADO', 'GRATUITO']).optional(), pagina: z.coerce.number().int().min(1).max(100000).default(1), tamanoPagina: z.coerce.number().int().min(1).max(50).default(6) }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!consulta.success) return error(422, 'Revisa los filtros y la página solicitada.')
  const { buscar, categoria, modalidad, cobro, pagina, tamanoPagina } = consulta.data
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const publicados = cursosSimulados.filter(c => c.estado === 'PUBLICADO' && (!publico || !c.fechaFin || c.fechaFin >= hoy))
  const filtrados = publicados.filter(c => normalizar(c.titulo).includes(normalizar(buscar)) && (!categoria || c.categoria === categoria) && (!modalidad || disponibilidad(c).modalidad === modalidad) && (!cobro || modalidadCobroDe(c) === cobro)).sort((a,b) => Number(b.id)-Number(a.id))
  return HttpResponse.json({ items: filtrados.slice((pagina-1)*tamanoPagina,pagina*tamanoPagina).map(c => publico ? resumenPublico(disponibilidad(c, '')) : disponibilidad(c, usuarioId)), total: filtrados.length, pagina, tamanoPagina, totalPaginas: Math.ceil(filtrados.length/tamanoPagina), categorias: [...categoriasCatalogo] })
}

function alcanceCertificacion(curso: DetalleCurso) {
  if (curso.modalidad === 'GRABADO') return error(409, 'Los cursos grabados emitirán constancia cuando existan sus lecciones en video (HU-37).', 'CURSO_GRABADO')
  return curso.tipoCertificado !== 'PARTICIPACION' || curso.costo > 0
    ? error(409, 'Esta entrega emite constancias gratuitas sin examen.', 'CERTIFICACION_FUERA_ALCANCE') : null
}

export const estadosInscripcionDemo = new Map<string, 'EN_CURSO' | 'PENDIENTE_PAGO'>()
{
  // Pagos de ejemplo para la bandeja del administrador (Figma S3 8.1)
  const porTitulo = (texto: string) => cursosSimulados.find(c => c.titulo.includes(texto))!
  const semilla = ['Evaluación formativa', 'Comprensión lectora', 'Seguridad y primeros'].map(porTitulo)
  sembrarPagosDemo(semilla.map(c => ({ id: c.id, titulo: c.titulo, importeCentimos: Math.round(c.costo * 100) })))
  for (const [curso, usuarioId, estado] of [[semilla[0]!, 'p-2', 'PENDIENTE_PAGO'], [semilla[1]!, 'p-3', 'EN_CURSO'], [semilla[0]!, 'p-5', 'PENDIENTE_PAGO']] as const) {
    inscripcionesCursosDemo.get(curso.id)?.add(usuarioId)
    estadosInscripcionDemo.set(`${curso.id}:${usuarioId}`, estado)
  }
}

export const handlersCursos = [
  http.get(`${API}/cursos/:id/aula`, ({ request, params }) => {
    const acceso = accesoAula(request, params.id)
    if ('fallo' in acceso) return acceso.fallo
    return HttpResponse.json({ titulo: acceso.curso.titulo, modulos: modulosAulaDemo, completadas: completadasAulaDemo(acceso.avance) })
  }),
  http.post(`${API}/cursos/:id/aula/actividades/:actividadId`, async ({ request, params }) => {
    const entrada = z.object({ opcion: z.number().int().min(0).optional() }).strict().safeParse(await request.json().catch(() => null))
    const acceso = accesoAula(request, params.id)
    if ('fallo' in acceso) return acceso.fallo
    const indice = actividadesAulaDemo.findIndex(actividad => actividad.id === params.actividadId)
    const actividad = actividadesAulaDemo[indice]
    if (!actividad) return error(404, 'La actividad no está disponible.', 'ACTIVIDAD_NO_EXISTE')
    const opcion = entrada.data?.opcion
    if (!entrada.success || (actividad.tipo === 'LECCION' ? opcion !== undefined : opcion === undefined || opcion >= actividad.opciones.length)) {
      return error(422, 'Revisa los datos de la actividad.')
    }
    if (indice > acceso.avance) return error(409, 'Completa la actividad anterior para continuar.', 'ACTIVIDAD_BLOQUEADA')
    if (indice < acceso.avance) return HttpResponse.json({ correcta: true, completadas: completadasAulaDemo(acceso.avance) })
    const correcta = actividad.tipo === 'LECCION' || opcion === respuestasAulaDemo.get(actividad.id)
    const avance = acceso.avance + Number(correcta)
    if (correcta) guardarAvanceAulaDemo(acceso.usuarioId, avance)
    return HttpResponse.json({ correcta, completadas: completadasAulaDemo(avance) })
  }),
  http.get(`${API}/cursos/:id/aula/constancia`, ({ request, params }) => {
    const acceso = accesoAula(request, params.id)
    if ('fallo' in acceso) return acceso.fallo
    if (acceso.avance < actividadesAulaDemo.length) return error(409, 'Completa los módulos para descargar la constancia.', 'AULA_INCOMPLETA')
    const archivo = pdfTextoDemo('Constancia de demostración', [
      acceso.curso.titulo,
      ...modulosAulaDemo.map(modulo => `Módulo completado: ${modulo.titulo}`),
      'Documento de demostración. Sin validez oficial.',
    ])
    return new HttpResponse(archivo, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="constancia-aula-demo.pdf"' } })
  }),
  // ---------- SCRUM-182: portada del curso ----------
  http.put(`${API}/cursos/:id/portada`, async ({ request, params }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    const curso = cursosSimulados.find(c => c.id === params.id)
    if (!curso) return error(404, 'El curso no existe.')
    const entrada = z.object({ nombre: z.string().min(1).max(255), tipo: z.enum(['image/jpeg', 'image/png', 'image/webp']), contenidoBase64: z.string().min(1) }).strict().safeParse(await request.json())
    if (!entrada.success) return HttpResponse.json({ code: 'VALIDACION', message: 'La portada debe ser JPG, PNG o WebP.', fields: { portada: 'La portada debe ser JPG, PNG o WebP.' } }, { status: 422 })
    const bytes = Math.floor(entrada.data.contenidoBase64.length * 3 / 4)
    if (bytes > 1024 * 1024) return HttpResponse.json({ code: 'PORTADA_MUY_PESADA', message: 'La imagen de portada supera 1 MB.', fields: { portada: 'La imagen de portada supera 1 MB.' } }, { status: 422 })
    curso.portadaUrl = `data:${entrada.data.tipo};base64,${entrada.data.contenidoBase64}`
    return HttpResponse.json({ portadaUrl: curso.portadaUrl })
  }),
  http.delete(`${API}/cursos/:id/portada`, ({ request, params }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    const curso = cursosSimulados.find(c => c.id === params.id)
    if (!curso) return error(404, 'El curso no existe.')
    curso.portadaUrl = null
    return new HttpResponse(null, { status: 204 })
  }),
  // ---------- SCRUM-187: página pública del curso (sin sesión) ----------
  http.get(`${API}/publico/cursos/:id`, ({ params }) => {
    const curso = cursosSimulados.find(c => c.id === params.id && c.estado === 'PUBLICADO')
    if (!curso) return error(404, 'El curso no existe o ya no está disponible.', 'CURSO_NO_EXISTE')
    const sesiones = sesionesDe(curso.id).filter(s => s.estado === 'PROGRAMADA')
      .map(({ id, nombre, fecha, horaInicio, horaFin, lugar, modalidad }) => ({ id, nombre, fecha, horaInicio, horaFin, lugar, modalidad }))
    return HttpResponse.json({ ...resumenPublico(disponibilidad(curso, '')), tipoCertificado: curso.tipoCertificado, notaMinima: curso.notaMinima,
      requisitoAsistencia: curso.requisitoAsistencia, sesiones })
  }),
  // ---------- SCRUM-185: enlace para compartir (público) ----------
  http.get(`${API}/publico/cursos/:id/compartir`, ({ request, params }) => {
    const curso = cursosSimulados.find(c => c.id === params.id && c.estado === 'PUBLICADO')
    if (!curso) return error(404, 'El curso no existe o aún no está publicado.')
    // El backend real acorta el enlace (p. ej. cppp.pe/c/…); la demo usa la ruta pública completa
    const url = `${new URL(request.url).origin}/capacitaciones/${curso.id}`
    return HttpResponse.json({ url, enlaceCorto: url.replace(/^https?:\/\//, '') })
  }),
  http.patch(`${API}/cursos/:id/cobro`, async ({ request, params }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    const curso = cursosSimulados.find(c => c.id === params.id)
    if (!curso) return error(404, 'El curso no existe.')
    if (curso.id === idCursoAulaDemo) return errorCursoAulaFijo()
    const entrada = z.object({ modalidadCobro: z.enum(['PREVIO', 'CERTIFICADO', 'GRATUITO']), costo: z.number().min(0).max(9999999999.99).multipleOf(0.01),
      precioGeneral: z.number().min(0).max(9999999999.99).multipleOf(0.01).optional(),
      plazoPagoMinutos: z.number().int().min(1).max(525600).nullable(), versionCobro: z.number().int().positive() }).strict().safeParse(await request.json())
    if (!entrada.success) return error(422, 'Revisa las condiciones de cobro.')
    const datos = entrada.data
    if ((datos.modalidadCobro === 'GRATUITO') !== (datos.costo === 0) || (datos.modalidadCobro === 'PREVIO') !== (datos.plazoPagoMinutos !== null)) return error(422, 'Revisa el importe y el plazo.')
    if (curso.estado === 'CERRADO' || datos.versionCobro !== (curso.versionCobro ?? 1)) return error(409, 'El curso está cerrado o sus condiciones cambiaron.')
    Object.assign(curso, datos, { versionCobro: datos.versionCobro + 1 })
    return HttpResponse.json(curso)
  }),
  http.get(`${API}/cursos/instructores`, ({ request }) => {
    const auth = acceso(request, ['ADMIN']); if (auth.fallo) return auth.fallo
    return HttpResponse.json(usuarios.filter(u => u.rol === 'INSTRUCTOR').map(u => ({ id: u.id, nombre: u.nombre })))
  }),
  http.get(`${API}/cursos`, ({ request }) => {
    const auth = acceso(request, ['ADMIN', 'INSTRUCTOR']); if (auth.fallo) return auth.fallo
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
  http.post(`${API}/cursos/:id/inscribirme`, async ({ request, params }) => {
    const auth = acceso(request, ['AGREMIADO']); if (auth.fallo) return auth.fallo
    const curso = cursosSimulados.find(c => c.id === params.id)
    if (!curso) return error(404, 'El curso no existe.')
    if (curso.estado !== 'PUBLICADO') return error(409, 'El curso no está publicado.', 'CURSO_NO_PUBLICADO')
    const inscritos = inscripcionesCursosDemo.get(curso.id) ?? new Set<string>()
    const yaInscrito = inscritos.has(auth.usuario!.id)
    const cuerpo = await request.text()
    let confirmacion: unknown = {}
    if (cuerpo) {
      try { confirmacion = JSON.parse(cuerpo) }
      catch { return error(422, 'Revisa la confirmación de la inscripción.') }
    }
    const datos = z.object({ versionCobro: z.number().int().positive().optional(), tipoPrecio: z.enum(['COLEGIADO', 'GENERAL']).optional() })
      .strict().safeParse(confirmacion)
    if (!datos.success) return error(422, 'Revisa la confirmación de la inscripción.')
    const precio = miPrecio(curso, auth.usuario!.id)
    if (!yaInscrito && ((datos.data.versionCobro !== undefined && datos.data.versionCobro !== (curso.versionCobro ?? 1))
      || (datos.data.tipoPrecio && datos.data.tipoPrecio !== precio?.tipo))) {
      return error(409, 'Las condiciones cambiaron. Recarga el curso y confírmalas antes de inscribirte.', 'COBRO_MODIFICADO')
    }
    if (!yaInscrito && inscritos.size >= curso.cupos) return error(409, 'El curso está sin cupos. Elige otra capacitación.', 'SIN_CUPOS')
    inscritos.add(auth.usuario!.id); inscripcionesCursosDemo.set(curso.id, inscritos)
    if (curso.id === idCursoAulaDemo && avanceAulaDemo(auth.usuario!.id) === undefined) guardarAvanceAulaDemo(auth.usuario!.id, 0)
    if (!yaInscrito) {
      const pagoPrevio = modalidadCobroDe(curso) === 'PREVIO'
      estadosInscripcionDemo.set(`${curso.id}:${auth.usuario!.id}`, pagoPrevio ? 'PENDIENTE_PAGO' : 'EN_CURSO')
      if (pagoPrevio) crearPago({ cursoId: curso.id, cursoTitulo: curso.titulo, usuarioId: auth.usuario!.id, importeCentimos: Math.round((precio?.importe ?? curso.costo) * 100), plazoMinutos: curso.plazoPagoMinutos ?? 4320 })
    }
    const estado = yaInscrito && auth.usuario!.id === 'p-1' && curso.titulo === 'Demo · Seguridad y primeros auxilios' ? 'TERMINADO' : estadosInscripcionDemo.get(`${curso.id}:${auth.usuario!.id}`) ?? 'EN_CURSO'
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
    const curso = auth.curso!
    if (curso.id === idCursoAulaDemo) return errorCursoAulaFijo()
    const datos = esquemaEdicion.safeParse(await request.json())
    if (!datos.success) return error(422, 'Completa los campos obligatorios: horas mayores que cero, certificado y al menos un módulo.')
    const instructor = usuarios.find(u => u.id === datos.data.instructorId && u.rol === 'INSTRUCTOR')
    if (!instructor) return error(422, 'Selecciona un instructor válido.')
    const inscritos = inscripcionesCursosDemo.get(curso.id)?.size ?? 0
    if (datos.data.cupos < inscritos) return error(422, `Ya hay ${inscritos} inscritos; los cupos no pueden ser menos.`)
    // HU-36: con sesiones programadas la modalidad se calcula; sin ellas se guarda la elegida.
    const calculada = disponibilidad(curso).modalidad
    const conSesiones = sesionesDe(curso.id).some(s => s.estado === 'PROGRAMADA')
    if (conSesiones && datos.data.modalidad !== calculada) return error(422, 'La modalidad se calcula por las sesiones programadas del curso.', 'MODALIDAD_CALCULADA')
    const anteriores = new Map(curso.modulos.map(m => [m.id, m]))
    Object.assign(curso, { ...datos.data, modalidad: conSesiones ? curso.modalidad : datos.data.modalidad, instructorNombre: instructor.nombre,
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
  http.post(`${API}/cursos/:id/excepciones`, async ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const curso = auth.curso!
    const fueraDeAlcance = alcanceCertificacion(curso); if (fueraDeAlcance) return fueraDeAlcance
    const datos = z.object({ agremiadoId: z.string(), motivo: z.string().trim().min(1).max(1000) }).strict().safeParse(await request.json())
    if (!datos.success) return error(422, 'Ingresa el motivo de la excepción.')
    if (curso.estado !== 'CERRADO') return error(409, 'Cierra el curso antes de emitir una excepción.')
    if (!inscripcionesCursosDemo.get(curso.id)?.has(datos.data.agremiadoId)) return error(403, 'El colegiado no pertenece a este curso.')
    if (certificadoDe(curso.id, datos.data.agremiadoId)) return error(409, 'Ya existe un certificado para este colegiado.')
    const fila = filaCierre(curso, datos.data.agremiadoId)
    const certificado = emitirCertificado({ cursoId: curso.id, agremiadoId: datos.data.agremiadoId, porExcepcion: true, motivo: datos.data.motivo,
      tipo: curso.tipoCertificado, nombre: fila.agremiado.nombre, dniEnmascarado: null, curso: curso.titulo, modalidad: curso.modalidad,
      horasLectivas: curso.horasLectivas, fechaInicio: curso.fechaInicio ?? '', fechaFin: curso.fechaFin ?? '', instructorNombre: curso.instructorNombre })
    return HttpResponse.json({ codigo: certificado.codigo }, { status: 201 })
  }),
  // ---------- Cierre del curso y certificados (SCRUM-171) ----------
  http.get(`${API}/cursos/:id/cierre`, ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const curso = auth.curso!
    const fueraDeAlcance = alcanceCertificacion(curso); if (fueraDeAlcance) return fueraDeAlcance
    if (curso.estado === 'BORRADOR') return error(409, 'Publica el curso antes de cerrarlo.', 'CURSO_NO_PUBLICADO')
    if (curso.estado === 'CERRADO') return error(409, 'El curso ya está cerrado y sus certificados fueron emitidos.', 'CURSO_CERRADO')
    const filas = [...(inscripcionesCursosDemo.get(curso.id) ?? [])].map(id => filaCierre(curso, id))
    return HttpResponse.json({ curso: disponibilidad(curso), requisitoAsistencia: curso.requisitoAsistencia, filas })
  }),
  http.post(`${API}/cursos/:id/cerrar`, async ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const curso = auth.curso!
    const fueraDeAlcance = alcanceCertificacion(curso); if (fueraDeAlcance) return fueraDeAlcance
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
  // Editar una sesión del curso (S3 6.1): las clases sueltas siguen en handlers.ts (este devuelve undefined y pasa).
  http.put(`${API}/clases/:id`, async ({ request, params }) => {
    const cuerpo = await request.clone().json() as { cursoId?: string }
    const demo = [...sesionesDemo.values()].flat().find(s => s.sesion.id === params.id)
    const clase = clases.find(c => c.id === params.id && (c.curso?.id ?? c.cursoId) === cuerpo.cursoId)
    if (!demo && !clase) return undefined
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    const datos = esquemaSesion(fecha).safeParse(cuerpo)
    if (!datos.success) return error(422, 'Completa los datos de la sesión con una fecha y un horario válidos.')
    if (demo) { Object.assign(demo.sesion, datos.data); return HttpResponse.json(demo.sesion) }
    if (clases.some(c => c.id !== clase!.id && c.estado === 'PROGRAMADA' && c.instructor.id === clase!.instructor.id && c.fecha === datos.data.fecha && c.horaInicio < datos.data.horaFin && datos.data.horaInicio < c.horaFin)) {
      return error(409, 'El instructor ya tiene una clase en ese horario. Elige otro horario.', 'CONFLICTO_HORARIO')
    }
    Object.assign(clase!, datos.data)
    return HttpResponse.json(clase)
  }),
  http.post(`${API}/cursos/:id/sesiones`, async ({ request, params }) => {
    const rol = acceso(request, ['ADMIN']); if (rol.fallo) return rol.fallo
    const auth = detalle(request, String(params.id)); if (auth.fallo) return auth.fallo
    const curso = auth.curso!
    if (curso.estado === 'CERRADO') return error(409, 'El curso ya está cerrado.', 'CURSO_CERRADO')
    if (curso.modalidad === 'GRABADO') return error(409, 'Un curso grabado no tiene sesiones con fecha: su contenido son lecciones en video.', 'CURSO_GRABADO')
    const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
      const d = new Date(`${v}T00:00:00Z`)
      return !v.startsWith('0000-') && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v
    })
    const datos = esquemaSesion(fecha).safeParse(await request.json())
    if (!datos.success) return error(422, 'Completa los datos de la sesión con una fecha y un horario válidos.')
    if (clases.some(c => c.estado === 'PROGRAMADA' && c.instructor.id === curso.instructorId && c.fecha === datos.data.fecha && c.horaInicio < datos.data.horaFin && datos.data.horaInicio < c.horaFin)) {
      return error(409, 'El instructor ya tiene una clase en ese horario. Elige otro horario.', 'CONFLICTO_HORARIO')
    }
    const nueva = { ...datos.data, id: `sesion-${nuevoId()}`, cursoId: curso.id, curso: { id: curso.id, titulo: curso.titulo }, estado: 'PROGRAMADA' as const, instructor: { id: curso.instructorId, nombre: curso.instructorNombre } }
    clases.push(nueva); inscripciones[nueva.id] = []
    return HttpResponse.json(nueva, { status: 201 })
  }),
  http.get(`${API}/cursos/:id/mi-asistencia`, ({ request, params }) => {
    const rol = acceso(request, ['AGREMIADO']); if (rol.fallo) return rol.fallo
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
