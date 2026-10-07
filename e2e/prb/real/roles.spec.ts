import { expect, test } from '../../ayud/prueba'
import { cuentaReal, cuentas } from '../../ayud/datos'
import { rutas } from '../../ayud/rutas'
import { completarAcceso, entrar } from '../../ayud/sesion'

// Usuarios del seed en gestioncapa_e2e (mismas cuentas que el modo demo).
const usuariosSeed = [
  { cuenta: cuentas.coord, encabezado: 'Ana Torres · Coordinador' },
  { cuenta: cuentas.instr, encabezado: 'Carlos Mendoza Ríos · Instructor' },
  { cuenta: cuentas.part, encabezado: 'María Quispe · Participante' },
  { cuenta: cuentaReal, encabezado: 'Administrador E2E · Administrador' },
]

for (const { cuenta, encabezado } of usuariosSeed) {
  test(`ROL-02: ${cuenta.email} entra al inicio de su rol con el backend real`, async ({ page }) => {
    await entrar(page, cuenta)
    await expect(page.getByText(encabezado, { exact: true })).toBeVisible()
  })
}

const UN_DIA_Y_UNA_HORA = 25 * 60 * 60 * 1000

test('SES-03: con el JWT expirado una ruta protegida vuelve al login y conserva el destino', async ({ page }) => {
  await entrar(page, cuentaReal)
  await page.clock.setSystemTime(Date.now() + UN_DIA_Y_UNA_HORA)
  await page.goto(rutas.admin)
  await expect(page).toHaveURL(rutas.login)
  await expect(page.getByRole('alert')).toContainText('Tu sesión expiró')
  await expect(page.getByRole('heading', { name: 'Estado del sistema' })).toHaveCount(0)

  // De vuelta a la hora real: el nuevo token es vigente y regresa al destino.
  await page.clock.setSystemTime(Date.now())
  await completarAcceso(page, cuentaReal)
  await expect(page).toHaveURL(rutas.admin)
})

test('SES-04: si el servidor rechaza el token, el cliente vuelve al login', async ({ page }) => {
  await entrar(page, cuentaReal)
  // JWT con exp futuro pero firma inválida: el cliente lo cree vigente, el servidor no.
  const falso = ['{"alg":"HS256","typ":"JWT"}', JSON.stringify({ sub: '1', exp: Date.now() / 1000 + 3600 })]
    .map((parte) => Buffer.from(parte).toString('base64url'))
    .concat('firma-invalida')
    .join('.')
  await page.evaluate((token) => sessionStorage.setItem('gc.token', token), falso)
  await page.reload()
  await expect(page).toHaveURL(rutas.login)
  await expect(page.getByRole('alert')).toContainText('Tu sesión expiró')
})
