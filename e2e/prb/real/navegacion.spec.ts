import { expect, test } from '../../ayud/prueba'
import { recorrerGestionAdmin } from '../../ayud/admin'
import { cuentaReal } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'

test('NAV-03: el administrador recorre todas las pantallas de gestión con la API real', async ({ page }) => {
  await entrar(page, cuentaReal)
  await recorrerGestionAdmin(page, true)
})

test('VAL-07: el formulario permite reintentar si no pudo cargar los instructores', async ({ page }) => {
  await entrar(page, cuentaReal)
  await page.route('**/api/instructores', async (ruta) => {
    await ruta.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'SERVICIO_NO_DISPONIBLE', message: 'Vuelve a intentar.' }),
    })
  })
  await page.getByRole('navigation').getByRole('link', { name: 'Programar clase' }).click()
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar los instructores')
  await page.unroute('**/api/instructores')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('combobox', { name: 'Instructor', exact: true })).toBeEnabled()
  await expect(page.getByRole('option', { name: 'Carlos Mendoza Ríos' })).toHaveCount(1)
})
