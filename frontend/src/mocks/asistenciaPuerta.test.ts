import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { enmascararDni, tokenPersonal } from './asistenciaPuerta'
import { handlers } from './handlers'

/**
 * HU-39: QR personal y asistencia en la puerta contra la API simulada.
 * Es la especificación ejecutable del contrato descrito en docs/API.md.
 */
const BASE = 'http://localhost/api'
const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterAll(() => servidor.close())

const SESION = {
  admin: 'demo-u-coord-1',
  instructor: 'demo-i-1', // dicta c-1
  instructora: 'demo-i-2',
  maria: 'demo-p-1', // inscrita en c-1 (ya marcó) y c-3
  luz: 'demo-p-7', // inscrita solo en c-3
}

async function llamar(metodo: string, ruta: string, sesion?: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(sesion ? { Authorization: `Bearer ${sesion}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const tipo = respuesta.headers.get('Content-Type') ?? ''
  const texto = tipo.includes('pdf') ? '' : await respuesta.text()
  return { status: respuesta.status, tipo, cuerpo: texto ? JSON.parse(texto) : null }
}

describe('Mi QR', () => {
  it('el agremiado recibe su QR personal con nombre, DNI parcial y habilitación', async () => {
    const { status, cuerpo } = await llamar('GET', '/participante/mi-qr', SESION.maria)
    expect(status).toBe(200)
    expect(cuerpo).toMatchObject({ nombre: 'María Fernanda Quispe Ramos', dniParcial: '•••• 4567', habilitado: true })
    expect(cuerpo.token).toBe(tokenPersonal('p-1'))
    // El QR no expone el DNI completo
    expect(cuerpo.token).not.toContain('41234567')
    expect(cuerpo).toHaveProperty('proximaSesion')
  })

  it('es el mismo QR en cada consulta', async () => {
    const a = await llamar('GET', '/participante/mi-qr', SESION.maria)
    const b = await llamar('GET', '/participante/mi-qr', SESION.maria)
    expect(a.cuerpo.token).toBe(b.cuerpo.token)
  })

  it('se descarga en PDF', async () => {
    const { status, tipo } = await llamar('GET', '/participante/mi-qr/pdf', SESION.maria)
    expect(status).toBe(200)
    expect(tipo).toContain('application/pdf')
  })

  it('solo los agremiados tienen QR personal', async () => {
    expect((await llamar('GET', '/participante/mi-qr')).status).toBe(401)
    expect((await llamar('GET', '/participante/mi-qr', SESION.admin)).status).toBe(403)
  })
})

describe('asistencia en la puerta', () => {
  it('escanear el QR personal registra la asistencia y devuelve nombre y DNI parcial', async () => {
    const { status, cuerpo } = await llamar('POST', '/clases/c-3/asistencia/puerta', SESION.admin, { token: tokenPersonal('p-7') })
    expect(status).toBe(201)
    expect(cuerpo.metodo).toBe('QR')
    expect(cuerpo.participante).toEqual({ id: 'p-7', nombre: 'Luz Marina Apaza Choque', dniParcial: '•••• 0123' })
  })

  it('no duplica la asistencia ya registrada', async () => {
    const { status, cuerpo } = await llamar('POST', '/clases/c-3/asistencia/puerta', SESION.admin, { token: tokenPersonal('p-7') })
    expect(status).toBe(409)
    expect(cuerpo.code).toBe('ASISTENCIA_YA_REGISTRADA')
    expect(cuerpo.details.participante.nombre).toBe('Luz Marina Apaza Choque')
    expect(cuerpo.details.horaRegistro).toEqual(expect.any(String))
    const lista = await llamar('GET', '/clases/c-3/asistencia', SESION.admin)
    const marcas = lista.cuerpo.registros.filter((r: { participante: { id: string } }) => r.participante.id === 'p-7')
    expect(marcas).toHaveLength(1)
    expect(marcas[0].metodo).toBe('QR')
  })

  it('deshacer borra la marca y permite registrarla de nuevo', async () => {
    expect((await llamar('DELETE', '/clases/c-3/asistencia/puerta/p-7', SESION.admin)).status).toBe(204)
    expect((await llamar('DELETE', '/clases/c-3/asistencia/puerta/p-7', SESION.admin)).cuerpo.code).toBe('ASISTENCIA_NO_REGISTRADA')
    expect((await llamar('POST', '/clases/c-3/asistencia/puerta', SESION.admin, { token: tokenPersonal('p-7') })).status).toBe(201)
  })

  it('rechaza a un agremiado no inscrito', async () => {
    const { status, cuerpo } = await llamar('POST', '/clases/c-1/asistencia/puerta', SESION.instructor, { token: tokenPersonal('p-7') })
    expect(status).toBe(409)
    expect(cuerpo.code).toBe('NO_INSCRITO')
    expect(cuerpo.details.participante.id).toBe('p-7')
  })

  it.each([
    ['alterado', `${tokenPersonal('p-7').slice(0, -1)}0`],
    ['de otro usuario con firma ajena', tokenPersonal('p-7').replace('p-7', 'p-1')],
    ['de otro sistema', 'https://ejemplo.com/cualquier-cosa'],
  ])('rechaza un QR %s', async (_caso, token) => {
    const { status, cuerpo } = await llamar('POST', '/clases/c-1/asistencia/puerta', SESION.instructor, { token })
    expect(status).toBe(422)
    expect(cuerpo.code).toBe('QR_PERSONAL_INVALIDO')
  })

  it('busca inscritos por los primeros dígitos del DNI y registra al elegido', async () => {
    const busqueda = await llamar('GET', '/clases/c-1/asistencia/puerta?dni=4345', SESION.instructor)
    expect(busqueda.status).toBe(200)
    expect(busqueda.cuerpo.resultados).toEqual([
      { participante: { id: 'p-3', nombre: 'Rosa Elena Ccahuana Palomino', dniParcial: '•••• 6789' }, horaRegistro: null },
    ])
    const registro = await llamar('POST', '/clases/c-1/asistencia/puerta', SESION.instructor, { participanteId: 'p-3' })
    expect(registro.status).toBe(201)
    expect(registro.cuerpo.metodo).toBe('DNI')

    const despues = await llamar('GET', '/clases/c-1/asistencia/puerta?dni=4345', SESION.instructor)
    expect(despues.cuerpo.resultados[0].horaRegistro).toEqual(expect.any(String))
    const lista = await llamar('GET', '/clases/c-1/asistencia', SESION.instructor)
    expect(lista.cuerpo.registros.find((r: { participante: { id: string } }) => r.participante.id === 'p-3').metodo).toBe('DNI')
  })

  it('la búsqueda solo devuelve inscritos y exige al menos 4 dígitos', async () => {
    // Luz (47890123) existe pero no está inscrita en c-1
    expect((await llamar('GET', '/clases/c-1/asistencia/puerta?dni=4789', SESION.instructor)).cuerpo.resultados).toEqual([])
    expect((await llamar('GET', '/clases/c-1/asistencia/puerta?dni=123', SESION.instructor)).status).toBe(422)
  })

  it('un instructor no toma asistencia en una clase ajena y un agremiado no puede usarla', async () => {
    expect((await llamar('POST', '/clases/c-1/asistencia/puerta', SESION.instructora, { participanteId: 'p-6' })).status).toBe(403)
    expect((await llamar('POST', '/clases/c-1/asistencia/puerta', SESION.maria, { participanteId: 'p-6' })).status).toBe(403)
    expect((await llamar('DELETE', '/clases/c-1/asistencia/puerta/p-1', SESION.maria)).status).toBe(403)
  })
})

describe('enmascararDni', () => {
  it('muestra solo los 4 últimos dígitos', () => {
    expect(enmascararDni('41234567')).toBe('•••• 4567')
    expect(enmascararDni(undefined)).toBeNull()
  })
})
