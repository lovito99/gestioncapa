import { expect, test } from '@playwright/test'

test('RF-07: explorar cursos sin sesión desde 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Catálogo de cursos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText(/Mostrando|No hay cursos/)
  await page.getByRole('searchbox').fill('curso-inexistente-publico')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('No hay cursos que coincidan')
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.getByRole('status')).toContainText('Mostrando')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
})
