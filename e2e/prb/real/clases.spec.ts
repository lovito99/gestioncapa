import { expect, test } from '../../ayud/prueba'
import { completarClase } from '../../ayud/clase'
import { claseNueva, cuentas } from '../../ayud/datos'
import { rutas } from '../../ayud/rutas'
import { entrar } from '../../ayud/sesion'

// gestioncapa_e2e empieza sin clases en cada ejecución (npm run e2e:prep -w backend).
test('PRG-10: la coordinadora crea, edita y cancela una clase con el backend real', async ({ page }) => {
  await entrar(page, cuentas.coord)
  await page.getByRole('link', { name: 'Nueva clase' }).click()
  await completarClase(page)
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(page).toHaveURL(rutas.clases)
  const fila = page.getByRole('row').filter({ hasText: claseNueva.nombre })
  await expect(fila).toContainText(claseNueva.lugar)
  await expect(fila).toContainText(claseNueva.instructor)

  // La clase persiste: sigue en la lista tras recargar.
  await page.reload()
  await fila.getByRole('link', { name: `Editar ${claseNueva.nombre}`, exact: true }).click()
  await page.getByLabel('Lugar').fill('Sala actualizada')
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(fila).toContainText('Sala actualizada')

  // El servidor detecta el cruce con la clase recién creada.
  await page.getByRole('link', { name: 'Nueva clase' }).click()
  await completarClase(page, { ...claseNueva, nombre: 'Cruce E2E', inicio: '10:30', fin: '11:30' })
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(page.getByRole('alert')).toContainText('Conflicto de horario')
  await expect(page.getByRole('alert')).toContainText(claseNueva.nombre)
  await expect(page).toHaveURL(rutas.nueva)

  await page.goto(rutas.clases)
  await fila.getByRole('button', { name: `Cancelar ${claseNueva.nombre}`, exact: true }).click()
  const dialogo = page.getByRole('alertdialog')
  await dialogo.getByRole('button', { name: 'Sí, cancelar clase' }).click()
  await expect(dialogo).toHaveCount(0)
  await expect(fila).toContainText('Cancelada')
  await page.reload()
  await expect(fila).toContainText('Cancelada')
  await expect(fila.getByRole('link', { name: `Editar ${claseNueva.nombre}`, exact: true })).toHaveCount(0)
})
