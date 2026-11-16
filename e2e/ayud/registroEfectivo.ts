import { expect, type Page } from '@playwright/test'

export async function registrarEfectivo(page: Page, pagoId: string) {
  await page.goto(`/admin/pagos?pago=${pagoId}`)
  await expect(page.getByRole('heading', { name: 'Registrar efectivo', exact: true })).toBeVisible()
  await page.getByLabel('Referencia del recibo interno').fill(`CAJA-E2E-${pagoId}`)
  const importe = await page.locator('dl div').filter({ has: page.locator('dt', { hasText: 'Importe completo' }) }).locator('dd').innerText()
  await page.getByLabel('Importe recibido (S/)').fill(importe.match(/S\/ ([\d.]+)/)![1]!)
  await page.getByLabel('Fecha de recepción').fill('2026-01-01')
  await page.getByRole('checkbox', { name: /He recibido el importe completo/ }).check()
  await page.getByRole('button', { name: 'Registrar recepción de efectivo', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Pago confirmado' })).toBeVisible()
}
