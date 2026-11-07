import { expect, test } from '../../ayud/prueba'
import { recorrerGestionAdmin } from '../../ayud/admin'
import { cuentas } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'

test('NAV-01: el administrador navega y gestiona clases, inscritos, asistencia y QR', async ({ page }) => {
  await entrar(page, cuentas.admin)
  await recorrerGestionAdmin(page)
})

test('NAV-04: todas las rutas administrativas requieren sesión', async ({ page }) => {
  for (const ruta of [
    '/admin/clases',
    '/admin/clases/nueva',
    '/admin/clases/c-1',
    '/admin/clases/c-1/editar',
    '/admin/clases/c-1/asistencia',
    '/admin/clases/c-1/qr',
  ]) {
    await page.goto(ruta)
    await expect(page).toHaveURL('/login')
  }
})

test('NAV-05: pasar de editar a programar una clase limpia el formulario', async ({ page }) => {
  await entrar(page, cuentas.admin)
  await page.goto('/admin/clases/c-1/editar')
  await expect(page.getByLabel('Nombre de la clase')).toHaveValue('Seguridad y salud en el trabajo')
  // «+ Nueva clase» está en la lista de clases (3.1), ya no en el menú
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Clases', exact: true }).click()
  await page.getByRole('link', { name: 'Nueva clase' }).click()
  await expect(page.getByLabel('Nombre de la clase')).toHaveValue('')
  await expect(page.getByLabel('Lugar')).toHaveValue('')
})

test('NAV-06: cambiar el token en la misma pantalla procesa el nuevo enlace QR', async ({ page }) => {
  await entrar(page, cuentas.part)
  await page.goto('/asistencia/marcar?token=primer-codigo-invalido')
  await expect(page.getByRole('heading', { name: 'Código QR no válido' })).toBeVisible()
  const nuevoRegistro = page.waitForRequest((request) =>
    request.method() === 'POST'
    && new URL(request.url()).pathname === '/api/asistencia/marcar'
    && request.postDataJSON().token === 'segundo-codigo-invalido',
  )
  // Navegación en la SPA: conserva la instancia del componente y cambia la query.
  await page.evaluate(() => {
    window.history.pushState(null, '', '/asistencia/marcar?token=segundo-codigo-invalido')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await nuevoRegistro
  await expect(page.getByRole('heading', { name: 'Código QR no válido' })).toBeVisible()
})

test('NAV-02: el participante usa el menú del agremiado y conserva sus permisos', async ({ page }) => {
  await entrar(page, cuentas.part)
  const menu = page.getByRole('navigation', { name: 'Navegación principal' })
  // Menú del Figma para el agremiado: Catálogo · Mis cursos · Historial
  await menu.getByRole('link', { name: 'Catálogo', exact: true }).click()
  await expect(page).toHaveURL('/catalogo')
  await menu.getByRole('link', { name: 'Historial', exact: true }).click()
  await expect(page).toHaveURL('/historial')
  await menu.getByRole('link', { name: 'Mis cursos', exact: true }).click()
  await expect(page).toHaveURL('/participante/cursos')
  // Desde «Mis cursos» se llega a «Mis clases» y el escáner se abre en el detalle de la clase (3.2)
  await page.getByRole('link', { name: 'Registrar asistencia' }).click()
  await expect(page).toHaveURL('/participante/clases')
  await page.getByRole('link', { name: 'Primeros auxilios básicos', exact: true }).click()
  await page.getByRole('link', { name: 'Marcar asistencia' }).click()
  await expect(page).toHaveURL(/\/participante\/clases\/c-3\/escanear$/)
  await expect(menu.getByRole('link', { name: 'Clases', exact: true })).toHaveCount(0)
  await page.goto('/admin/clases')
  await expect(page).toHaveURL('/participante/clases')
})
