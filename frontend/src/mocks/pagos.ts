import { delay, http, HttpResponse } from 'msw'
import type { Bandeja, ItemBandeja, Pago, PendientesPorDni, TransferenciaPago } from '@/servicios/pagos'
import { dniPorUsuario, enmascararDni } from './asistenciaPuerta'
import { participantes, usuarios } from './datos'
import { pdfTextoDemo } from './pdfTexto'

/**
 * Pagos del agremiado y bandeja del administrador (Figma S3 7.x y 8.x; HU-32, HU-54).
 * Simula el contrato de docs/API.md. La pasarela en línea es de pruebas: en la demo,
 * «Tarjeta» se aprueba y «Yape» se rechaza para poder ver los dos resultados.
 */
const API = import.meta.env.VITE_API_URL ?? '/api'
const COMISION = 3.5
const DESTINO = { id: 'bcp-1', banco: 'BCP', titular: 'Colegio de Profesores del Perú – Cusco', cuenta: '285-1234567-0-89', cci: '002-285-001234567089-12' }

type PagoSimulado = Pago & { usuarioId: string }
const pagosSimulados = new Map<string, PagoSimulado>()
const archivosVoucher = new Map<string, { tipo: string; contenidoBase64: string }>()
let siguientePago = 482
let siguienteOperacion = 1

const ahora = () => new Date().toISOString()
const nombreDe = (usuarioId: string) =>
  usuarios.find((u) => u.id === usuarioId)?.nombre ?? participantes.find((p) => p.id === usuarioId)?.nombre ?? usuarioId
const correoDe = (usuarioId: string) => {
  const correo = usuarios.find((u) => u.id === usuarioId)?.email ?? participantes.find((p) => p.id === usuarioId)?.email
  if (!correo) return null
  const [nombre = '', dominio = ''] = correo.split('@')
  return `${nombre.charAt(0)}•••@${dominio}`
}
const error = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  HttpResponse.json({ code, message, ...(fields ? { fields } : {}) }, { status })

/** Crea la orden de pago de una inscripción (la llama el mock de cursos al inscribir). */
export function crearPago(datos: { cursoId: string; cursoTitulo: string; usuarioId: string; importeCentimos: number; plazoMinutos: number | null; concepto?: Pago['concepto'] }) {
  const id = String(siguientePago++)
  const pago: PagoSimulado = {
    id,
    usuarioId: datos.usuarioId,
    cursoId: datos.cursoId,
    concepto: datos.concepto ?? 'CURSO',
    importeCentimos: datos.importeCentimos,
    moneda: 'PEN',
    estado: 'PENDIENTE',
    cursoTitulo: datos.cursoTitulo,
    participanteNombre: nombreDe(datos.usuarioId),
    exigible: true,
    operaciones: [],
    incidencias: [],
    transferencias: [],
    destinoTransferencia: DESTINO,
    notificaciones: [],
    medios: { izipay: true, culqi: false, efectivo: true, transferencia: true, entorno: 'sandbox' },
    codigoOrden: `ORD-${new Date().getFullYear()}-${id.padStart(5, '0')}`,
    comisionEnLinea: { porcentaje: COMISION, importeCentimos: Math.round((datos.importeCentimos * COMISION) / 100) },
    venceEn: datos.plazoMinutos ? new Date(Date.now() + datos.plazoMinutos * 60000).toISOString() : null,
    correoEnmascarado: correoDe(datos.usuarioId),
  }
  pagosSimulados.set(id, pago)
  return pago
}

export const pagoDeInscripcion = (cursoId: string, usuarioId: string) =>
  [...pagosSimulados.values()].find((p) => p.cursoId === cursoId && p.usuarioId === usuarioId)

function confirmar(pago: PagoSimulado) {
  pago.estado = 'PAGADO'
  pago.notificaciones = [...(pago.notificaciones ?? []), { id: `n-${pago.id}-${Date.now()}`, tipo: 'COMPROBANTE', estado: 'ENVIADO', intentos: 1, enviadoEn: ahora() }]
}

/** Voucher de ejemplo para la bandeja de la demo (imagen de 1 × 1 px). */
const VOUCHER_DEMO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function declarar(pago: PagoSimulado, referencia: string, voucher: { tipo: string; contenidoBase64: string }, nombre = 'voucher-bcp.jpg'): TransferenciaPago {
  const operacionId = `op-${siguienteOperacion++}`
  archivosVoucher.set(operacionId, voucher)
  const transferencia: TransferenciaPago = {
    ...DESTINO,
    operacionId,
    referencia,
    fechaOperacion: ahora().slice(0, 10),
    estado: 'DECLARADO',
    motivoRechazo: null,
    declaradaEn: ahora(),
    voucher: {
      id: `v-${operacionId}`, version: 1, tipo: voucher.tipo as 'image/png', tamano: Math.floor((voucher.contenidoBase64.length * 3) / 4),
      hash: nombre, disponible: true, eliminarEn: new Date(Date.now() + 90 * 86400000).toISOString(), eliminadoEn: null,
    },
  }
  pago.transferencias.push(transferencia)
  pago.operaciones.push({ id: operacionId, medio: 'TRANSFERENCIA', estado: 'DECLARADO', referenciaExterna: referencia })
  return transferencia
}

/** Pagos de ejemplo para que la bandeja del administrador tenga datos (Figma S3 8.1). */
export function sembrarPagosDemo(cursos: { id: string; titulo: string; importeCentimos: number }[]) {
  const [evaluacion, comprension, otro] = cursos
  if (!evaluacion || !comprension) return
  const enRevision = crearPago({ cursoId: evaluacion.id, cursoTitulo: evaluacion.titulo, usuarioId: 'p-2', importeCentimos: evaluacion.importeCentimos, plazoMinutos: 4320 })
  declarar(enRevision, '00482917', { tipo: 'image/png', contenidoBase64: VOUCHER_DEMO })
  const yape = crearPago({ cursoId: comprension.id, cursoTitulo: comprension.titulo, usuarioId: 'p-3', importeCentimos: comprension.importeCentimos, plazoMinutos: null, concepto: 'CONSTANCIA' })
  yape.operaciones.push({ id: `op-${siguienteOperacion++}`, medio: 'IZIPAY', estado: 'CONFIRMADO', referenciaExterna: 'IZI-7781', detalle: 'Yape', confirmadoEn: ahora() })
  confirmar(yape)
  const efectivo = crearPago({ cursoId: (otro ?? comprension).id, cursoTitulo: (otro ?? comprension).titulo, usuarioId: 'p-4', importeCentimos: (otro ?? comprension).importeCentimos, plazoMinutos: null })
  efectivo.operaciones.push({ id: `op-${siguienteOperacion++}`, medio: 'EFECTIVO', estado: 'CONFIRMADO', referenciaExterna: '0158', detalle: 'Recibo 0158', confirmadoEn: ahora() })
  confirmar(efectivo)
  const rechazado = crearPago({ cursoId: evaluacion.id, cursoTitulo: evaluacion.titulo, usuarioId: 'p-5', importeCentimos: evaluacion.importeCentimos, plazoMinutos: 4320 })
  const t = declarar(rechazado, '00477310', { tipo: 'image/png', contenidoBase64: VOUCHER_DEMO })
  t.estado = 'RECHAZADO'
  t.motivoRechazo = 'El monto no coincide. El voucher muestra S/ 50.00.'
  rechazado.operaciones.at(-1)!.estado = 'RECHAZADO'
}

function sesion(request: Request) {
  const id = request.headers.get('Authorization')?.replace('Bearer demo-', '')
  return usuarios.find((u) => u.id === id && u.activo !== false)
}

/** El agremiado solo ve sus pagos; el administrador, todos. */
function accesoPago(request: Request, id: string, soloAdmin = false) {
  const usuario = sesion(request)
  if (!usuario) return { respuesta: error(401, 'NO_AUTENTICADO', 'Tu sesión expiró. Vuelve a iniciar sesión.') }
  const pago = pagosSimulados.get(id)
  if (!pago) return { respuesta: error(404, 'PAGO_NO_EXISTE', 'El pago no existe.') }
  if (usuario.rol !== 'ADMIN' && (soloAdmin || pago.usuarioId !== usuario.id)) return { respuesta: error(403, 'SIN_PERMISO', 'No tienes permiso para ver este pago.') }
  return { pago, usuario }
}

const publico = ({ usuarioId: _usuarioId, ...pago }: PagoSimulado): Pago => pago

function itemsBandeja(): ItemBandeja[] {
  const items: ItemBandeja[] = []
  for (const pago of pagosSimulados.values()) {
    const base = { pagoId: pago.id, codigoOrden: pago.codigoOrden!, agremiado: { nombre: pago.participanteNombre, dniParcial: enmascararDni(dniPorUsuario[pago.usuarioId]) }, cursoTitulo: pago.cursoTitulo, concepto: pago.concepto, importeCentimos: pago.importeCentimos }
    for (const t of pago.transferencias) {
      items.push({ ...base, operacionId: t.operacionId, medio: 'TRANSFERENCIA', detalleMedio: 'Transferencia', referencia: t.referencia, fecha: t.declaradaEn ?? t.fechaOperacion,
        estado: t.estado === 'CONFIRMADO' ? 'CONFIRMADO' : t.estado === 'RECHAZADO' ? 'RECHAZADO' : 'EN_REVISION' })
    }
    for (const op of pago.operaciones.filter((o) => (o.medio === 'IZIPAY' || o.medio === 'EFECTIVO') && o.estado === 'CONFIRMADO')) {
      items.push({ ...base, operacionId: op.id, medio: op.medio as 'IZIPAY' | 'EFECTIVO', detalleMedio: op.medio === 'EFECTIVO' ? 'Efectivo' : `${op.detalle ?? 'Tarjeta'} (en línea)`,
        referencia: op.medio === 'EFECTIVO' ? (op.detalle ?? null) : null, fecha: op.confirmadoEn ?? ahora(), estado: 'CONFIRMADO' })
    }
  }
  return items.sort((a, b) => (a.estado === 'EN_REVISION' ? 0 : 1) - (b.estado === 'EN_REVISION' ? 0 : 1) || b.fecha.localeCompare(a.fecha))
}

export const handlersPagos = [
  // Las rutas fijas van antes de `/pagos/:id`
  http.get(`${API}/pagos/bandeja`, async ({ request }) => {
    const usuario = sesion(request)
    if (!usuario) return error(401, 'NO_AUTENTICADO', 'Tu sesión expiró. Vuelve a iniciar sesión.')
    if (usuario.rol !== 'ADMIN') return error(403, 'SIN_PERMISO', 'Solo el administrador revisa los pagos.')
    await delay(250)
    const url = new URL(request.url)
    const estado = url.searchParams.get('estado')
    const buscar = (url.searchParams.get('buscar') ?? '').trim().toLowerCase()
    const todos = itemsBandeja()
    const mes = ahora().slice(0, 7)
    const items = todos.filter((i) => (!estado || i.estado === estado) &&
      (!buscar || [i.agremiado.nombre, i.codigoOrden, i.referencia ?? '', dniPorUsuario[pagosSimulados.get(i.pagoId)!.usuarioId] ?? ''].some((v) => v.toLowerCase().includes(buscar))))
    return HttpResponse.json<Bandeja>({
      resumen: {
        enRevision: todos.filter((i) => i.estado === 'EN_REVISION').length,
        confirmadosMes: todos.filter((i) => i.estado === 'CONFIRMADO' && i.fecha.startsWith(mes)).length,
        rechazadosMes: todos.filter((i) => i.estado === 'RECHAZADO' && i.fecha.startsWith(mes)).length,
      },
      items,
    })
  }),

  http.get(`${API}/pagos/pendientes`, async ({ request }) => {
    const usuario = sesion(request)
    if (!usuario) return error(401, 'NO_AUTENTICADO', 'Tu sesión expiró. Vuelve a iniciar sesión.')
    if (usuario.rol !== 'ADMIN') return error(403, 'SIN_PERMISO', 'Solo el administrador registra pagos en efectivo.')
    await delay(250)
    const dni = new URL(request.url).searchParams.get('dni')?.trim() ?? ''
    if (!/^\d{8}$/.test(dni)) return error(422, 'VALIDACION', 'El DNI debe tener 8 números.', { dni: 'El DNI debe tener 8 números.' })
    const usuarioId = Object.entries(dniPorUsuario).find(([, v]) => v === dni)?.[0]
    if (!usuarioId) return error(404, 'DNI_NO_ENCONTRADO', 'No encontramos un agremiado con ese DNI.')
    return HttpResponse.json<PendientesPorDni>({
      agremiado: { nombre: nombreDe(usuarioId), dniParcial: enmascararDni(dni) },
      pagos: [...pagosSimulados.values()].filter((p) => p.usuarioId === usuarioId && p.estado === 'PENDIENTE')
        .map((p) => ({ pagoId: p.id, codigoOrden: p.codigoOrden!, cursoTitulo: p.cursoTitulo, concepto: p.concepto, importeCentimos: p.importeCentimos })),
    })
  }),

  http.get(`${API}/pagos/:id`, async ({ request, params }) => {
    const { respuesta, pago } = accesoPago(request, params.id as string)
    if (respuesta) return respuesta
    await delay(200)
    return HttpResponse.json(publico(pago))
  }),

  http.post(`${API}/pagos/:id/intentos`, async ({ request, params }) => {
    const { respuesta, pago } = accesoPago(request, params.id as string)
    if (respuesta) return respuesta
    await delay(700)
    if (pago.estado === 'PAGADO') return error(409, 'PAGO_YA_CONFIRMADO', 'Este pago ya está confirmado.')
    const { instrumento } = (await request.json()) as { instrumento?: 'TARJETA' | 'YAPE' }
    const operacionId = `op-${siguienteOperacion++}`
    // Demo de pruebas: tarjeta → aprobado; Yape → rechazado
    const aprobado = instrumento !== 'YAPE'
    pago.operaciones.push({ id: operacionId, medio: 'IZIPAY', estado: aprobado ? 'CONFIRMADO' : 'RECHAZADO', referenciaExterna: `IZI-${operacionId}`,
      detalle: instrumento === 'YAPE' ? 'Yape' : 'Tarjeta Visa •••• 4242', confirmadoEn: aprobado ? ahora() : null })
    if (aprobado) confirmar(pago)
    return HttpResponse.json({ operacionId, estado: aprobado ? 'CONFIRMADO' : 'RECHAZADO' })
  }),

  http.post(`${API}/pagos/:id/transferencias`, async ({ request, params }) => {
    const { respuesta, pago } = accesoPago(request, params.id as string)
    if (respuesta) return respuesta
    await delay(500)
    const entrada = (await request.json()) as Record<string, unknown> & { referencia?: string; voucher?: { tipo: string; contenidoBase64: string } }
    // Igual que el backend (esquema estricto): un campo desconocido es 422
    const desconocidos = Object.keys(entrada).filter((clave) => !['destinoId', 'clave', 'referencia', 'fechaOperacion', 'voucher'].includes(clave))
    if (desconocidos.length) return error(422, 'VALIDACION', `Campos no permitidos: ${desconocidos.join(', ')}.`)
    const referencia = entrada.referencia?.trim() ?? ''
    if (referencia.length < 3) return error(422, 'VALIDACION', 'Ingresa el número de operación.', { referencia: 'Ingresa el número de operación de tu voucher.' })
    if (!entrada.voucher?.contenidoBase64) return error(422, 'VALIDACION', 'Sube tu voucher.', { voucher: 'Sube tu voucher.' })
    const repetida = [...pagosSimulados.values()].some((p) => p.transferencias.some((t) => t.referencia === referencia && t.estado !== 'RECHAZADO'))
    if (repetida) return error(409, 'OPERACION_DUPLICADA', 'Este número de operación ya fue registrado en otro pago. Revisa tu voucher.', { referencia: 'Este número de operación ya fue registrado en otro pago. Revisa tu voucher.' })
    if (pago.estado === 'PAGADO') return error(409, 'PAGO_YA_CONFIRMADO', 'Este pago ya está confirmado.')
    const transferencia = declarar(pago, referencia, entrada.voucher)
    return HttpResponse.json({ operacionId: transferencia.operacionId, estado: 'DECLARADO' }, { status: 201 })
  }),

  http.get(`${API}/pagos/:id/transferencias/:operacionId/voucher`, ({ request, params }) => {
    const { respuesta } = accesoPago(request, params.id as string)
    if (respuesta) return respuesta
    const archivo = archivosVoucher.get(params.operacionId as string)
    if (!archivo) return error(404, 'VOUCHER_NO_DISPONIBLE', 'El voucher ya no está disponible.')
    const bytes = Uint8Array.from(atob(archivo.contenidoBase64), (c) => c.charCodeAt(0))
    return new HttpResponse(bytes, { headers: { 'Content-Type': archivo.tipo } })
  }),

  http.post(`${API}/pagos/:id/transferencias/:operacionId/revision`, async ({ request, params }) => {
    const { respuesta, pago } = accesoPago(request, params.id as string, true)
    if (respuesta) return respuesta
    await delay(400)
    const transferencia = pago.transferencias.find((t) => t.operacionId === params.operacionId)
    if (!transferencia) return error(404, 'OPERACION_NO_EXISTE', 'La transferencia no existe.')
    if (transferencia.estado !== 'DECLARADO') return error(409, 'YA_REVISADA', 'Esta transferencia ya fue revisada.')
    const entrada = (await request.json()) as { decision: 'CONFIRMAR' | 'RECHAZAR'; motivo?: string }
    const operacion = pago.operaciones.find((o) => o.id === transferencia.operacionId)!
    if (entrada.decision === 'RECHAZAR') {
      if (!entrada.motivo || entrada.motivo.trim().length < 5) return error(422, 'VALIDACION', 'Selecciona un motivo para poder rechazar.', { motivo: 'Selecciona un motivo para poder rechazar.' })
      transferencia.estado = 'RECHAZADO'
      transferencia.motivoRechazo = entrada.motivo.trim()
      operacion.estado = 'RECHAZADO'
      return HttpResponse.json({ estado: 'RECHAZADO' })
    }
    transferencia.estado = 'CONFIRMADO'
    operacion.estado = 'CONFIRMADO'
    operacion.confirmadoEn = ahora()
    confirmar(pago)
    return HttpResponse.json({ estado: 'CONFIRMADO' })
  }),

  http.post(`${API}/pagos/:id/efectivo`, async ({ request, params }) => {
    const { respuesta, pago } = accesoPago(request, params.id as string, true)
    if (respuesta) return respuesta
    await delay(400)
    const { referencia, importeCentimos } = (await request.json()) as { referencia: string; importeCentimos: number; fechaRecepcion: string }
    if (pago.estado === 'PAGADO') return error(409, 'PAGO_YA_CONFIRMADO', 'Este pago ya está confirmado.')
    if (importeCentimos !== pago.importeCentimos) return error(422, 'IMPORTE_NO_COINCIDE', 'El monto recibido debe ser igual al importe del curso.', { importe: 'El monto recibido debe ser igual al importe del curso.' })
    pago.operaciones.push({ id: `op-${siguienteOperacion++}`, medio: 'EFECTIVO', estado: 'CONFIRMADO', referenciaExterna: referencia, detalle: `Recibo ${referencia}`, confirmadoEn: ahora() })
    confirmar(pago)
    return HttpResponse.json(publico(pago))
  }),

  http.get(`${API}/pagos/:id/comprobante`, ({ request, params }) => {
    const { respuesta, pago } = accesoPago(request, params.id as string)
    if (respuesta) return respuesta
    if (pago.estado !== 'PAGADO') return error(409, 'PAGO_PENDIENTE', 'El comprobante estará disponible cuando se confirme el pago.')
    const op = pago.operaciones.find((o) => o.estado === 'CONFIRMADO')
    const pdf = pdfTextoDemo('Comprobante de pago - CPPP Región Cusco', [
      `Código de orden: ${pago.codigoOrden}`, `Agremiado: ${pago.participanteNombre}`, `Curso: ${pago.cursoTitulo}`,
      `Importe: S/ ${(pago.importeCentimos / 100).toFixed(2)}`, `Medio: ${op?.detalle ?? op?.medio ?? '—'}`, `Fecha: ${op?.confirmadoEn ?? ''}`,
    ])
    return new HttpResponse(pdf, { headers: { 'Content-Type': 'application/pdf' } })
  }),
]
