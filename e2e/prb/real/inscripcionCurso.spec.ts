import { expect, test } from '../../ayud/prueba'
import { cuentaReal } from '../../ayud/datos'
import { flujoInscripcionCurso } from '../../ayud/inscripcionCurso'
test.use({ viewport: { width: 360, height: 800 } })
test('HU-16: inscripción pendiente persistente en API real', async ({ page }) => {
  await flujoInscripcionCurso(page, cuentaReal)
  await page.reload()
  await expect(page.getByText('Inscripción pendiente de pago', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir a pagar', exact: true })).toBeVisible()
})
