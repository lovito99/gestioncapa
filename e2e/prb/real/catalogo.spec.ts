import { test } from '../../ayud/prueba'
import { cuentaReal } from '../../ayud/datos'
import { flujoCatalogo } from '../../ayud/catalogo'
test.use({ viewport: { width: 360, height: 800 } })
test('HU-14: búsqueda, filtros, páginas y bloqueo de cursos sin cupos con API real', async ({ page }) => {
  test.setTimeout(90000)
  await flujoCatalogo(page, cuentaReal, true)
})
