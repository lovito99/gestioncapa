import { expect, type Page } from '@playwright/test'

/** Títulos de las tarjetas de «Modalidad de cobro» (Figma S3 2.1). */
const TITULOS = { PREVIO: 'Pago antes de llevar el curso', CERTIFICADO: 'Pago solo por el certificado', GRATUITO: 'Gratuito' } as const

/**
 * Elige el cobro en «Nuevo curso» y completa ambos precios.
 */
export async function elegirCobro(page: Page, modalidad: keyof typeof TITULOS, precio = 0, plazoDias = 1) {
  // El radio está oculto a la vista: se elige tocando su tarjeta, como lo hace una persona
  const radio = page.getByRole('radio', { name: new RegExp(`^${TITULOS[modalidad]}`) })
  await page.locator('label').filter({ has: radio }).click()
  await expect(radio).toBeChecked()
  if (modalidad === 'GRATUITO') return
  const prefijo = modalidad === 'CERTIFICADO' ? 'Constancia' : 'Precio'
  await page.getByLabel(`${prefijo} para colegiados (S/)`).fill(String(precio))
  await page.getByLabel(`${prefijo} general (S/)`).fill(String(precio))
  if (modalidad === 'PREVIO') await page.getByLabel('Plazo para pagar después de inscribirse').selectOption(String(plazoDias * 1440))
}

/** «Inscribirme» → «Confirma tu inscripción» (Figma S3 4.1a): acepta las condiciones y confirma. */
export async function confirmarInscripcion(page: Page, conPago: boolean) {
  await page.getByRole('button', { name: 'Inscribirme', exact: true }).click()
  const dialogo = page.getByRole('dialog', { name: 'Confirma tu inscripción' })
  await expect(dialogo).toBeVisible()
  await dialogo.getByLabel('Acepto las condiciones del curso y la política de privacidad (Ley 29733).').check()
  await dialogo.getByRole('button', { name: conPago ? 'Confirmar e ir a pagar' : 'Confirmar inscripción', exact: true }).click()
}
