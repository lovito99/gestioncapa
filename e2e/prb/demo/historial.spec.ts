import { test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { flujoHistorial } from '../../ayud/historial'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-18: historial y descargas en modo demo', async ({ page }) => {
  test.setTimeout(60000)
  await flujoHistorial(page, cuentas.admin)
})
