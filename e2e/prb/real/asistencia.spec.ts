import type { Response } from '@playwright/test'
import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { apiReal, rutas } from '../../ayud/rutas'
import { completarAcceso, entrar } from '../../ayud/sesion'
import type { QrAsistencia } from '../../../frontend/src/types/api'

const NOMBRE = 'Asistencia completa E2E'

test('VIN-01: flujo completo de asistencia por QR con el backend real', async ({ page, request, context }, intento) => {
  test.setTimeout(60000)
  // Los reintentos y repeticiones no comparten nombre ni horario.
  const nombre = `${NOMBRE} ${intento.repeatEachIndex}-${intento.retry}`
  const fecha = new Date(Date.UTC(2030, 4, 20 + intento.repeatEachIndex * 10 + intento.retry)).toISOString().slice(0, 10)
  // Coordinadora: clase de Carlos con María inscrita (por la API real, fecha propia).
  const { token } = await (await request.post(`${apiReal}/auth/login`, { data: cuentas.coord })).json()
  const headers = { Authorization: `Bearer ${token}` }
  const instructores: { id: string; nombre: string }[] = await (await request.get(`${apiReal}/instructores`, { headers })).json()
  const creada = await request.post(`${apiReal}/clases`, {
    headers,
    data: {
      nombre,
      instructorId: instructores.find((i) => i.nombre === 'Carlos Mendoza Ríos')!.id,
      fecha,
      horaInicio: '10:00',
      horaFin: '11:00',
      lugar: 'Sala de pruebas',
    },
  })
  expect(creada.status()).toBe(201)
  const { id } = await creada.json()
  expect((await request.post(`${apiReal}/clases/${id}/inscritos`, { headers, data: { email: cuentas.part.email } })).status()).toBe(201)

  // El colegiado inicia sesión antes de leer el QR, en una pestaña independiente.
  // Ambas identidades usan el flujo real; sessionStorage está separado por pestaña.
  await entrar(page, cuentas.part)
  const paginaInstructor = await context.newPage()
  await entrar(paginaInstructor, cuentas.instr)
  const esQr = (respuesta: Response) => new URL(respuesta.url()).pathname === `/api/clases/${id}/qr` && respuesta.status() === 200
  const respuestaQr = paginaInstructor.waitForResponse(esQr)
  await paginaInstructor.goto(rutas.qr(id))
  let qr = await (await respuestaQr).json() as QrAsistencia
  // El token vence al terminar la ventana, por lo que puede nacer con pocos
  // segundos restantes. En ese caso esperamos la renovación real de la pantalla.
  if (Date.parse(qr.expiraEn) - Date.parse(qr.servidorAhora) < 10000) {
    const renovacion = await paginaInstructor.waitForResponse(async respuesta => {
      if (!esQr(respuesta)) return false
      const siguiente = await respuesta.json() as QrAsistencia
      return Date.parse(siguiente.expiraEn) - Date.parse(siguiente.servidorAhora) >= 10000
    })
    qr = await renovacion.json() as QrAsistencia
  }
  expect(Date.parse(qr.expiraEn) - Date.parse(qr.servidorAhora)).toBeGreaterThanOrEqual(10000)
  const tokenQr = qr.token
  // El registro sigue usando el token firmado y el reloj real del backend.
  await page.goto(rutas.marcar(tokenQr))
  await expect(page.getByRole('heading', { name: '¡Asistencia registrada!' })).toBeVisible()
  await paginaInstructor.close()
  await expect(page.getByText(nombre, { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Volver a mis clases' }).click()
  const clase = page.getByRole('article').filter({ hasText: nombre })
  await expect(clase).toContainText('Asistencia registrada a las')
  await expect(clase.getByRole('link', { name: 'Registrar asistencia' })).toHaveCount(0)

  // Repetir el enlace no crea otra asistencia (la base real conserva el registro).
  await page.goto(rutas.marcar(tokenQr))
  await expect(page.getByRole('heading', { name: /Tu asistencia ya estaba registrada|El código QR expiró/ })).toBeVisible()

  // Coordinadora: comprueba quién asistió.
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(rutas.login)
  await completarAcceso(page, cuentas.coord)
  await expect(page).toHaveURL(rutas.clases)
  await page.goto(rutas.asistencia(id))
  await expect(page.getByRole('heading', { name: 'Asistencia', exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: cuentas.part.email })).toContainText('Presente')
})
