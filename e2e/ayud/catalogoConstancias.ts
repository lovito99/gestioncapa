import { expect, test, type Page } from '@playwright/test'

export async function flujoConstanciasPublicas(page: Page) {
  const errores: string[] = []
  page.on('pageerror', error => errores.push(error.message))
  await page.goto('/')
  const encabezado = page.getByRole('banner')
  const enlace = encabezado.getByRole('link', { name: 'Consultar constancias', exact: true })
  await expect(enlace).toHaveAttribute('href', '/verificar')
  for (const ancho of [320, 360, 768, 1024, 1440]) {
    await page.setViewportSize({ width: ancho, height: 900 })
    await expect(enlace).toBeVisible()
    await expect(encabezado.getByRole('link', { name: 'Ir a la web del CPPP ↗', exact: true }).filter({ visible: true })).toHaveAttribute('href', 'https://www.cpppregion-cusco.com/')
    const medidas = await page.evaluate(() => ({ ancho: innerWidth, contenido: document.documentElement.scrollWidth,
      extremos: [...document.querySelectorAll('body *')].filter(elemento => elemento.getBoundingClientRect().right > innerWidth).slice(0, 6).map(elemento => ({ etiqueta: elemento.tagName, clase: elemento.className })) }))
    expect(medidas.contenido, JSON.stringify(medidas)).toBeLessThanOrEqual(medidas.ancho)
  }
  await page.setViewportSize({ width: 360, height: 800 })
  await encabezado.screenshot({ path: test.info().outputPath('encabezadoPublico.png') })
  for (let turno = 0; turno < 12; turno++) {
    if (await enlace.evaluate(elemento => elemento === document.activeElement)) break
    await page.keyboard.press('Tab')
  }
  await expect(enlace).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/verificar')
  await expect(page.getByRole('heading', { name: 'Verificar certificado', exact: true })).toBeVisible()
  await page.getByLabel('Código del certificado').fill('CPPP-NO-EXISTE')
  await page.getByRole('button', { name: 'Verificar', exact: true }).click()
  await expect(page.getByText(/No encontramos un certificado/)).toBeVisible()
  expect(errores).toEqual([])
}
