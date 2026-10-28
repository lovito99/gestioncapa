import { test } from '../../ayud/prueba'
import { cuentaReal } from '../../ayud/datos'
import { flujoCurso } from '../../ayud/cursos'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-13: crea, ordena, publica y agrega material con backend real', async ({ page }) => {
  test.setTimeout(60000)
  await flujoCurso(page, cuentaReal)
})
