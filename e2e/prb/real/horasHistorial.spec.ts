import { test, expect } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-34: total acumulado, filtro anual y estado sin certificados a 360 px', async ({ page }) => {
  await entrar(page, cuentas.part)
  // Datos de respuesta controlados para comprobar la interfaz con varios años.
  // La integración de API prueba por separado la suma real y las anulaciones.
  await page.route('**/api/colegiados/*/historial', async route => {
    const respuesta = await route.fetch()
    const historial = await respuesta.json()
    await route.fulfill({ json: { ...historial, horasAcumuladas: { total: 40, porAnio: [{ anio: '2026', horas: 16 }, { anio: '2025', horas: 24 }] } } })
  })
  await page.getByRole('link', { name: 'Historial', exact: true }).click()
  const tarjeta = page.getByRole('region', { name: 'Horas de capacitación acumuladas' })
  const anio = page.getByRole('combobox', { name: 'Año', exact: true }).filter({ visible: true })
  await expect(tarjeta.getByRole('status')).toHaveText('40 horas')
  await anio.selectOption('2025')
  await expect(tarjeta.getByRole('status')).toHaveText('24 horas')
  await anio.selectOption('2026')
  await expect(tarjeta.getByRole('status')).toHaveText('16 horas')
  await anio.selectOption('')
  await expect(tarjeta.getByRole('status')).toHaveText('40 horas')
  await page.unroute('**/api/colegiados/*/historial')
  await page.route('**/api/colegiados/*/historial', async route => {
    const respuesta = await route.fetch()
    const historial = await respuesta.json()
    await route.fulfill({ json: { ...historial, cursos: [], horasAcumuladas: { total: 0, porAnio: [] } } })
  })
  await page.reload()
  await expect(tarjeta.getByRole('status')).toHaveText('0 horas')
  await expect(tarjeta).toContainText('Aún no tienes certificados válidos.')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
