import { expect, test } from '../../ayud/prueba'
import { cuentaReal } from '../../ayud/datos'
import { apiReal, rutas } from '../../ayud/rutas'
import { completarAcceso, entrar } from '../../ayud/sesion'

test('REA-01: la API real confirma Postgres y Redis', async ({ request }) => {
  const respuesta = await request.get(`${apiReal}/health`)
  expect(respuesta.ok()).toBeTruthy()
  expect(await respuesta.json()).toMatchObject({ ok: true, database: 'ready', redis: 'ready' })
})

test('REA-02: el login real cumple el contrato del frontend', async ({ request }) => {
  const respuesta = await request.post(`${apiReal}/auth/login`, { data: cuentaReal })
  expect(respuesta.status()).toBe(200)
  expect(await respuesta.json()).toMatchObject({
    token: expect.any(String),
    user: { id: expect.any(Number), name: 'Administrador E2E', email: cuentaReal.email, role: 'admin' },
    usuario: { id: expect.any(String), nombre: 'Administrador E2E', email: cuentaReal.email, rol: 'ADMIN', cargo: 'Administrador' },
  })
})

test('REA-03: el administrador entra por el navegador al backend real', async ({ page }) => {
  await entrar(page, cuentaReal)
  await expect(page.getByText('Funcionando', { exact: true })).toHaveCount(3)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Estado del sistema' })).toBeVisible()
  const salida = page.waitForResponse((respuesta) => new URL(respuesta.url()).pathname === '/api/auth/logout')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  expect((await salida).status()).toBe(204)
  await expect(page).toHaveURL(rutas.login)
  await page.goto(rutas.admin)
  await expect(page).toHaveURL(rutas.login)
})

test('REA-04: las credenciales inválidas tienen un error comprensible', async ({ page, request }) => {
  const datos = { ...cuentaReal, password: 'incorrecta' }
  const respuesta = await request.post(`${apiReal}/auth/login`, { data: datos })
  expect(respuesta.status()).toBe(401)
  expect(await respuesta.json()).toMatchObject({ code: 'CREDENCIALES_INVALIDAS', message: expect.any(String) })
  await page.goto(rutas.login)
  await completarAcceso(page, datos)
  await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos')
  await expect(page).toHaveURL(rutas.login)
})

test('REA-05: permite cerrar la sesión y rechaza /me sin token', async ({ request }) => {
  const login = await request.post(`${apiReal}/auth/login`, { data: cuentaReal })
  expect(login.status()).toBe(200)
  const { token } = await login.json()
  const actual = await request.get(`${apiReal}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
  expect(actual.status()).toBe(200)
  expect(await actual.json()).toMatchObject({ usuario: { email: cuentaReal.email, rol: 'ADMIN' } })
  const salida = await request.post(`${apiReal}/auth/logout`, { headers: { Authorization: `Bearer ${token}` } })
  expect(salida.status()).toBe(204)
  const sinSesion = await request.get(`${apiReal}/auth/me`)
  expect(sinSesion.status()).toBe(401)
})
