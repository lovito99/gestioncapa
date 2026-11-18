import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { handlers } from './handlers'

const curso = '/cursos/24001'
const aula = `${curso}/aula`
const servidor = setupServer(...handlers)
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterAll(() => servidor.close())

function llamar(ruta: string, usuario?: string, cuerpo?: unknown, metodo = cuerpo === undefined ? 'GET' : 'POST') {
  return fetch(`http://localhost/api${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(usuario ? { Authorization: `Bearer demo-${usuario}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
}

it('mantiene fijos el programa y la gratuidad del curso de ejemplo', async () => {
  const programa = await llamar(curso, 'u-admin-1', {
    titulo: 'Otro curso', instructorId: 'i-1', horasLectivas: 2, modalidad: 'GRABADO', costo: 0,
    cupos: 100, tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Otro módulo' }],
  }, 'PUT')
  const cobro = await llamar(`${curso}/cobro`, 'u-admin-1', {
    modalidadCobro: 'PREVIO', costo: 50, precioGeneral: 60, plazoPagoMinutos: 60, versionCobro: 1,
  }, 'PATCH')
  expect(programa.status).toBe(409)
  expect(cobro.status).toBe(409)
})

it('protege el aula y la descarga, valida el avance y lo aísla por inscripción', async () => {
  expect((await llamar(aula)).status).toBe(401)
  expect((await llamar(aula, 'u-admin-1')).status).toBe(403)
  expect((await llamar(aula, 'p-7')).status).toBe(403)
  expect((await llamar(`${aula}/constancia`, 'p-7')).status).toBe(403)
  expect((await llamar(`${curso}/inscribirme`, 'p-1', {})).status).toBe(201)
  expect((await llamar(`${curso}/inscribirme`, 'p-7', {})).status).toBe(201)
  expect((await llamar(`${aula}/constancia`, 'p-1')).status).toBe(409)
  const inicial = await (await llamar(aula, 'p-1')).json()
  const [leccion, evaluacion] = inicial.modulos[0].actividades
  expect(evaluacion).not.toHaveProperty('respuesta')
  expect((await llamar(`${aula}/actividades/${evaluacion.id}`, 'p-1', { opcion: 1 })).status).toBe(409)
  const actividad = `${aula}/actividades/${leccion.id}`
  expect((await llamar(actividad, 'p-1', { opcion: 20 })).status).toBe(422)
  await llamar(actividad, 'p-1', {})
  expect(await (await llamar(actividad, 'p-1', {})).json()).toEqual({ correcta: true, completadas: [leccion.id] })
  expect((await (await llamar(aula, 'p-7')).json()).completadas).toEqual([])
})
