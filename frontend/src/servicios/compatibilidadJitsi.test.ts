import { describe, expect, it, vi } from 'vitest'
import { adaptarServiciosJitsi, normalizarServiciosVacios } from './compatibilidadJitsi'

describe('Servicios ICE recibidos de Prosody', () => {
  it('convierte únicamente el objeto vacío de servicios, sin mutar los metadatos', () => {
    const metadatos = { services: {}, startMuted: { audio: false } }
    expect(normalizarServiciosVacios(metadatos)).toEqual({ services: [], startMuted: { audio: false } })
    expect(metadatos.services).toEqual({})
  })
  it('conserva las credenciales STUN/TURN y las respuestas XML extdisco', () => {
    const respuesta = { services: [{ type: 'turn', host: 'turn.prueba.local', username: 'usuario', password: 'credencialPrueba', port: 3478 }] }
    expect(normalizarServiciosVacios(respuesta)).toBe(respuesta)
    const xml = { querySelectorAll: vi.fn(), services: {} }
    expect(normalizarServiciosVacios(xml)).toBe(xml)
    for (const valor of [null, undefined, {}, { services: null }, { services: [] }, { services: { inesperado: true } }]) expect(normalizarServiciosVacios(valor)).toBe(valor)
  })
  it('mantiene el contexto, el retorno y los errores del receptor original y no duplica el adaptador', () => {
    const recibir = vi.fn(function (this: unknown, respuesta: unknown) { return { contexto: this, respuesta } })
    const receptor = { onReceiveStunAndTurnCredentials: recibir }
    const conexion = { _xmpp: { connection: { jingle: receptor } } }
    expect(adaptarServiciosJitsi(conexion)).toBe(true)
    const adaptado = receptor.onReceiveStunAndTurnCredentials
    expect(adaptarServiciosJitsi(conexion)).toBe(true)
    expect(receptor.onReceiveStunAndTurnCredentials).toBe(adaptado)
    expect(receptor.onReceiveStunAndTurnCredentials({ services: {} })).toEqual({ contexto: receptor, respuesta: { services: [] } })
    expect(recibir).toHaveBeenCalledTimes(1)
    recibir.mockImplementationOnce(() => { throw new Error('Fallo original') })
    expect(() => receptor.onReceiveStunAndTurnCredentials({ services: [] })).toThrow('Fallo original')
    expect(adaptarServiciosJitsi({})).toBe(false)
  })
})
