import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { cuentas } from './datos'
import { completarAcceso, entrar } from './sesion'

export async function flujoHistorial(page: Page, admin: Parameters<typeof entrar>[1]) {
  await entrar(page, cuentas.part)
  const primeraRespuesta = page.waitForResponse(r => /\/api\/colegiados\/[^/]+\/historial$/.test(new URL(r.url()).pathname) && r.status() === 200)
  await page.getByRole('link', { name: 'Historial', exact: true }).click()
  const maria = await (await primeraRespuesta).json() as { colegiado: { id: string } }
  await expect(page.getByRole('heading', { name: 'Mi historial', exact: true })).toBeVisible()
  // 4.1: horas acumuladas, cursos en curso y terminados con su certificado
  await expect(page.getByRole('heading', { name: 'Demo · Seguridad y primeros auxilios' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cursos en curso', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cursos terminados', exact: true })).toBeVisible()
  await expect(page.getByText('Código DEMO-HU18-MARIA-SEGURIDAD · 24 horas lectivas', { exact: true })).toBeVisible()
  await expect(page.getByText(/^Asistencia: 50 %/).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const [nombre, archivo] of [['Descargar resumen en PDF', 'historial-capacitacion.pdf'], ['Descargar certificado DEMO-HU18-MARIA-SEGURIDAD', 'certificado.pdf']]) {
    const espera = page.waitForEvent('download')
    await page.getByRole('button', { name: nombre!, exact: true }).click()
    const descarga = await espera
    expect(descarga.suggestedFilename()).toBe(archivo)
    const destinoPdf = test.info().outputPath(archivo!)
    await descarga.saveAs(destinoPdf)
    expect(await descarga.failure()).toBeNull()
    const contenido = await readFile(destinoPdf)
    expect(contenido.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(contenido.toString('latin1').trimEnd().endsWith('%%EOF')).toBe(true)
  }
  const destino = page.url()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await completarAcceso(page, cuentas.luz)
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
  await page.goto(`${new URL(destino).origin}/historial/${maria.colegiado.id}`)
  await expect(page.getByRole('alert')).toContainText('No tienes permiso')
  await expect(page.getByRole('button', { name: 'Descargar resumen en PDF' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await completarAcceso(page, admin)
  await page.getByRole('link', { name: 'Usuarios', exact: true }).click()
  await page.getByRole('link', { name: /Ver historial de María/ }).click()
  await expect(page.getByRole('heading', { name: 'Historial del colegiado', exact: true })).toBeVisible()
  await expect(page.getByText('DNI: ****1234', { exact: true })).toBeVisible()
}
