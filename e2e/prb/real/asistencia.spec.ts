import { expect, test } from '../../ayud/prueba'
import { cambiarAParticipante } from '../../ayud/qr'
import { cuentas } from '../../ayud/datos'
import { apiReal, rutas } from '../../ayud/rutas'
import { completarAcceso, entrar } from '../../ayud/sesion'

const NOMBRE = 'Asistencia completa E2E'

test('VIN-01: flujo completo de asistencia por QR con el backend real', async ({ page, request }) => {
  // Coordinadora: clase de Carlos con María inscrita (por la API real, fecha propia).
  const { token } = await (await request.post(`${apiReal}/auth/login`, { data: cuentas.coord })).json()
  const headers = { Authorization: `Bearer ${token}` }
  const instructores: { id: string; nombre: string }[] = await (await request.get(`${apiReal}/instructores`, { headers })).json()
  const creada = await request.post(`${apiReal}/clases`, {
    headers,
    data: {
      nombre: NOMBRE,
      instructorId: instructores.find((i) => i.nombre === 'Carlos Mendoza Ríos')!.id,
      fecha: '2030-05-20',
      horaInicio: '10:00',
      horaFin: '11:00',
      lugar: 'Sala de pruebas',
    },
  })
  expect(creada.status()).toBe(201)
  const { id } = await creada.json()
  expect((await request.post(`${apiReal}/clases/${id}/inscritos`, { headers, data: { email: cuentas.part.email } })).status()).toBe(201)

  // Instructor: el QR lo emite el servidor real desde su pantalla.
  await entrar(page, cuentas.instr)
  const respuestaQr = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/clases/${id}/qr` && r.status() === 200)
  await page.goto(rutas.qr(id))
  const { token: tokenQr } = (await (await respuestaQr).json()) as { token: string }

  // Participante: abre el enlace del QR antes de que venza.
  await cambiarAParticipante(page)
  await page.goto(rutas.marcar(tokenQr))
  await expect(page.getByRole('heading', { name: '¡Asistencia registrada!' })).toBeVisible()
  await expect(page.getByText(NOMBRE, { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Volver a mis clases' }).click()
  const clase = page.getByRole('article').filter({ hasText: NOMBRE })
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
