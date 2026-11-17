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
  // HU-26: los cursos virtuales también programan sesiones (aula virtual).
  expect((await llamar('POST', `/cursos/${virtual}/sesiones`, 'u-admin-1', { ...entrada, fecha: '2038-06-11', lugar: 'Aula virtual' })).status).toBe(201)
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

it('HU-36 demo: la modalidad por sesión clasifica el curso y el grabado no admite sesiones', async () => {
  const id = await crear('PRESENCIAL')
  const ruta = `/cursos/${id}/sesiones`
  const virtual = await llamar('POST', ruta, 'u-admin-1', { ...entrada, fecha: '2038-07-01', lugar: '', modalidad: 'VIRTUAL' })
  expect(virtual.status).toBe(201)
  expect(virtual.datos).toMatchObject({ modalidad: 'VIRTUAL', lugar: 'Aula virtual' })
  expect((await llamar('GET', `/cursos/${id}`)).datos.modalidad).toBe('VIRTUAL')
  expect((await llamar('POST', ruta, 'u-admin-1', { ...entrada, fecha: '2038-07-02', modalidad: 'PRESENCIAL' })).status).toBe(201)
  expect((await llamar('GET', `/cursos/${id}`)).datos.modalidad).toBe('HIBRIDA')
  expect((await llamar('POST', ruta, 'u-admin-1', { ...entrada, fecha: '2038-07-03', lugar: ' ', modalidad: 'AMBAS' })).status).toBe(422)
  expect((await llamar('POST', ruta, 'u-admin-1', { ...entrada, fecha: '2038-07-04', modalidad: 'HIBRIDA' })).status).toBe(422)
  const grabado = await crear('GRABADO')
  const intento = await llamar('POST', `/cursos/${grabado}/sesiones`, 'u-admin-1', { ...entrada, fecha: '2038-07-05', modalidad: 'VIRTUAL' })
  expect(intento.status).toBe(409)
  expect(intento.datos.code).toBe('CURSO_GRABADO')
})

it('SCRUM-202 demo: guarda sede, aula, encargado y reglas de la sala, y edita la sesión', async () => {
  const id = await crear()
  const sala = { grabacionPrevista: true, pantallaPermitida: false, microfonoPermitido: false, manoPermitida: true, porcentajeMinimo: 70 }
  const nueva = { nombre: 'Sesión 1', fecha: '2038-08-01', horaInicio: '09:00', horaFin: '13:00', modalidad: 'AMBAS', lugar: 'Aula 3, Sede CPPP Cusco · Av. La Cultura 1112',
    sede: 'Sede CPPP Cusco · Av. La Cultura 1112', aula: 'Aula 3', encargadoId: 'i-1', qrRotatorio: true, sala }
  expect((await llamar('POST', `/cursos/${id}/sesiones`, 'u-admin-1', { ...nueva, sala: { ...sala, porcentajeMinimo: 0 } })).status).toBe(422)
  const creada = await llamar('POST', `/cursos/${id}/sesiones`, 'u-admin-1', nueva)
  expect(creada.status).toBe(201)
  expect((await llamar('GET', `/cursos/${id}`)).datos.sesiones[0]).toMatchObject({ sede: nueva.sede, aula: 'Aula 3', encargadoId: 'i-1', qrRotatorio: true, sala })
  const cambio = { ...nueva, cursoId: id, instructorId: 'i-1', modalidad: 'VIRTUAL', lugar: '' }
  expect((await llamar('PUT', `/clases/${creada.datos.id}`, 'i-1', cambio)).status).toBe(403)
  expect((await llamar('PUT', `/clases/${creada.datos.id}`, 'u-admin-1', cambio)).status).toBe(200)
  const editada = (await llamar('GET', `/cursos/${id}`)).datos
  expect(editada.sesiones[0]).toMatchObject({ modalidad: 'VIRTUAL', lugar: 'Aula virtual', sala })
  expect(editada.sesiones[0].sede).toBeUndefined()
  expect(editada.modalidad).toBe('VIRTUAL')
})
