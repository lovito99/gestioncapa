import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { cambiarAParticipante, horaPrueba, obtenerQr } from '../../ayud/qr'
import { rutas } from '../../ayud/rutas'
import { entrar } from '../../ayud/sesion'

test('ASI-01: el instructor ve un QR que se renueva al vencer', async ({ page }) => {
  await page.clock.install({ time: horaPrueba })
  const token = await obtenerQr(page, 'c-3')
  const nuevoQr = page.waitForResponse((r) =>
    new URL(r.url()).pathname === '/api/clases/c-3/qr' && r.status() === 200,
  )
  await page.clock.fastForward(31_000)
  const siguiente = await (await nuevoQr).json()
  expect(siguiente.token).not.toBe(token)
  await expect(page.getByRole('progressbar', { name: 'Tiempo restante del código' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Primeros auxilios básicos', exact: true })).toBeVisible()
})

test('ASI-02: registra asistencia y rechaza repetirla sin duplicados', async ({ page }) => {
  await page.clock.setFixedTime(horaPrueba)
  const token = await obtenerQr(page, 'c-3')
  await cambiarAParticipante(page)
  await page.goto(rutas.marcar(token))
  await expect(page.getByRole('heading', { name: '¡Asistencia registrada!' })).toBeVisible()
  await expect(page.getByText('Primeros auxilios básicos', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Volver a mis clases' }).click()
  const clase = page.getByRole('article').filter({ hasText: 'Primeros auxilios básicos' })
  await expect(clase).toContainText('Asistencia registrada a las')
  await expect(clase.getByRole('link', { name: 'Registrar asistencia' })).toHaveCount(0)
  // Vuelve por el historial de la SPA: recargar reiniciaría los datos demo.
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Tu asistencia ya estaba registrada' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Escanear de nuevo' })).toHaveCount(0)
})

test('ASI-03: un QR vencido invita a escanear uno nuevo', async ({ page }) => {
  await page.clock.setFixedTime(horaPrueba)
  const token = await obtenerQr(page, 'c-3')
  await cambiarAParticipante(page)
  await page.clock.setFixedTime(new Date(horaPrueba.getTime() + 31_000))
  await page.goto(rutas.marcar(token))
  await expect(page.getByRole('heading', { name: 'El código QR expiró' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Escanear de nuevo' })).toBeVisible()
})

test('ASI-04: rechaza un token alterado', async ({ page }) => {
  await page.clock.setFixedTime(horaPrueba)
  const token = await obtenerQr(page, 'c-3')
  await cambiarAParticipante(page)
  await page.goto(rutas.marcar(`${token}alterado`))
  await expect(page.getByRole('heading', { name: 'Código QR no válido' })).toBeVisible()
})

test('ASI-05: no registra a una participante que no está inscrita', async ({ page }) => {
  await page.clock.setFixedTime(horaPrueba)
  const token = await obtenerQr(page, 'c-1')
  await cambiarAParticipante(page, cuentas.luz)
  await page.goto(rutas.marcar(token))
  await expect(page.getByRole('heading', { name: 'No estás inscrito(a) en esta clase' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Escanear de nuevo' })).toHaveCount(0)
})

test('ASI-06: un enlace sin token muestra cómo obtener el QR', async ({ page }) => {
  await entrar(page, cuentas.part)
  await page.goto('/asistencia/marcar')
  await expect(page.getByRole('alert')).toContainText('Falta el código QR')
  await expect(page.getByRole('alert')).toContainText('Escanea el QR que muestra tu instructor')
})
