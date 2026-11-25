import { delay, http, HttpResponse } from 'msw'
import { horaRegistro } from '@/lib/formato'
import type {
  AgremiadoPuerta,
  BusquedaDniRespuesta,
  ContextoPuerta,
  SesionPuerta,
  ErrorApi,
  MiQr,
  RegistroPuertaEntrada,
  RegistroPuertaRespuesta,
  SesionPresencialResumen,
} from '@/types/api'
import { asistencias, clases, inscripciones, participantes, usuarios } from './datos'
import { pdfTextoDemo } from './pdfTexto'

/**
 * HU-39: QR personal del agremiado y asistencia tomada por el encargado en la puerta.
 * Simula el contrato descrito en docs/API.md («HU-39»).
 */
const API = import.meta.env.VITE_API_URL ?? '/api'
/** Solo para la simulación: el servidor real firma con un secreto de las variables de entorno */
const SECRETO = 'secreto-qr-personal-demostracion'
const MINIMO_DIGITOS = 4

/** DNI de los agremiados de prueba. Los que se registran en la demo se agregan aquí. */
export const dniPorUsuario: Record<string, string> = {
  'p-1': '41234567',
  'p-2': '42345678',
  'p-3': '43456789',
  'p-4': '44567890',
  'p-5': '45678901',
  'p-6': '46789012',
  'p-7': '47890123',
}

const error = (status: number, cuerpo: ErrorApi) => HttpResponse.json(cuerpo, { status })

/** Marcas hechas en la puerta por DNI; las demás se tomaron con un QR. */
const marcasPorDni = new Set<string>()
const registrosPuerta = new Map<string, RegistroPuertaRespuesta & { claseId: string; actorId: string }>()
let secuenciaMarca = 0

/** Método con el que se registró una marca existente, para la lista de asistencia. */
export const metodoDeMarca = (claseId: string, usuarioId: string): 'QR' | 'DNI' =>
  marcasPorDni.has(`${claseId}:${usuarioId}`) ? 'DNI' : 'QR'

/** `41234567` → `•••• 4567`, como en el diseño S3 1.1 y 1.4 */
export function enmascararDni(dni: string | undefined) {
  return dni ? `•••• ${dni.slice(-4)}` : null
}

/** Hash FNV-1a: suficiente para simular una firma que detecte alteraciones. */
function firmar(texto: string) {
  let hash = 0x811c9dc5
  for (const caracter of `${texto}.${SECRETO}`) {
    hash ^= caracter.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Token `qrp.<usuarioId>.<firma>`: identifica al agremiado sin exponer su DNI. */
export function tokenPersonal(usuarioId: string) {
  const cuerpo = `qrp.${usuarioId}`
  return `${cuerpo}.${firmar(cuerpo)}`
}

function leerTokenPersonal(token: string) {
  const partes = token.split('.')
  if (partes.length !== 3 || partes[0] !== 'qrp') return null
  const [prefijo, usuarioId, firma] = partes as [string, string, string]
  return firmar(`${prefijo}.${usuarioId}`) === firma ? usuarioId : null
}

function sesion(request: Request) {
  const id = request.headers.get('Authorization')?.replace('Bearer demo-', '')
  return usuarios.find((u) => u.id === id && u.activo !== false)
}

const agremiado = (id: string): AgremiadoPuerta | null => {
  const persona = participantes.find((p) => p.id === id) ?? usuarios.find((u) => u.id === id && u.rol === 'AGREMIADO')
  return persona ? { id, nombre: persona.nombre, dniParcial: enmascararDni(dniPorUsuario[id]) } : null
}

/** Primera sesión presencial programada desde hoy (hora de Lima) en la que está inscrito. */
function proximaSesion(usuarioId: string): SesionPresencialResumen | null {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
  const siguiente = clases
    .filter((c) => c.estado === 'PROGRAMADA' && c.modalidad !== 'VIRTUAL' && c.fecha >= hoy && inscripciones[c.id]?.includes(usuarioId))
    .sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`))[0]
  if (!siguiente) return null
  const { id, fecha, horaInicio, horaFin, lugar } = siguiente
  return { id, titulo: siguiente.curso?.titulo ?? siguiente.nombre, fecha, horaInicio, horaFin, lugar }
}

/** Mismas reglas que el guard del backend: sesión, rol y clase asignada al instructor. */
function validarEncargado(request: Request, claseId: string) {
  const usuario = sesion(request)
  if (!usuario) return { respuesta: error(401, { code: 'NO_AUTENTICADO', message: 'Tu sesión expiró. Vuelve a iniciar sesión.' }) }
  if (usuario.rol !== 'ADMIN' && usuario.rol !== 'INSTRUCTOR') {
    return { respuesta: error(403, { code: 'SIN_PERMISO', message: 'No tienes permiso para tomar la asistencia.' }) }
  }
  const clase = clases.find((c) => c.id === claseId)
  if (!clase) return { respuesta: error(404, { code: 'CLASE_NO_EXISTE', message: 'La clase no existe.' }) }
  if (usuario.rol === 'INSTRUCTOR' && (clase.encargadoId ?? clase.instructor.id) !== usuario.id) {
    return { respuesta: error(403, { code: 'SIN_PERMISO', message: 'Esta clase no está asignada a ti.' }) }
  }
  if (clase.estado === 'CANCELADA') return { respuesta: error(409, { code: 'CLASE_CANCELADA', message: 'La clase está cancelada.' }) }
  if (clase.modalidad === 'VIRTUAL') {
    return { respuesta: error(409, { code: 'SESION_VIRTUAL', message: 'Esta sesión es solo virtual: la asistencia se registra en la sala virtual.' }) }
  }
  return { clase, usuario }
}

const exigirAgremiado = (request: Request) => {
  const usuario = sesion(request)
  if (!usuario) return { respuesta: error(401, { code: 'NO_AUTENTICADO', message: 'Tu sesión expiró. Vuelve a iniciar sesión.' }) }
  if (usuario.rol !== 'AGREMIADO') return { respuesta: error(403, { code: 'SIN_PERMISO', message: 'Solo los agremiados tienen QR personal.' }) }
  return { usuario }
}

const resumenPuerta = ({ id, nombre, fecha, horaInicio, lugar, curso }: SesionPuerta): SesionPuerta =>
  ({ id, nombre, fecha, horaInicio, lugar, curso })

function buscarInscritos(claseId: string, dni: string, exacto: boolean) {
  return (inscripciones[claseId] ?? [])
    .filter(id => exacto ? dniPorUsuario[id] === dni : dniPorUsuario[id]?.startsWith(dni))
    .flatMap(id => {
      const participante = agremiado(id)
      return participante ? [{ participante, horaRegistro: asistencias[claseId]?.[id] ?? null }] : []
    })
}

export const handlersAsistenciaPuerta = [
  http.get(`${API}/participante/mi-qr`, async ({ request }) => {
    const { respuesta, usuario } = exigirAgremiado(request)
    if (respuesta) return respuesta
    await delay(300)
    return HttpResponse.json<MiQr>({
      token: tokenPersonal(usuario.id),
      nombre: usuario.nombre,
      dniParcial: enmascararDni(dniPorUsuario[usuario.id]),
      habilitado: true,
      proximaSesion: proximaSesion(usuario.id),
    })
  }),

  http.get(`${API}/participante/mi-qr/pdf`, async ({ request }) => {
    const { respuesta, usuario } = exigirAgremiado(request)
    if (respuesta) return respuesta
    await delay(300)
    // El backend real dibuja el QR en el PDF; la simulación solo genera texto
    const pdf = pdfTextoDemo('Mi QR de asistencia - CPPP Región Cusco', [
      usuario.nombre,
      `DNI ${enmascararDni(dniPorUsuario[usuario.id]) ?? 'no registrado'}`,
      '',
      'Muestra este código al encargado en la puerta del aula.',
      `Código: ${tokenPersonal(usuario.id)}`,
    ])
    return new HttpResponse(pdf, { headers: { 'Content-Type': 'application/pdf' } })
  }),

  http.get(`${API}/instructor/clases/puerta`, ({ request }) => {
    const usuario = sesion(request)
    if (!usuario || usuario.rol !== 'INSTRUCTOR') return error(403, { code: 'SIN_PERMISO', message: 'No tienes acceso.' })
    return HttpResponse.json(clases.filter(clase =>
      clase.encargadoId === usuario.id && clase.instructor.id !== usuario.id &&
      clase.modalidad !== 'VIRTUAL' && clase.estado === 'PROGRAMADA').map(resumenPuerta))
  }),

  http.get(`${API}/clases/:id/asistencia/puerta`, async ({ request, params }) => {
    const claseId = params.id as string
    const { respuesta, clase, usuario } = validarEncargado(request, claseId)
    if (respuesta) return respuesta
    await delay(250)
    const dni = new URL(request.url).searchParams.get('dni')
    // Compatibilidad de la simulación con el contrato anterior.
    if (dni !== null) {
      if (!new RegExp(`^\\d{${MINIMO_DIGITOS},8}$`).test(dni.trim())) {
        return error(422, { code: 'VALIDACION', message: 'Revisa el DNI.' })
      }
      return HttpResponse.json<BusquedaDniRespuesta>({ resultados: buscarInscritos(claseId, dni.trim(), false) })
    }

    const inscritos = inscripciones[claseId] ?? []
    const marcas = asistencias[claseId] ?? {}
    const recientes = [...registrosPuerta.values()]
      .filter(r => r.claseId === claseId && marcas[r.participante.id] === r.horaRegistro)
      .reverse().slice(0, 4).map(({ marcaId, participante, horaRegistro, metodo }) => ({ marcaId, participante, horaRegistro, metodo }))
    return HttpResponse.json<ContextoPuerta>({
      clase: resumenPuerta(clase), inscritos: inscritos.length,
      presentes: inscritos.filter(id => marcas[id]).length, recientes,
      verListaCompleta: usuario.rol === 'ADMIN' || clase.instructor.id === usuario.id,
    })
  }),

  http.post(`${API}/clases/:id/asistencia/puerta/buscar-dni`, async ({ request, params }) => {
    const claseId = params.id as string
    const { respuesta } = validarEncargado(request, claseId)
    if (respuesta) return respuesta
    const cuerpo = await request.json() as { dni?: unknown } | null
    if (typeof cuerpo?.dni !== 'string' || !/^[0-9]{8}$/.test(cuerpo.dni)) {
      return error(422, { code: 'DNI_INVALIDO', message: 'Ingresa los ocho dígitos del DNI.' })
    }
    await delay(250)
    return HttpResponse.json<BusquedaDniRespuesta>({ resultados: buscarInscritos(claseId, cuerpo.dni, true) })
  }),

  http.post(`${API}/clases/:id/asistencia/puerta`, async ({ request, params }) => {
    const claseId = params.id as string
    const { respuesta, usuario } = validarEncargado(request, claseId)
    if (respuesta) return respuesta
    await delay(400)
    const entrada = (await request.json()) as Partial<RegistroPuertaEntrada>

    let id: string | undefined
    let metodo: RegistroPuertaRespuesta['metodo']
    if (typeof entrada.token === 'string') {
      metodo = 'QR'
      id = leerTokenPersonal(entrada.token.trim()) ?? undefined
      if (!id || !agremiado(id)) {
        return error(422, {
          code: 'QR_PERSONAL_INVALIDO',
          message: 'Pide al colegiado que abra «Mi QR» en la plataforma o búscalo por DNI.',
        })
      }
    } else if (typeof entrada.participanteId === 'string') {
      metodo = 'DNI'
      id = entrada.participanteId
      if (!agremiado(id)) return error(404, { code: 'PARTICIPANTE_NO_EXISTE', message: 'El agremiado no existe.' })
    } else {
      return error(422, { code: 'VALIDACION', message: 'Envía el QR personal o el agremiado elegido en la búsqueda.' })
    }

    const participante = agremiado(id)!
    if (!inscripciones[claseId]?.includes(id)) {
      return error(409, {
        code: 'NO_INSCRITO',
        message: 'Indícale que se inscriba en el catálogo o que consulte con coordinación.',
        details: { participante: { id } },
      })
    }
    const marcas = (asistencias[claseId] ??= {})
    const previa = marcas[id]
    if (previa) {
      return error(409, {
        code: 'ASISTENCIA_YA_REGISTRADA',
        message: `Su asistencia ya se registró a las ${horaRegistro(previa)} No se duplica.`,
        details: { participante, horaRegistro: previa },
      })
    }
    const ahora = new Date().toISOString()
    marcas[id] = ahora
    if (metodo === 'DNI') marcasPorDni.add(`${claseId}:${id}`)
    else marcasPorDni.delete(`${claseId}:${id}`)
    const registro = { marcaId: `puerta-${++secuenciaMarca}`, participante, horaRegistro: ahora, metodo }
    registrosPuerta.set(registro.marcaId, { ...registro, claseId, actorId: usuario.id })
    return HttpResponse.json<RegistroPuertaRespuesta>(registro, { status: 201 })
  }),

  http.delete(`${API}/clases/:id/asistencia/puerta/:marcaId`, async ({ request, params }) => {
    const claseId = params.id as string
    const { respuesta, usuario } = validarEncargado(request, claseId)
    if (respuesta) return respuesta
    await delay(300)
    const marcaId = params.marcaId as string
    const marcas = asistencias[claseId]
    // Los identificadores p-N solo se conservan para la simulación histórica.
    const anterior = marcaId.startsWith('p-')
    const registro = anterior
      ? [...registrosPuerta.values()].find(r => r.claseId === claseId && r.participante.id === marcaId && marcas?.[marcaId] === r.horaRegistro)
      : registrosPuerta.get(marcaId)
    if (!registro || registro.claseId !== claseId ||
      marcas?.[registro.participante.id] !== registro.horaRegistro ||
      (usuario.rol !== 'ADMIN' && registro.actorId !== usuario.id)) {
      return anterior
        ? error(404, { code: 'ASISTENCIA_NO_REGISTRADA', message: 'No hay una asistencia registrada que deshacer.' })
        : error(409, { code: 'MARCA_NO_RECTIFICABLE', message: 'Esta marca ya no se puede deshacer desde la puerta.' })
    }
    const id = registro.participante.id
    delete marcas[id]
    registrosPuerta.delete(registro.marcaId)
    marcasPorDni.delete(`${claseId}:${id}`)
    return new HttpResponse(null, { status: 204 })
  }),
]
