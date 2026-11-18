import { test, expect } from '../../ayud/prueba'
import { cuentaReal } from '../../ayud/datos'
import { flujoCurso } from '../../ayud/cursos'
import { completarBorrador, elegirPortada } from '../../ayud/portadas'
import { entrar } from '../../ayud/sesion'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-13: crea, ordena, publica y agrega material con backend real', async ({ page }) => {
  test.setTimeout(60000)
  const errores: string[] = []
  page.on('pageerror', error => errores.push(error.message))
  await flujoCurso(page, cuentaReal)
  expect(errores).toEqual([])
  await page.screenshot({ path: test.info().outputPath('sesiones.png'), fullPage: true })
})

test('HU-51: crea, cambia y quita una portada desde administración real', async ({ page }) => {
  const titulo = `HU-51 Portada ${Date.now()}`
  await entrar(page, cuentaReal)
  await completarBorrador(page, titulo)

  await elegirPortada(page, 320, 320)
  await expect(page.getByRole('alert').filter({ hasText: '16:9' })).toBeVisible()
  await elegirPortada(page)
  await expect(page.getByRole('img', { name: titulo, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Editar curso', exact: true })).toBeVisible()
  await page.reload()
  const portada = page.getByRole('img', { name: titulo, exact: true })
  await expect(portada).toHaveAttribute('src', /^blob:/)

  await elegirPortada(page, 640, 360, [168, 41, 65])
  await page.getByRole('button', { name: 'Guardar portada', exact: true }).click()
  await expect(page.getByText('Portada guardada.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(portada).toHaveAttribute('src', /^blob:/)

  await page.getByRole('button', { name: 'Quitar', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar portada', exact: true }).click()
  await expect(page.getByText('Se usará la portada de la categoría.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Imagen de portada')).toBeAttached()
  await expect(page.getByRole('button', { name: 'Quitar', exact: true })).toHaveCount(0)
})
