import { expect, test } from '../../ayud/prueba'
import { completarClase } from '../../ayud/clase'
import { claseNueva, cuentas } from '../../ayud/datos'
import { rutas } from '../../ayud/rutas'
import { entrar } from '../../ayud/sesion'

// Fecha distinta a PRG-10: las pruebas reales corren en paralelo sobre la misma base.
const conCarlos = { ...claseNueva, nombre: 'Solapamiento Carlos E2E', fecha: '2030-02-20' }
const conLucia = { ...conCarlos, nombre: 'Solapamiento Lucía E2E', instructor: 'Lucía Paredes Quispe' }

test('SOL-08: el mismo horario se acepta con otra instructora en el backend real', async ({ page }) => {
  await entrar(page, cuentas.coord)

  for (const datos of [conCarlos, conLucia]) {
    await page.getByRole('link', { name: 'Nueva clase' }).click()
    await completarClase(page, datos)
    await page.getByRole('button', { name: 'Guardar clase' }).click()
    await expect(page).toHaveURL(rutas.clases)
  }

  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: conCarlos.nombre })).toContainText('Carlos Mendoza Ríos')
  await expect(page.getByRole('row').filter({ hasText: conLucia.nombre })).toContainText('Lucía Paredes Quispe')
})
