import { delay, http, HttpResponse } from 'msw'
import { fechaLarga, horaRegistro } from '@/lib/formato'
import type {
  Asistencia,
  Clase,
  ClaseEntrada,
  ClaseParticipante,
  ErrorApi,
  EstadoSalud,
  MarcarAsistenciaEntrada,
  MarcarAsistenciaRespuesta,
  QrAsistencia,
  Rol,
} from '@/types/api'
import { asistencias, clases, inscripciones, instructores, participantes, usuarios } from './datos'

const API = import.meta.env.VITE_API_URL ?? '/api'
const DURACION_QR = 30
/** Solo para la simulación: el servidor real firma con QR_SECRET desde variables de entorno */
const SECRETO_QR = 'secreto-de-demostracion'

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

const sinPermiso = (message = 'No tienes permiso para realizar esta acción.') =>
  error(403, { code: 'SIN_PERMISO', message })

const claseNoExiste = () =>
  error(404, { code: 'CLASE_NO_EXISTE', message: 'La clase no existe.' })

const claseCancelada = () =>
  error(409, { code: 'CLASE_CANCELADA', message: 'La clase está cancelada.' })

/**
 * Igual que el guard de roles del backend: sin sesión → 401, rol incorrecto → 403.
 * Devuelve el usuario o la respuesta de error.
 */
function exigirRol(request: Request, ...roles: Rol[]) {
  const usuario = usuarioDe(request)
  if (!usuario) return { respuesta: noAutenticado() }
  if (!roles.includes(usuario.rol)) return { respuesta: sinPermiso() }
  return { usuario }
}

// ---------- QR firmado (simulación de HMAC) ----------

/** Hash FNV-1a: suficiente para simular una firma que detecte alteraciones. */
function firmar(texto: string) {
  let hash = 0x811c9dc5
  for (const caracter of `${texto}.${SECRETO_QR}`) {
    hash ^= caracter.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Token `claseId.expiraEnSegundos.firma`: ligado a la clase y válido 30 s. Sin datos personales. */
function emitirToken(claseId: string, expiraEnMs: number) {
  const cuerpo = `${claseId}.${Math.floor(expiraEnMs / 1000)}`
  return `${cuerpo}.${firmar(cuerpo)}`
}

function leerToken(token: string) {
  const partes = token.split('.')
  if (partes.length !== 3) return null
  const [claseId, expira, firma] = partes as [string, string, string]
  if (firmar(`${claseId}.${expira}`) !== firma) return null
  return { claseId, expiraEnMs: Number(expira) * 1000 }
}

// ---------- Validación de clases ----------

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
  // ---------- Salud ----------
  http.get(`${API}/health`, () =>
    HttpResponse.json<EstadoSalud>({ ok: true, api: 'v1', database: 'ready', redis: 'ready' }),
  ),

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

  http.get(`${API}/auth/me`, ({ request }) => {
    const usuario = usuarioDe(request)
    if (!usuario) return noAutenticado()
    const { password: _omitida, ...publico } = usuario
    return HttpResponse.json({ usuario: publico })
  }),

  // ---------- Catálogos ----------
  http.get(`${API}/instructores`, ({ request }) => {
    const { respuesta } = exigirRol(request, 'COORDINADOR')
    return respuesta ?? HttpResponse.json(instructores)
  }),

  // ---------- Clases ----------
  http.get(`${API}/clases`, async ({ request }) => {
    const { respuesta } = exigirRol(request, 'COORDINADOR')
    if (respuesta) return respuesta
    await delay(300)
    return HttpResponse.json(clases.map(conInscritos))
  }),

  http.get(`${API}/instructor/clases`, async ({ request }) => {
    const { respuesta, usuario } = exigirRol(request, 'INSTRUCTOR')
    if (respuesta) return respuesta
    await delay(300)
    return HttpResponse.json(
      clases
        .filter((c) => c.instructor.id === usuario.id && c.estado === 'PROGRAMADA')
        .map(conInscritos),
    )
  }),

  http.get(`${API}/clases/:id`, ({ request, params }) => {
    const { respuesta, usuario } = exigirRol(request, 'COORDINADOR', 'INSTRUCTOR')
    if (respuesta) return respuesta
    const clase = clases.find((c) => c.id === params.id)
    if (!clase) return claseNoExiste()
    if (usuario.rol === 'INSTRUCTOR' && clase.instructor.id !== usuario.id) {
      return sinPermiso('Esta clase no está asignada a ti.')
    }
    return HttpResponse.json(conInscritos(clase))
  }),

  http.post(`${API}/clases`, async ({ request }) => {
    const { respuesta } = exigirRol(request, 'COORDINADOR')
    if (respuesta) return respuesta
    await delay(400)
    return guardar((await request.json()) as ClaseEntrada)
  }),

  http.put(`${API}/clases/:id`, async ({ request, params }) => {
    const { respuesta } = exigirRol(request, 'COORDINADOR')
    if (respuesta) return respuesta
    await delay(400)
    return guardar((await request.json()) as ClaseEntrada, params.id as string)
  }),

  http.post(`${API}/clases/:id/cancelar`, async ({ request, params }) => {
    const { respuesta } = exigirRol(request, 'COORDINADOR')
    if (respuesta) return respuesta
    await delay(300)
    const clase = clases.find((c) => c.id === params.id)
    if (!clase) return claseNoExiste()
    clase.estado = 'CANCELADA'
    return HttpResponse.json(conInscritos(clase))
  }),

  // ---------- Inscripciones ----------
  http.get(`${API}/clases/:id/inscritos`, ({ request, params }) => {
    const { respuesta } = exigirRol(request, 'COORDINADOR')
    if (respuesta) return respuesta
    const ids = inscripciones[params.id as string]
    if (!ids) return claseNoExiste()
    return HttpResponse.json(participantes.filter((p) => ids.includes(p.id)))
  }),

  http.post(`${API}/clases/:id/inscritos`, async ({ request, params }) => {
    const { respuesta } = exigirRol(request, 'COORDINADOR')
    if (respuesta) return respuesta
    await delay(300)
    const { email } = (await request.json()) as { email: string }
    const clase = clases.find((c) => c.id === params.id)
    const ids = inscripciones[params.id as string]
    if (!clase || !ids) return claseNoExiste()
    if (clase.estado === 'CANCELADA') return claseCancelada()
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

  // ---------- Asistencia (coordinador) ----------
  http.get(`${API}/clases/:id/asistencia`, ({ request, params }) => {
    const { respuesta } = exigirRol(request, 'COORDINADOR')
    if (respuesta) return respuesta
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

  // ---------- QR (instructor) ----------
  http.get(`${API}/clases/:id/qr`, ({ request, params }) => {
    const { respuesta, usuario } = exigirRol(request, 'INSTRUCTOR')
    if (respuesta) return respuesta
    const clase = clases.find((c) => c.id === params.id)
    if (!clase) return claseNoExiste()
    if (clase.instructor.id !== usuario.id) return sinPermiso('Esta clase no está asignada a ti.')
    if (clase.estado === 'CANCELADA') return claseCancelada()
    // El token cambia en cada "ventana" de 30 s, igual que lo haría el servidor real
    const ahora = Date.now()
    const ventana = Math.floor(ahora / (DURACION_QR * 1000))
    const expiraEn = (ventana + 1) * DURACION_QR * 1000
    const cuerpo: QrAsistencia = {
      token: emitirToken(clase.id, expiraEn),
      expiraEn: new Date(expiraEn).toISOString(),
      servidorAhora: new Date(ahora).toISOString(),
      duracionSegundos: DURACION_QR,
    }
    return HttpResponse.json(cuerpo)
  }),

  // ---------- Participante ----------
  http.get(`${API}/participante/clases`, async ({ request }) => {
    const { respuesta, usuario } = exigirRol(request, 'PARTICIPANTE')
    if (respuesta) return respuesta
    await delay(300)
    const mias: ClaseParticipante[] = clases
      .filter((c) => inscripciones[c.id]?.includes(usuario.id))
      .map(({ id, nombre, instructor, fecha, horaInicio, horaFin, lugar, estado }) => ({
        id,
        nombre,
        instructor,
        fecha,
        horaInicio,
        horaFin,
        lugar,
        estado,
        miAsistencia: asistencias[id]?.[usuario.id] ?? null,
      }))
    return HttpResponse.json(mias)
  }),

  http.post(`${API}/asistencia/marcar`, async ({ request }) => {
    const { respuesta, usuario } = exigirRol(request, 'PARTICIPANTE')
    if (respuesta) return respuesta
    await delay(500)
    const { token, claseId } = (await request.json()) as MarcarAsistenciaEntrada

    const datos = leerToken(token ?? '')
    if (!datos) {
      return error(422, {
        code: 'QR_INVALIDO',
        message: 'Este código QR no es válido. Escanea el código que muestra tu instructor en la sala.',
      })
    }
    if (Date.now() > datos.expiraEnMs) {
      return error(410, {
        code: 'QR_EXPIRADO',
        message: 'El código QR expiró. Escanea el código nuevo que aparece en la pantalla del instructor.',
      })
    }
    if (claseId && claseId !== datos.claseId) {
      return error(409, {
        code: 'QR_OTRA_CLASE',
        message: 'Este código QR es de otra clase. Verifica que estés escaneando el código de tu clase.',
      })
    }
    const clase = clases.find((c) => c.id === datos.claseId)
    if (!clase) return claseNoExiste()
    if (clase.estado === 'CANCELADA') return claseCancelada()
    if (!inscripciones[clase.id]?.includes(usuario.id)) {
      return error(403, {
        code: 'NO_INSCRITO',
        message: 'No estás inscrito(a) en esta clase. Pide al coordinador que te inscriba.',
      })
    }
    const marcas = (asistencias[clase.id] ??= {})
    const previa = marcas[usuario.id]
    if (previa) {
      return error(409, {
        code: 'ASISTENCIA_YA_REGISTRADA',
        message: `Tu asistencia ya estaba registrada a las ${horaRegistro(previa)}. No necesitas volver a escanear.`,
      })
    }
    const ahora = new Date().toISOString()
    marcas[usuario.id] = ahora
    return HttpResponse.json<MarcarAsistenciaRespuesta>(
      { clase: { id: clase.id, nombre: clase.nombre }, horaRegistro: ahora },
      { status: 201 },
    )
  }),
]
