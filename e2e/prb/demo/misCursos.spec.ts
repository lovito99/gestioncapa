import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'

const menu = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Navegación principal' })

// HU-16 y HU-20 A.4: «Mis cursos» muestra las inscripciones y qué falta para la constancia
test('MCU-01: Mis cursos muestra el certificado obtenido y qué falta en los cursos en curso', async ({ page }) => {
  await entrar(page, cuentas.part)
  await menu(page).getByRole('link', { name: 'Mis cursos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mis cursos', exact: true })).toBeVisible()
  const seguridad = page.getByRole('article').filter({ hasText: 'Demo · Seguridad y primeros auxilios' })
  await expect(seguridad).toContainText('Terminado')
  await expect(seguridad).toContainText('Obtuviste tu certificado de aprobación.')
  const didactica = page.getByRole('article').filter({ hasText: 'Demo · Didáctica y evaluación' })
  await expect(didactica).toContainText('En curso')
  await expect(didactica).toContainText('80 %')
})

// HU-16 criterio 4: un curso con costo queda «pendiente de pago» hasta que exista el pago (HU-32)
test('MCU-02: una inscripción en un curso con costo queda pendiente de pago', async ({ page }) => {
  await entrar(page, cuentas.luz)
  await menu(page).getByRole('link', { name: 'Mis cursos', exact: true }).click()
  const seguridad = page.getByRole('article').filter({ hasText: 'Demo · Seguridad y primeros auxilios' })
  await expect(seguridad).toContainText('Pendiente de pago')
  await expect(seguridad).toContainText('el pago del curso está pendiente')
})

// HU-49: las pantallas de QR (proyección del instructor y escaneo del agremiado) no llevan pie
test('MCU-03: las pantallas de QR no muestran el pie de página', async ({ page }) => {
  await entrar(page, cuentas.part)
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await page.getByRole('link', { name: 'Primeros auxilios básicos', exact: true }).click()
  await page.getByRole('link', { name: 'Marcar asistencia' }).click()
  await expect(page.getByRole('heading', { name: 'Escanear QR' })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toHaveCount(0)
})
