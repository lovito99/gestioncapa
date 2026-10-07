import { expect, type Page } from '@playwright/test'
import { cuentas } from './datos'
import { rutas } from './rutas'
import { completarAcceso, entrar } from './sesion'

export const horaPrueba = new Date('2026-10-06T15:00:05Z')

/** El token lo emite la API demo desde la pantalla del instructor; no se inventa una firma. */
export async function obtenerQr(page: Page, claseId: string) {
  await entrar(page, cuentas.instr)
  const respuesta = page.waitForResponse((r) =>
    new URL(r.url()).pathname === `/api/clases/${claseId}/qr` && r.status() === 200,
  )
  await page.goto(rutas.qr(claseId))
  const datos = await (await respuesta).json() as { token: string }
  await expect(page.getByRole('region', { name: 'Código QR de asistencia' }).locator('svg').first()).toBeVisible()
  return datos.token
}

export async function cambiarAParticipante(page: Page, cuenta: { email: string; password: string } = cuentas.part) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(rutas.login)
  await completarAcceso(page, cuenta)
  await expect(page).toHaveURL(rutas.participante)
}
