import { test, expect } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { flujoCurso } from '../../ayud/cursos'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-13: creación y materiales en modo demo', async ({ page }) => {
  test.setTimeout(60000)
  const errores: string[] = []
  page.on('pageerror', error => errores.push(error.message))
  await flujoCurso(page, cuentas.admin)
  expect(errores).toEqual([])
  await page.screenshot({ path: test.info().outputPath('sesiones.png'), fullPage: true })
})
