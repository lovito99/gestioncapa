import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { rutas } from '../../ayud/rutas'
import { completarAcceso, entrar } from '../../ayud/sesion'

test('ENT-01: valida los campos antes de enviar el acceso', async ({ page }) => {
  await page.goto(rutas.login)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByText('Ingresa tu correo electrónico', { exact: true })).toBeVisible()
  await expect(page.getByText('Ingresa tu contraseña', { exact: true })).toBeVisible()
  await page.getByLabel('Correo electrónico', { exact: true }).fill('correo-invalido')
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByText('Ingresa un correo válido', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(rutas.login)
})

test('ENT-02: rechaza una contraseña incorrecta y permite corregirla', async ({ page }) => {
  await page.goto(rutas.login)
  await completarAcceso(page, { ...cuentas.coord, password: 'incorrecta' })
  await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos')
  await expect(page).toHaveURL(rutas.login)
  await completarAcceso(page, cuentas.coord)
  await expect(page).toHaveURL(rutas.clases)
})

for (const rol of ['coord', 'instr', 'part', 'admin'] as const) {
  test(`ENT-03: ${rol} entra a su inicio y conserva la sesión al recargar`, async ({ page }) => {
    const cuenta = cuentas[rol]
    await entrar(page, cuenta)
    await page.reload()
    await expect(page).toHaveURL(cuenta.inicio)
    await expect(page.getByRole('heading', { name: cuenta.titulo, exact: true })).toBeVisible()
  })
}

test('ENT-04: muestra y oculta la contraseña sin cambiar su contenido', async ({ page }) => {
  await page.goto(rutas.login)
  const password = page.getByLabel('Contraseña', { exact: true })
  await password.fill('demo123')
  await expect(password).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await expect(password).toHaveValue('demo123')
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click()
  await expect(password).toHaveAttribute('type', 'password')
})

test('ENT-05: cerrar sesión impide volver a una página protegida', async ({ page }) => {
  await entrar(page, cuentas.coord)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(rutas.login)
  await page.goto(rutas.clases)
  await expect(page).toHaveURL(rutas.login)
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
})
