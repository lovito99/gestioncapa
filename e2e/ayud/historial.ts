import { expect, type Page } from '@playwright/test'
import { cuentas } from './datos'
import { completarAcceso, entrar } from './sesion'

export async function flujoHistorial(page: Page, admin: Parameters<typeof entrar>[1]) {
  await entrar(page, cuentas.part)
  const primeraRespuesta = page.waitForResponse(r => /\/api\/colegiados\/[^/]+\/historial$/.test(new URL(r.url()).pathname) && r.status() === 200)
  await page.getByRole('link', { name: 'Mi historial', exact: true }).click()
  const maria = await (await primeraRespuesta).json() as { colegiado: { id: string } }
  await expect(page.getByRole('heading', { name: 'Mi historial', exact: true })).toBeVisible()
  await expect(page.getByText('DNI: ****1234', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Demo · Seguridad y primeros auxilios' })).toBeVisible()
  await expect(page.getByText('Terminado · 24 horas lectivas', { exact: true })).toBeVisible()
  await expect(page.getByText('En curso · 16 horas lectivas', { exact: true })).toBeVisible()
  await expect(page.getByText('50 % de asistencia', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const [nombre, archivo] of [['Descargar historial PDF', 'historial-capacitacion.pdf'], ['Descargar certificado DEMO-HU18-MARIA-SEGURIDAD', 'certificado.pdf']]) {
    const espera = page.waitForEvent('download')
    await page.getByRole('button', { name: nombre!, exact: true }).click()
    expect((await espera).suggestedFilename()).toBe(archivo)
  }
  const destino = page.url()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await completarAcceso(page, cuentas.luz)
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
  await page.goto(`${new URL(destino).origin}/historial/${maria.colegiado.id}`)
  await expect(page.getByRole('alert')).toContainText('No tienes permiso')
  await expect(page.getByRole('button', { name: 'Descargar historial PDF' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await completarAcceso(page, admin)
  await page.getByRole('link', { name: 'Historiales', exact: true }).click()
  await page.getByRole('link', { name: /Ver historial de María/ }).click()
  await expect(page.getByRole('heading', { name: 'Historial del colegiado', exact: true })).toBeVisible()
  await expect(page.getByText('DNI: ****1234', { exact: true })).toBeVisible()
}
