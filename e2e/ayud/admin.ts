import { expect, type Page } from '@playwright/test'
import { completarClase } from './clase'
import { claseNueva, cuentas } from './datos'

/** Recorre las pantallas conectadas como administrador con MSW o API real. */
export async function recorrerGestionAdmin(page: Page, datosPersistentes = false) {
  const menu = page.getByRole('navigation', { name: 'Navegación principal' })
  await expect(menu.getByRole('link', { name: 'Estado del sistema' })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('link', { name: 'Gestionar clases' }).click()
  await expect(page).toHaveURL('/admin/clases')
  await menu.getByRole('link', { name: 'Programar clase' }).click()
  const nombre = 'Capacitación desde administración E2E'
  await completarClase(page, { ...claseNueva, nombre, fecha: '2033-06-21' })
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(page).toHaveURL('/admin/clases')
  const fila = page.getByRole('row').filter({ hasText: nombre })
  await fila.getByRole('link', { name: `Editar ${nombre}`, exact: true }).click()
  await page.getByLabel('Lugar').fill('Sala de administración')
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(fila).toContainText('Sala de administración')
  await fila.getByRole('link', { name: `Ver detalle de ${nombre}`, exact: true }).click()
  const detalle = page.url()
  await page.getByRole('link', { name: 'Ver asistencia', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Esta clase aún no tiene participantes inscritos' })).toBeVisible()
  await page.getByRole('link', { name: 'Ir a inscribir participantes' }).click()
  await expect(page).toHaveURL(detalle)
  await page.getByLabel('Correo del participante').fill(cuentas.luz.email)
  await page.getByRole('button', { name: 'Inscribir', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Inscritos (1)', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Ver asistencia', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Asistencia', exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: cuentas.luz.email })).toContainText('Ausente')
  await page.getByRole('link', { name: 'Volver al detalle de la clase' }).click()
  await expect(page).toHaveURL(detalle)
  await page.getByRole('link', { name: 'Mostrar QR', exact: true }).click()
  await expect(page.getByRole('heading', { name: nombre, exact: true })).toBeVisible()
  await expect(page.locator('svg').filter({ has: page.locator('title', { hasText: 'Código QR de asistencia' }) })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  // La API real conserva las clases; la simulación en memoria se reinicia al recargar.
  if (datosPersistentes) {
    await page.reload()
    await expect(page.getByRole('heading', { name: nombre, exact: true })).toBeVisible()
  }
  await page.getByRole('link', { name: 'Volver a clases' }).click()
  await expect(page).toHaveURL('/admin/clases')
  await fila.getByRole('button', { name: `Cancelar ${nombre}`, exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar clase' }).click()
  await expect(fila).toContainText('Cancelada')
  await fila.getByRole('link', { name: `Ver detalle de ${nombre}`, exact: true }).click()
  await expect(page.getByRole('link', { name: 'Mostrar QR', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Inscribir', exact: true })).toHaveCount(0)
  await menu.getByRole('link', { name: 'Estado del sistema' }).click()
  await expect(page).toHaveURL('/admin')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Estado del sistema', exact: true })).toBeVisible()
}
