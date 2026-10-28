import { test } from '../../ayud/prueba'
import { cuentaReal } from '../../ayud/datos'
import { flujoHistorial } from '../../ayud/historial'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-18: historial, descargas y acceso por propietario con backend real', async ({ page }) => {
  test.setTimeout(60000)
  await flujoHistorial(page, cuentaReal)
})
