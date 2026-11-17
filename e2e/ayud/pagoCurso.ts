import { expect, type Page } from '@playwright/test'

/** PNG de 1 × 1 para las pruebas de voucher. */
export const voucherPrueba = { name: 'voucher-prueba.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }

/** S3 7.1 · En «¿Cómo quieres pagar?» elige «Transferencia BCP», sube el voucher y envía el número de operación. */
export async function declararTransferencia(page: Page, pagoId: string, referencia: string, alVerCuenta?: () => Promise<void>) {
  await expect(page.getByRole('heading', { name: '¿Cómo quieres pagar?', exact: true })).toBeVisible()
  await page.locator('label').filter({ hasText: 'Transferencia BCP' }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pago por transferencia BCP', exact: true })).toBeVisible()
  await alVerCuenta?.()
  await page.getByLabel('Voucher', { exact: true }).setInputFiles(voucherPrueba)
  await page.getByLabel('Número de operación').fill(referencia)
  const declaracion = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/pagos/${pagoId}/transferencias`))
  await page.getByRole('button', { name: 'Enviar voucher', exact: true }).click()
  expect((await declaracion).status()).toBe(201)
  await expect(page.getByRole('heading', { name: 'Voucher enviado: pago en revisión', exact: true })).toBeVisible()
}
