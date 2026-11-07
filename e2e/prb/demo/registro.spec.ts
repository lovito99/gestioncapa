import { test } from '../../ayud/prueba'
import { flujoRegistro } from '../../ayud/registro'
test.use({ viewport: { width: 360, height: 800 } })
test('HU-50: registro por DNI, validación y duplicados en demo a 360 px', async ({ page }) => {
  await flujoRegistro(page)
})
