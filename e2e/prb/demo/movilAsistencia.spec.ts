import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { cambiarAParticipante, horaPrueba, obtenerQr } from '../../ayud/qr'
import { entrar } from '../../ayud/sesion'
import { rutas } from '../../ayud/rutas'
import type { Page } from '@playwright/test'

async function sinDesborde(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

test.use({ viewport: { width: 360, height: 800 } })

test('HU-10: registra a 360 px con un toque y lectura real de QR mediante cámara simulada', async ({ page }) => {
  await page.clock.setFixedTime(horaPrueba)
  await obtenerQr(page, 'c-3')
  const imagen = await page.getByRole('region', { name: 'Código QR de asistencia' }).locator('svg').first().screenshot()
  await cambiarAParticipante(page)
  await page.evaluate(async imagenBase64 => {
    const imagenQr = new Image()
    imagenQr.src = `data:image/png;base64,${imagenBase64}`
    await imagenQr.decode()
    const lienzo = document.createElement('canvas')
    lienzo.width = 640; lienzo.height = 640
    const contexto = lienzo.getContext('2d')!
    const dibujar = () => {
      contexto.fillStyle = 'white'; contexto.fillRect(0, 0, 640, 640)
      contexto.drawImage(imagenQr, 160, 160, 320, 320)
    }
    dibujar()
    window.setInterval(dibujar, 100)
    navigator.mediaDevices.getUserMedia = async () => lienzo.captureStream(10)
  }, imagen.toString('base64'))
  await sinDesborde(page)
  const clase = page.getByRole('article').filter({ hasText: 'Primeros auxilios básicos' })
  // Un toque en la aplicación; el permiso nativo puede añadir otro en un celular real.
  await clase.getByRole('link', { name: 'Registrar asistencia' }).click()
  await expect(page.getByRole('heading', { name: '¡Asistencia registrada!' })).toBeVisible()
  await sinDesborde(page)
})

test('HU-10: cámara denegada explica cómo permitir acceso y ofrece reintento', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permiso denegado', 'NotAllowedError') }
  })
  await entrar(page, cuentas.part)
  await page.getByRole('article').filter({ hasText: 'Primeros auxilios básicos' }).getByRole('link', { name: 'Registrar asistencia' }).click()
  await expect(page.getByRole('alert')).toContainText('permite el acceso y vuelve a intentar')
  await expect(page.getByRole('button', { name: 'Intentar de nuevo' })).toBeVisible()
  await sinDesborde(page)
})

for (const caso of [
  { clase: 'c-3', cuenta: cuentas.part, vencido: true, titulo: 'El código QR expiró', accion: 'Pide al instructor el QR actualizado' },
  { clase: 'c-1', cuenta: cuentas.luz, vencido: false, titulo: 'No estás inscrito(a) en esta clase', accion: 'Pide al coordinador que revise tu inscripción' },
]) {
  test(`HU-10: ${caso.titulo} a 360 px`, async ({ page }) => {
    await page.clock.setFixedTime(horaPrueba)
    const token = await obtenerQr(page, caso.clase)
    await cambiarAParticipante(page, caso.cuenta)
    if (caso.vencido) await page.clock.setFixedTime(new Date(horaPrueba.getTime() + 31_000))
    await page.goto(rutas.marcar(token))
    await expect(page.getByRole('heading', { name: caso.titulo })).toBeVisible()
    await expect(page.getByText(caso.accion, { exact: false })).toBeVisible()
    await sinDesborde(page)
  })
}

test('HU-10: conexión perdida muestra una acción sin quedar esperando', async ({ page, context }) => {
  await entrar(page, cuentas.part)
  // Conserva la SPA cargada y provoca un fallo de transporte al registrar.
  // La navegación usa la SPA ya cargada; no necesita abrir la cámara.
  await context.setOffline(true)
  await page.evaluate(() => {
    window.history.pushState({}, '', '/asistencia/marcar?token=sin-red')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('heading', { name: 'Sin conexión', exact: true })).toBeVisible()
  await expect(page.getByText('Revisa tu conexión y vuelve a escanear.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Escanear de nuevo' })).toBeVisible()
  await sinDesborde(page)
})
