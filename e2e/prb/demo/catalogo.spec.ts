import { test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { flujoCatalogo } from '../../ayud/catalogo'
test.use({ viewport: { width: 360, height: 800 } })
test('HU-14: catálogo paginado e inscripción en modo demo', async ({ page }) => {
  test.setTimeout(90000)
  await flujoCatalogo(page, cuentas.admin, false)
})
