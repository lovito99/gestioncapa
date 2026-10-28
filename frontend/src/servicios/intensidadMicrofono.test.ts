import { expect, it } from 'vitest'
import { intensidadMicrofono } from './intensidadMicrofono'

it('representa intensidad creciente y limita el medidor al rango 0–100', () => {
  expect(intensidadMicrofono(0.01, true)).toBe(10)
  expect(intensidadMicrofono(0.25, true)).toBe(50)
  expect(intensidadMicrofono(1, true)).toBe(100)
  expect(intensidadMicrofono(3, true)).toBe(100)
})
it('suprime silencio, ruido muy bajo, valores inválidos y micrófonos silenciados', () => {
  for (const nivel of [0, -1, 0.002, NaN, Infinity]) expect(intensidadMicrofono(nivel, true)).toBe(0)
  expect(intensidadMicrofono(0.8, false)).toBe(0)
})
