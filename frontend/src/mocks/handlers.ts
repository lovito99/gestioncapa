import { delay, http, HttpResponse } from 'msw'
import { fechaLarga } from '@/lib/formato'
import type { Asistencia, Clase, ClaseEntrada, ErrorApi, QrAsistencia } from '@/types/api'
import { asistencias, clases, inscripciones, instructores, participantes, usuarios } from './datos'

const API = import.meta.env.VITE_API_URL ?? '/api'
const DURACION_QR = 30

const error = (status: number, cuerpo: ErrorApi) => HttpResponse.json(cuerpo, { status })

const conInscritos = (clase: (typeof clases)[number]): Clase => ({
  ...clase,
  inscritos: inscripciones[clase.id]?.length ?? 0,
})

/** El token de prueba es `demo-<idUsuario>` */
function usuarioDe(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer demo-', '')
  return usuarios.find((u) => u.id === token)
}

const noAutenticado = () =>
  error(401, { code: 'NO_AUTENTICADO', message: 'Tu sesión expiró. Vuelve a iniciar sesión.' })

const claseNoExiste = () =>
  error(404, { code: 'CLASE_NO_EXISTE', message: 'La clase no existe.' })

function validar(entrada: Partial<ClaseEntrada>) {
  const fields: Record<string, string> = {}
  if (!entrada.nombre?.trim()) fields.nombre = 'Ingresa el nombre de la clase'
  if (!entrada.instructorId) fields.instructorId = 'Selecciona un instructor'
  if (!entrada.fecha) fields.fecha = 'Ingresa la fecha de la clase'
  if (!entrada.horaInicio) fields.horaInicio = 'Ingresa la hora de inicio'
  if (!entrada.horaFin) fields.horaFin = 'Ingresa la hora de fin'
  if (!entrada.lugar?.trim()) fields.lugar = 'Ingresa el lugar'
  return fields
}

function buscarConflicto(entrada: ClaseEntrada, ignorarId?: string) {
  return clases.find(
    (c) =>
      c.id !== ignorarId &&
      c.estado === 'PROGRAMADA' &&
      c.instructor.id === entrada.instructorId &&
      c.fecha === entrada.fecha &&
      entrada.horaInicio < c.horaFin &&
      c.horaInicio < entrada.horaFin,
  )
}

function guardar(entrada: ClaseEntrada, id?: string) {
  const fields = validar(entrada)
  if (Object.keys(fields).length > 0) {
    return error(422, {
      code: 'VALIDACION',
      message: 'No se pudo guardar la clase. Completa los campos obligatorios marcados.',
      fields,
    })
  }
  const conflicto = buscarConflicto(entrada, id)
  if (conflicto) {
    return error(409, {
      code: 'CONFLICTO_HORARIO',
      message: `${conflicto.instructor.nombre} ya tiene la clase «${conflicto.nombre}» el ${fechaLarga(conflicto.fecha)} de ${conflicto.horaInicio} a ${conflicto.horaFin}. Elige otro horario u otro instructor.`,
      details: { claseId: conflicto.id },
    })
  }
  const instructor = instructores.find((i) => i.id === entrada.instructorId)!
  const datos = {
    nombre: entrada.nombre.trim(),
    instructor,
    fecha: entrada.fecha,
    horaInicio: entrada.horaInicio,
    horaFin: entrada.horaFin,
    lugar: entrada.lugar.trim(),
  }
  if (id) {
    const clase = clases.find((c) => c.id === id)
    if (!clase) return claseNoExiste()
    Object.assign(clase, datos)
    return HttpResponse.json(conInscritos(clase))
  }
  const nueva = { id: `c-${Date.now()}`, estado: 'PROGRAMADA' as const, ...datos }
  clases.push(nueva)
  inscripciones[nueva.id] = []
  return HttpResponse.json(conInscritos(nueva), { status: 201 })
}

export const handlers = [
  // ---------- Autenticación ----------
  http.post(`${API}/auth/login`, async ({ request }) => {
    await delay(400)
    const { email, password } = (await request.json()) as { email: string; password: string }
    const usuario = usuarios.find((u) => u.email === email.trim().toLowerCase())
    if (!usuario || usuario.password !== password) {
      return error(401, {
        code: 'CREDENCIALES_INVALIDAS',
        message: 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
      })
    }
    const { password: _omitida, ...publico } = usuario
    return HttpResponse.json({ token: `demo-${usuario.id}`, usuario: publico })
  }),

  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  // ---------- Catálogos ----------
  http.get(`${API}/instructores`, () => HttpResponse.json(instructores)),

  // ---------- Clases ----------
  http.get(`${API}/clases`, async ({ request }) => {
    if (!usuarioDe(request)) return noAutenticado()
    await delay(300)
    return HttpResponse.json(clases.map(conInscritos))
  }),

  http.get(`${API}/instructor/clases`, async ({ request }) => {
    const usuario = usuarioDe(request)
    if (!usuario) return noAutenticado()
    await delay(300)
    return HttpResponse.json(
      clases
        .filter((c) => c.instructor.id === usuario.id && c.estado === 'PROGRAMADA')
        .map(conInscritos),
    )
  }),

  http.get(`${API}/clases/:id`, ({ params }) => {
    const clase = clases.find((c) => c.id === params.id)
    return clase ? HttpResponse.json(conInscritos(clase)) : claseNoExiste()
  }),

  http.post(`${API}/clases`, async ({ request }) => {
    await delay(400)
    return guardar((await request.json()) as ClaseEntrada)
  }),

  http.put(`${API}/clases/:id`, async ({ request, params }) => {
    await delay(400)
    return guardar((await request.json()) as ClaseEntrada, params.id as string)
  }),

  http.post(`${API}/clases/:id/cancelar`, async ({ params }) => {
    await delay(300)
    const clase = clases.find((c) => c.id === params.id)
    if (!clase) return claseNoExiste()
    clase.estado = 'CANCELADA'
    return HttpResponse.json(conInscritos(clase))
  }),

  // ---------- Inscripciones ----------
  http.get(`${API}/clases/:id/inscritos`, ({ params }) => {
    const ids = inscripciones[params.id as string]
    if (!ids) return claseNoExiste()
    return HttpResponse.json(participantes.filter((p) => ids.includes(p.id)))
  }),

  http.post(`${API}/clases/:id/inscritos`, async ({ request, params }) => {
    await delay(300)
    const { email } = (await request.json()) as { email: string }
    const ids = inscripciones[params.id as string]
    if (!ids) return claseNoExiste()
    const participante = participantes.find((p) => p.email === email.trim().toLowerCase())
    if (!participante) {
      return error(404, {
        code: 'PARTICIPANTE_NO_EXISTE',
        message: `No encontramos un participante con el correo ${email.trim()}. Verifica que esté bien escrito o pide al administrador que cree su cuenta.`,
      })
    }
    if (ids.includes(participante.id)) {
      return error(409, {
        code: 'YA_INSCRITO',
        message: `${participante.nombre} ya está inscrito(a) en esta clase. No se creó una inscripción nueva.`,
      })
    }
    ids.push(participante.id)
    return HttpResponse.json(participante, { status: 201 })
  }),

  // ---------- Asistencia ----------
  http.get(`${API}/clases/:id/asistencia`, ({ params }) => {
    const id = params.id as string
    const ids = inscripciones[id]
    if (!ids) return claseNoExiste()
    const marcas = asistencias[id] ?? {}
    const registros = participantes
      .filter((p) => ids.includes(p.id))
      .map((p) => ({
        participante: p,
        estado: marcas[p.id] ? ('PRESENTE' as const) : ('AUSENTE' as const),
        horaRegistro: marcas[p.id] ?? null,
      }))
    const presentes = registros.filter((r) => r.estado === 'PRESENTE').length
    const cuerpo: Asistencia = {
      inscritos: registros.length,
      presentes,
      ausentes: registros.length - presentes,
      registros,
    }
    return HttpResponse.json(cuerpo)
  }),

  http.get(`${API}/clases/:id/qr`, ({ params }) => {
    const clase = clases.find((c) => c.id === params.id)
    if (!clase) return claseNoExiste()
    // El token cambia en cada "ventana" de 30 s, igual que lo haría el servidor real
    const ahora = Date.now()
    const ventana = Math.floor(ahora / (DURACION_QR * 1000))
    const cuerpo: QrAsistencia = {
      token: `${clase.id}.${ventana}.${Math.random().toString(36).slice(2, 10)}`,
      expiraEn: new Date((ventana + 1) * DURACION_QR * 1000).toISOString(),
      servidorAhora: new Date(ahora).toISOString(),
      duracionSegundos: DURACION_QR,
    }
    return HttpResponse.json(cuerpo)
  }),
]
