import { expect, test } from '../../ayud/prueba'
import { completarClase } from '../../ayud/clase'
import { claseNueva, cuentas } from '../../ayud/datos'
import { rutas } from '../../ayud/rutas'
import { entrar } from '../../ayud/sesion'

test.beforeEach(async ({ page }) => { await entrar(page, cuentas.coord) })

test('CLA-01: exige los campos y una hora final posterior a la inicial', async ({ page }) => {
  await page.getByRole('link', { name: 'Nueva clase' }).click()
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(page.getByRole('alert')).toContainText('Completa los campos obligatorios')
  await expect(page.getByLabel('Nombre de la clase')).toHaveAttribute('aria-invalid', 'true')
  await completarClase(page, { ...claseNueva, fin: '09:00' })
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(page.getByText('La hora de fin debe ser posterior a la de inicio')).toBeVisible()
  await expect(page).toHaveURL(rutas.nueva)
})

test('CLA-02: crea, edita y cancela una clase con confirmación', async ({ page }) => {
  await page.getByRole('link', { name: 'Nueva clase' }).click()
  await completarClase(page)
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  const fila = page.getByRole('row').filter({ hasText: claseNueva.nombre })
  await expect(fila).toBeVisible()
  await expect(fila).toContainText('Sala de pruebas')
  await fila.getByRole('link', { name: `Editar ${claseNueva.nombre}`, exact: true }).click()
  await page.getByLabel('Lugar').fill('Sala actualizada')
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(fila).toContainText('Sala actualizada')
  await fila.getByRole('button', { name: `Cancelar ${claseNueva.nombre}`, exact: true }).click()
  const dialogo = page.getByRole('alertdialog')
  await expect(dialogo).toContainText(claseNueva.nombre)
  await dialogo.getByRole('button', { name: 'Sí, cancelar clase' }).click()
  await expect(dialogo).toHaveCount(0)
  await expect(fila).toContainText('Cancelada')
  await expect(fila.getByRole('link', { name: `Editar ${claseNueva.nombre}`, exact: true })).toHaveCount(0)
})

test('CLA-03: advierte un conflicto y permite elegir otro horario', async ({ page }) => {
  await page.getByRole('link', { name: 'Nueva clase' }).click()
  await completarClase(page, { ...claseNueva, fecha: '2026-10-12', inicio: '10:30', fin: '11:30' })
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(page.getByRole('alert')).toContainText('Conflicto de horario')
  await expect(page.getByRole('alert')).toContainText('Seguridad y salud en el trabajo')
  await page.getByLabel('Hora de inicio').fill('11:00')
  await page.getByLabel('Hora de fin').fill('12:00')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Guardar clase' }).click()
  await expect(page.getByRole('row').filter({ hasText: claseNueva.nombre })).toBeVisible()
})

test('CLA-04: inscribe un participante y evita duplicados o cuentas inexistentes', async ({ page }) => {
  await page.getByRole('link', { name: 'Ver detalle de Seguridad y salud en el trabajo' }).click()
  await expect(page.getByRole('heading', { name: 'Inscritos (6)', exact: true })).toBeVisible()
  const correo = page.getByLabel('Correo del participante')
  await correo.fill('persona-inexistente@demo.pe')
  await page.getByRole('button', { name: 'Inscribir', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('No encontramos un participante')
  await correo.fill(cuentas.part.email)
  await page.getByRole('button', { name: 'Inscribir', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('ya está inscrito(a)')
  await expect(page.getByRole('heading', { name: 'Inscritos (6)', exact: true })).toBeVisible()
  await correo.fill(cuentas.luz.email)
  await page.getByRole('button', { name: 'Inscribir', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Inscritos (7)', exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: cuentas.luz.email })).toBeVisible()
})

test('CLA-05: muestra asistencia y el estado vacío de una clase sin inscritos', async ({ page }) => {
  await page.getByRole('link', { name: 'Ver detalle de Seguridad y salud en el trabajo' }).click()
  await page.getByRole('link', { name: 'Ver asistencia' }).click()
  await expect(page.getByRole('heading', { name: 'Asistencia', exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: cuentas.part.email })).toContainText('Presente')
  await page.goto(rutas.asistencia('c-2'))
  await expect(page.getByRole('heading', { name: 'Esta clase aún no tiene participantes inscritos' })).toBeVisible()
  await page.getByRole('link', { name: 'Ir a inscribir participantes' }).click()
  await expect(page).toHaveURL(rutas.detalle('c-2'))
})
