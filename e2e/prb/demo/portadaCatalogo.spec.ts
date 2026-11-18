import { test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { flujoPortadaCatalogo, publicarCursosConPortada } from '../../ayud/portadas'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-51: tarjeta con portada, respaldo por categoría y detalle en modo demo', async ({ page }) => {
  test.setTimeout(60000)
  const { clave, cursos } = await publicarCursosConPortada(page, cuentas.admin)
  await flujoPortadaCatalogo(page, false, cursos, clave)
})
