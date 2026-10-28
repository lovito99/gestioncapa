import { test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { flujoCurso } from '../../ayud/cursos'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-13: creación y materiales en modo demo', async ({ page }) => {
  test.setTimeout(60000)
  await flujoCurso(page, cuentas.admin)
})
