import { expect, test } from '../../ayud/prueba'
import { cuentaReal } from '../../ayud/datos'
import { flujoPortadaCatalogo, publicarCursosConPortada } from '../../ayud/portadas'

test.use({ viewport: { width: 360, height: 800 } })
test('HU-51: tarjeta con portada responsiva, respaldo y detalle con API real', async ({ page, browser }) => {
  test.setTimeout(90000)
  const { clave, cursos } = await publicarCursosConPortada(page, cuentaReal)
  await flujoPortadaCatalogo(page, true, cursos, clave)

  // Con DPR 2, la tarjeta anónima de 360 px elige la variante de 704 px.
  const contexto = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 })
  const anonima = await contexto.newPage()
  await anonima.goto(`/?buscar=${encodeURIComponent(clave)}`)
  const imagen = anonima.getByRole('img', { name: cursos.conImagen.titulo, exact: true })
  await expect.poll(() => imagen.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/tarjeta$/)
  const bytes = await imagen.evaluate(async (img: HTMLImageElement) => (await (await fetch(img.currentSrc)).arrayBuffer()).byteLength)
  expect(bytes).toBeLessThanOrEqual(180 * 1024)
  await contexto.close()
})

test('HU-51/HU-40: el enlace corto abre la ficha pública con la portada grande y conserva el curso al acceder', async ({ page }) => {
  test.setTimeout(60000)
  const { cursos, vencido } = await publicarCursosConPortada(page, cuentaReal)
  const { conImagen } = cursos
  await page.goto(`/c/${conImagen.id}`)
  await expect(page.getByRole('heading', { level: 1, name: conImagen.titulo })).toBeVisible()
  const portada = page.getByRole('img', { name: conImagen.titulo, exact: true })
  await expect.poll(() => portada.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/grande$/)
  expect((await portada.boundingBox())!.width).toBeGreaterThan(300)

  await page.getByRole('button', { name: `Compartir ${conImagen.titulo}` }).first().click()
  await expect(page.getByRole('dialog').getByText(new RegExp(`/c/${conImagen.id}$`))).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Inscribirme', exact: true }).click()
  await expect(page).toHaveURL(`/login?curso=${conImagen.id}`)

  await page.goto(`/c/${vencido.id}`)
  await expect(page.getByText('Curso finalizado', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Inscribirme', exact: true })).toHaveCount(0)
  await page.goto('/c/999999999999')
  await expect(page.getByText('Este curso ya no está disponible', { exact: true })).toBeVisible()
})
