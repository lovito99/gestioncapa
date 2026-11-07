import { test } from '../../ayud/prueba'
import './catalogo.spec'
test.beforeEach(async ({ page }) => {
  const sesion = await page.context().newCDPSession(page)
  await sesion.send('Emulation.setCPUThrottlingRate', { rate: 6 })
})
