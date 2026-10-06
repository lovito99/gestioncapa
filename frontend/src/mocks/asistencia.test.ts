import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { handlers } from './handlers'

/**
 * Pruebas del flujo de asistencia del Sprint 1 contra la API simulada.
 * Sirven como especificación ejecutable de lo que debe responder el backend real.
 */
const BASE = 'http://localhost/api'
const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterEach(() => vi.useRealTimers())
afterAll(() => servidor.close())

const TOKEN_SESION = {
  coordinadora: 'demo-u-coord-1',
  instructor: 'demo-i-1',
  maria: 'demo-p-1', // inscrita en c-1 (ya marcó) y c-3
  luz: 'demo-p-7', // inscrita solo en c-3
}

async function llamar(metodo: string, ruta: string, sesion?: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(sesion ? { Authorization: `Bearer ${sesion}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const texto = await respuesta.text()
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null }
}

async function qrDe(claseId: string) {
  const { cuerpo } = await llamar('GET', `/clases/${claseId}/qr`, TOKEN_SESION.instructor)
  return cuerpo.token as string
}

describe('autorización por rol', () => {
  it('sin sesión responde 401', async () => {
    expect((await llamar('GET', '/clases')).status).toBe(401)
  })

  it('un participante no puede crear clases (403)', async () => {
    const { status, cuerpo } = await llamar('POST', '/clases', TOKEN_SESION.maria, {})
    expect(status).toBe(403)
    expect(cuerpo.code).toBe('SIN_PERMISO')
  })

  it('un instructor no puede ver el QR de una clase ajena (403)', async () => {
    const { status } = await llamar('GET', '/clases/c-2/qr', TOKEN_SESION.instructor)
    expect(status).toBe(403)
  })

  it('un participante no ve la lista de asistencia del grupo (403)', async () => {
    expect((await llamar('GET', '/clases/c-1/asistencia', TOKEN_SESION.maria)).status).toBe(403)
  })
})

describe('registro de asistencia por QR', () => {
  it('registra al participante inscrito y aparece como presente', async () => {
    const token = await qrDe('c-3')
    const { status, cuerpo } = await llamar('POST', '/asistencia/marcar', TOKEN_SESION.luz, { token })
    expect(status).toBe(201)
    expect(cuerpo.clase.id).toBe('c-3')

    const lista = await llamar('GET', '/clases/c-3/asistencia', TOKEN_SESION.coordinadora)
    const registro = lista.cuerpo.registros.find((r: { participante: { id: string } }) => r.participante.id === 'p-7')
    expect(registro.estado).toBe('PRESENTE')
  })

  it('rechaza el segundo registro del mismo participante', async () => {
    const token = await qrDe('c-3')
    const { status, cuerpo } = await llamar('POST', '/asistencia/marcar', TOKEN_SESION.luz, { token })
    expect(status).toBe(409)
    expect(cuerpo.code).toBe('ASISTENCIA_YA_REGISTRADA')
  })

  it('rechaza a un participante no inscrito', async () => {
    const token = await qrDe('c-1')
    const { status, cuerpo } = await llamar('POST', '/asistencia/marcar', TOKEN_SESION.luz, { token })
    expect(status).toBe(403)
    expect(cuerpo.code).toBe('NO_INSCRITO')
  })

  it('rechaza un QR alterado', async () => {
    const token = (await qrDe('c-3')).replace('c-3', 'c-1')
    const { cuerpo } = await llamar('POST', '/asistencia/marcar', TOKEN_SESION.maria, { token })
    expect(cuerpo.code).toBe('QR_INVALIDO')
  })

  it('rechaza un QR de otra clase', async () => {
    const token = await qrDe('c-1')
    const { cuerpo } = await llamar('POST', '/asistencia/marcar', TOKEN_SESION.maria, { token, claseId: 'c-3' })
    expect(cuerpo.code).toBe('QR_OTRA_CLASE')
  })

  it('rechaza un QR vencido (más de 30 s)', async () => {
    const token = await qrDe('c-3')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 31_000)
    const { status, cuerpo } = await llamar('POST', '/asistencia/marcar', TOKEN_SESION.maria, { token })
    expect(status).toBe(410)
    expect(cuerpo.code).toBe('QR_EXPIRADO')
  })

  it('el token del QR no contiene datos personales', async () => {
    const token = await qrDe('c-3')
    expect(token).not.toMatch(/@|maria|carlos/i)
  })
})
