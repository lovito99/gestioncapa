import { expect, test } from '@playwright/test'

test('RF-07: catálogo anónimo conectado al servidor real', async ({ page, request }) => {
  const respuesta = await request.get('/api/publico/cursos?tamanoPagina=50')
  expect(respuesta.status()).toBe(200)
  const datos = await respuesta.json()
  expect(datos.items.length).toBeGreaterThan(0)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Catálogo de cursos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: datos.items[0].titulo })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  expect((await request.get('/api/catalogo/cursos/pagina')).status()).toBe(401)
  expect((await request.get(`/api/cursos/${datos.items[0].id}`)).status()).toBe(401)
})
