import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, test } from '../../ayud/prueba'
import { cuentaReal, cuentas } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'
import { entornoBackendReal } from '../../ayud/entornoReal'
import { registrarEfectivo } from '../../ayud/registroEfectivo'

test.use({ viewport: { width: 360, height: 800 } })

test('HU53: retiene la constancia hasta pagar y emite gratis sin obligación', async ({ page, context }) => {
  test.setTimeout(90000)
  const { stdout } = await promisify(execFile)('node', ['--import', 'tsx', 'src/scripts/cobroDemoE2e.ts'], {
    cwd: 'backend', env: { ...process.env, ...entornoBackendReal },
  })
  const cursos = JSON.parse(stdout) as { id: string; titulo: string; modalidadCobro: string }[]
  await entrar(page, cuentaReal)
  const participante = await context.newPage()
  await entrar(participante, cuentas.part)
  for (const curso of cursos) {
    await page.goto(`/admin/cursos/${curso.id}/cerrar`)
    await page.getByRole('button', { name: 'Emitir constancias', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Certificados del curso', exact: true })).toBeVisible()
    const fila = page.getByRole('row').filter({ hasText: 'María Quispe' })
    if (curso.modalidadCobro === 'CERTIFICADO') {
      await expect(fila).toContainText('Retenida')
      const enlace = fila.getByRole('link', { name: /pago/i })
      const pagoId = new URL((await enlace.getAttribute('href'))!, 'http://localhost').searchParams.get('pago')!
      await participante.goto(`/cursos/${curso.id}`)
      await expect(participante.getByText(/Constancia retenida:/)).toBeVisible()
      await participante.screenshot({ path: test.info().outputPath('constanciaRetenida.png'), fullPage: true })
      await registrarEfectivo(page, pagoId)
      await expect(participante.getByRole('heading', { name: 'Pago confirmado', exact: true })).toBeVisible({ timeout: 10000 })
      await expect(participante.getByText(/Constancia retenida:|Estamos preparando/)).toHaveCount(0, { timeout: 40000 })
      await participante.getByRole('link', { name: 'Mis cursos', exact: true }).click()
      const tarjeta = participante.getByRole('article').filter({ has: participante.getByRole('heading', { name: curso.titulo, exact: true }) })
      await expect(tarjeta.getByRole('link', { name: /constancia|certificado/i }).first()).toBeVisible()
      await tarjeta.getByText('Inscripciones anteriores (1)', { exact: true }).click()
      await expect(tarjeta.locator('details')).toContainText('45.00')
      await tarjeta.getByRole('button', { name: /Consultar pago #/ }).click()
      await expect(tarjeta.getByRole('heading', { name: 'Reserva no vigente', exact: true })).toBeVisible()
      await participante.screenshot({ path: test.info().outputPath('historialIntentos.png'), fullPage: true })
    } else {
      await expect(fila.getByRole('link').first()).toHaveAttribute('href', new RegExp('/verificar/'))
      await participante.goto(`/cursos/${curso.id}`)
      await expect(participante.getByRole('button', { name: /Pagar con/ })).toHaveCount(0)
    }
  }
  await participante.close()
})
