import { expect, type Page } from '@playwright/test'
import { rutas } from './rutas'

type Cuenta = { email: string; password: string; inicio: string; titulo: string }

export async function completarAcceso(page: Page, cuenta: Pick<Cuenta, 'email' | 'password'>) {
  await page.getByLabel('Correo electrónico', { exact: true }).fill(cuenta.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(cuenta.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
}

/** La sesión se obtiene por el formulario real, sin inyectar tokens ni almacenamiento. */
export async function entrar(page: Page, cuenta: Cuenta) {
  await page.goto(rutas.login)
  await completarAcceso(page, cuenta)
  await expect(page).toHaveURL(cuenta.inicio)
  await expect(page.getByRole('heading', { name: cuenta.titulo, exact: true })).toBeVisible()
}
