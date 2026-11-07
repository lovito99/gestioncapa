import { test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { flujoInscripcionCurso } from '../../ayud/inscripcionCurso'
test.use({ viewport: { width: 360, height: 800 } })
test('HU-16: curso con costo pendiente en Mis cursos a 360 px', async ({ page }) => {
  await flujoInscripcionCurso(page, cuentas.admin)
})
