import { expect, it } from 'vitest'
import { esReaccion, instanteMano, numerarManos } from './interaccionesSala'

it('numera manos por instante y resuelve empates igual en todas las sesiones', () => {
  const personas = [
    { identificador: 'tercera', manoLevantada: true, manoLevantadaEn: 300 },
    { identificador: 'b', manoLevantada: true, manoLevantadaEn: 100 },
    { identificador: 'a', manoLevantada: true, manoLevantadaEn: 100 },
    { identificador: 'sinMano', manoLevantada: false },
  ]
  const turnos = (lista: typeof personas) => Object.fromEntries(numerarManos(lista).map(persona => [persona.identificador, persona.turnoMano]))
  expect(turnos(personas)).toEqual({ tercera: 3, b: 2, a: 1, sinMano: undefined })
  expect(turnos([...personas].reverse())).toEqual(turnos(personas))
  expect(turnos(personas.filter(persona => persona.identificador !== 'a'))).toEqual({ tercera: 2, b: 1, sinMano: undefined })
})
it('al bajar y volver a levantar la mano pasa al final', () => {
  expect(numerarManos([{ identificador: 'a', manoLevantada: true, manoLevantadaEn: 500 }, { identificador: 'b', manoLevantada: true, manoLevantadaEn: 300 }]).map(persona => persona.turnoMano)).toEqual([2, 1])
  expect(instanteMano('true')).toBeUndefined()
  expect(instanteMano('1700000000000')).toBe(1700000000000)
  expect(instanteMano('Infinity')).toBeUndefined()
})
it('acepta únicamente reacciones conocidas con identificador válido', () => {
  const reaccion = { tipo: 'reaccionGestionCapa', identificador: '6125b493-e65a-43d0-b843-d5681cf42a45', emoji: '👏' }
  expect(esReaccion(reaccion)).toBe(true)
  expect(esReaccion({ ...reaccion, emoji: '<script>' })).toBe(false)
  expect(esReaccion({ ...reaccion, identificador: 'falso' })).toBe(false)
})
