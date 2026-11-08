import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { handlers } from './handlers'
import { asistencias } from './datos'

const servidor = setupServer(...handlers)
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterAll(() => servidor.close())
const llamar = async (method: string, ruta: string, usuario = 'u-admin-1', cuerpo?: object) => {
  const respuesta = await fetch(`http://localhost/api${ruta}`, { method,
    headers: { Authorization: `Bearer demo-${usuario}`, 'Content-Type': 'application/json' },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}) })
  return { status: respuesta.status, datos: await respuesta.json() }
}
async function crear(modalidad = 'PRESENCIAL') {
  const respuesta = await llamar('POST', '/cursos', 'u-admin-1', { titulo: 'Sesiones demo', instructorId: 'i-1', horasLectivas: 10,
    modalidad, costo: 0, cupos: 30, tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Práctica' }] })
  expect(respuesta.status).toBe(201)
  return respuesta.datos.id as string
}
const entrada = { nombre: 'Práctica presencial', fecha: '2038-06-10', horaInicio: '10:00', horaFin: '11:00', lugar: 'Auditorio CPPP' }

it('demo: valida permisos, modalidad, fecha y horario, y mantiene la asociación al curso', async () => {
  const id = await crear()
  const ruta = `/cursos/${id}/sesiones`
  for (const usuario of ['i-1', 'i-2', 'p-1']) expect((await llamar('POST', ruta, usuario, entrada)).status).toBe(403)
  for (const cambio of [{ fecha: '2038-02-30' }, { horaFin: '09:00' }, { lugar: ' ' }]) {
    expect((await llamar('POST', ruta, 'u-admin-1', { ...entrada, ...cambio })).status).toBe(422)
  }
  const virtual = await crear('VIRTUAL')
  expect((await llamar('POST', `/cursos/${virtual}/sesiones`, 'u-admin-1', entrada)).status).toBe(409)
  const guardada = await llamar('POST', ruta, 'u-admin-1', entrada)
  expect(guardada.status).toBe(201)
  expect(guardada.datos.cursoId).toBe(id)
  expect((await llamar('GET', `/cursos/${id}`)).datos.sesiones[0]).toMatchObject(entrada)
  expect((await llamar('POST', ruta, 'u-admin-1', entrada)).status).toBe(409)
})

it('demo: la asistencia considera solo sesiones no canceladas del curso y compara el 80 %', async () => {
  const id = await crear()
  const ruta = `/cursos/${id}`
  expect((await llamar('GET', `${ruta}/mi-asistencia`, 'p-1')).status).toBe(403)
  expect((await llamar('POST', `${ruta}/publicar`)).status).toBe(200)
  expect((await llamar('GET', `${ruta}/mi-asistencia`, 'p-1')).datos).toMatchObject({ totalSesiones: 0, presentes: 0, cumpleAsistencia: false })
  const sesiones: string[] = []
  for (let i = 0; i < 5; i++) {
    const nueva = await llamar('POST', `${ruta}/sesiones`, 'u-admin-1', { ...entrada, fecha: `2038-07-${10 + i}` })
    expect(nueva.status).toBe(201)
    sesiones.push(nueva.datos.id)
    if (i < 4) asistencias[nueva.datos.id] = { 'p-1': '2038-07-10T15:00:00Z' }
  }
  expect((await llamar('GET', `${ruta}/mi-asistencia`, 'p-1')).datos).toEqual({ totalSesiones: 5, presentes: 4, porcentaje: 80, requisitoAsistencia: 80, cumpleAsistencia: true })
  expect((await llamar('GET', `${ruta}/mi-asistencia`, 'p-7')).datos.presentes).toBe(0)
  expect((await llamar('POST', `/clases/${sesiones[0]}/cancelar`)).status).toBe(200)
  expect((await llamar('GET', `${ruta}/mi-asistencia`, 'p-1')).datos).toEqual({ totalSesiones: 4, presentes: 3, porcentaje: 75, requisitoAsistencia: 80, cumpleAsistencia: false })
  expect((await llamar('GET', `${ruta}/mi-asistencia`, 'i-1')).status).toBe(403)
})
