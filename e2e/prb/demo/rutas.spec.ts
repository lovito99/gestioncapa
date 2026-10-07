import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { rutas } from '../../ayud/rutas'
import { completarAcceso, entrar } from '../../ayud/sesion'

for (const ruta of [
  '/admin', '/coordinador', rutas.clases, rutas.nueva, rutas.detalle('c-1'),
  '/coordinador/clases/c-1/editar', rutas.asistencia('c-1'),
  '/instructor', rutas.instructor, rutas.qr('c-1'),
  '/participante', rutas.participante, '/participante/escanear',
  '/participante/clases/c-3/escanear', rutas.marcar('codigo-de-prueba'),
]) {
  test(`RUT-01: sin sesión ${ruta} lleva al login`, async ({ page }) => {
    await page.goto(ruta)
    await expect(page).toHaveURL(rutas.login)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })
}

test('RUT-02: un participante no puede entrar al coordinador', async ({ page }) => {
  await entrar(page, cuentas.part)
  await page.goto(rutas.clases)
  await expect(page).toHaveURL(rutas.participante)
  await expect(page.getByRole('heading', { name: 'Mis clases', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nueva clase' })).toHaveCount(0)
})

test('RUT-03: después del login se conserva el enlace del QR y su query', async ({ page }) => {
  await page.goto(rutas.marcar('codigo-invalido'))
  await expect(page).toHaveURL(rutas.login)
  await completarAcceso(page, cuentas.part)
  await expect(page).toHaveURL(rutas.marcar('codigo-invalido'))
  await expect(page.getByRole('heading', { name: 'Código QR no válido' })).toBeVisible()
})

test('RUT-04: una ruta desconocida permite volver al inicio', async ({ page }) => {
  await page.goto('/ruta-que-no-existe')
  await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible()
  await page.getByRole('link', { name: 'Ir al inicio' }).click()
  await expect(page).toHaveURL(rutas.login)
})
