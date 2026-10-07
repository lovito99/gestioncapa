import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { rutas } from '../../ayud/rutas'
import { completarAcceso, entrar } from '../../ayud/sesion'

/** Acción visible que identifica a cada rol; ninguna debe aparecer a los demás. */
const opciones = {
  coord: { rol: 'link', nombre: 'Nueva clase' },
  instr: { rol: 'link', nombre: 'Mostrar QR' },
  part: { rol: 'link', nombre: 'Registrar asistencia' },
  admin: { rol: 'heading', nombre: 'Estado del sistema' },
} as const

for (const rol of Object.keys(opciones) as (keyof typeof opciones)[]) {
  test(`ROL-01: ${rol} ve solo las opciones de su rol`, async ({ page }) => {
    await entrar(page, cuentas[rol])
    const propia = opciones[rol]
    await expect(page.getByRole(propia.rol, { name: propia.nombre }).first()).toBeVisible()

    for (const [otro, ajena] of Object.entries(opciones)) {
      if (otro === rol) continue
      await expect(page.getByRole(ajena.rol, { name: ajena.nombre })).toHaveCount(0)
    }
  })
}

test('SES-02: si la pestaña pierde el token, una ruta protegida vuelve al login', async ({ page }) => {
  await entrar(page, cuentas.coord)
  await page.evaluate(() => sessionStorage.removeItem('gc.token'))
  await page.getByRole('link', { name: 'Nueva clase' }).click()
  await expect(page).toHaveURL(rutas.login)
  await expect(page.getByRole('alert')).toContainText('Tu sesión expiró')
  await expect(page.getByRole('heading', { name: 'Nueva clase' })).toHaveCount(0)
  await completarAcceso(page, cuentas.coord)
  await expect(page).toHaveURL(rutas.nueva)
})
