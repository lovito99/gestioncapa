import { execFile } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { promisify } from 'node:util'
import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'
import { entornoBackendReal } from '../../ayud/entornoReal'
import { confirmarInscripcion } from '../../ayud/cobroInscripcion'

test('HU54: verifica cancelación y aprobación en la API, con el checkout sustituido', async ({ page, request }) => {
  const errores: string[] = []
  page.on('pageerror', error => errores.push(error.message))
  await page.setViewportSize({ width: 360, height: 800 })
  await page.route('https://sandbox-checkout.izipay.pe/payments/v1/js/index.js', ruta => ruta.fulfill({
    contentType: 'application/javascript',
    body: `
      window.Izipay = class {
        constructor(entrada) { window.configIzipayE2e = entrada.config; }
        LoadForm(entrada) { window.responderIzipayE2e = entrada.callbackResponse; }
      };
    `,
  }))
  const { stdout } = await promisify(execFile)('node', ['--import', 'tsx', 'src/scripts/transferenciaDemoE2e.ts'], {
    cwd: 'backend', env: { ...process.env, ...entornoBackendReal },
  })
  const curso = JSON.parse(stdout) as { id: string }
  await entrar(page, cuentas.part)
  await page.goto(`/cursos/${curso.id}`)
  await confirmarInscripcion(page, true)
  await expect(page).toHaveURL(`/cursos/${curso.id}/pagar`)

  async function abrir() {
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await page.getByRole('radio', { name: /Yape/ }).check()
    await expect(page.getByRole('region', { name: 'Importes del pago en línea' })).toContainText('1.07')
    await page.getByRole('button', { name: /Pagar.*31\.57/ }).click()
    await page.waitForFunction(() => 'responderIzipayE2e' in window)
    return page.evaluate(() => Reflect.get(window, 'configIzipayE2e')) as Promise<{
      transactionId: string
      order: { orderNumber: string; amount: string; payMethod: string }
    }>
  }
  async function notificar(config: Awaited<ReturnType<typeof abrir>>, estado: 'Cancelado' | 'Autorizado') {
    expect(config.order).toMatchObject({ amount: '31.57', payMethod: 'YAPE_CODE' })
    const payloadHttp = JSON.stringify({ code: '00', response: {
      merchant: { merchantCode: entornoBackendReal.izipayCodigoComercio },
      order: [{ orderNumber: config.order.orderNumber, amount: config.order.amount, currency: 'PEN',
        payMethodAuthorization: 'YAPE_CODE', stateMessage: estado, codeAuth: '111111', uniqueId: config.order.orderNumber }],
    } })
    return request.post('/api/pagos/notificaciones/izipay', {
      headers: { transactionId: config.transactionId },
      data: { payloadHttp, signature: createHmac('sha256', entornoBackendReal.izipayClaveHash).update(payloadHttp).digest('base64') },
    })
  }

  const primero = await abrir()
  await page.evaluate(() => Reflect.get(window, 'responderIzipayE2e')({ code: '021' }))
  await expect(page.getByText(/Cerraste el formulario/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Pagar.*31\.57/ })).toHaveCount(0)
  expect(await (await notificar(primero, 'Cancelado')).json()).toEqual({ estado: 'CANCELADO' })
  await page.reload()
  await expect(page.getByText(/La pasarela confirmó la cancelación/)).toBeVisible()
  const segundo = await abrir()
  expect(segundo.order.orderNumber).not.toBe(primero.order.orderNumber)
  expect(await (await notificar(segundo, 'Autorizado')).json()).toEqual({ estado: 'CONFIRMADO' })
  await page.reload()
  await expect(page.getByRole('heading', { name: '¡Pago confirmado!' })).toBeVisible()
  await expect(page.getByText('S/ 31.57', { exact: true })).toBeVisible()
  await expect(page.getByText(/Correo pendiente de envío/)).toBeVisible()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar comprobante' }).click()
  expect((await descarga).suggestedFilename()).toMatch(/^comprobante-.*\.pdf$/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errores).toEqual([])
})
