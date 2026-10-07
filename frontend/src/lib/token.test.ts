import { describe, expect, it } from 'vitest'
import { tokenExpirado } from './token'

const AHORA = Date.UTC(2026, 9, 6, 12, 0, 0)
const segundos = (ms: number) => Math.floor(ms / 1000)

/** JWT sin firma válida: el cliente solo lee `exp`, la firma la verifica el servidor. */
const jwt = (payload: object) =>
  ['{"alg":"HS256","typ":"JWT"}', JSON.stringify(payload)]
    .map((parte) => btoa(parte).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))
    .concat('firma')
    .join('.')

describe('SES-01: Detectar expiración del token', () => {
  it('Dado un JWT con exp en el pasado, entonces está expirado', () => {
    expect(tokenExpirado(jwt({ sub: '1', exp: segundos(AHORA) - 1 }), AHORA)).toBe(true)
  })

  it('Dado un JWT con exp exactamente ahora, entonces está expirado', () => {
    expect(tokenExpirado(jwt({ sub: '1', exp: segundos(AHORA) }), AHORA)).toBe(true)
  })

  it('Dado un JWT con exp en el futuro, entonces está vigente', () => {
    expect(tokenExpirado(jwt({ sub: '1', exp: segundos(AHORA) + 60 }), AHORA)).toBe(false)
  })

  it('Dado un token ausente o vacío, entonces está expirado', () => {
    expect(tokenExpirado(null, AHORA)).toBe(true)
    expect(tokenExpirado('', AHORA)).toBe(true)
  })

  it('Dado un token demo sin formato JWT, entonces está vigente', () => {
    expect(tokenExpirado('demo-u-coord-1', AHORA)).toBe(false)
  })

  it('Dado un JWT sin exp o con payload ilegible, entonces lo decide el servidor (vigente)', () => {
    expect(tokenExpirado(jwt({ sub: '1' }), AHORA)).toBe(false)
    expect(tokenExpirado('a.%%%.c', AHORA)).toBe(false)
  })
})
