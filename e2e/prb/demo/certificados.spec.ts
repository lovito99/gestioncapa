import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'

// SCRUM-171: el curso demo «Didáctica y evaluación» reproduce el Figma (6 inscritos, 2 no cumplen el 80 %).
test('CER-01: cierra el curso con una excepción, anula y corrige certificados', async ({ page }) => {
  await entrar(page, cuentas.admin)
  const menu = page.getByRole('navigation', { name: 'Navegación principal' })
  await menu.getByRole('link', { name: 'Certificados', exact: true }).click()
  await page.getByRole('row').filter({ hasText: 'Demo · Didáctica y evaluación' }).getByRole('link', { name: 'Cerrar curso' }).click()

  // 2.4 · Quién cumple el requisito de asistencia
  await expect(page.getByRole('heading', { name: 'Cerrar curso', exact: true })).toBeVisible()
  await expect(page.getByText('6 inscritos:')).toBeVisible()
  const pedro = page.getByRole('row').filter({ hasText: 'Pedro Alonso Vargas Soto' })
  await expect(pedro).toContainText('3 de 4 (75 %)')
  await expect(pedro).toContainText('No cumple')

  // 2.4b · Sin motivo no se emite; 2.4a · con motivo queda marcado como excepción
  await pedro.getByRole('button', { name: 'Emitir por excepción' }).click()
  const dialogo = page.getByRole('alertdialog')
  await dialogo.getByRole('button', { name: 'Emitir constancia', exact: true }).click()
  await expect(dialogo).toContainText('Ingresa el motivo de la excepción.')
  await dialogo.getByLabel('Motivo de la excepción').fill('Faltó por una emergencia médica justificada.')
  await dialogo.getByRole('button', { name: 'Emitir constancia', exact: true }).click()
  await expect(pedro).toContainText('Por excepción')
  await page.getByRole('button', { name: 'Emitir constancias' }).click()

  // 2.5 · 4 cumplen + 1 excepción = 5 constancias; quien no cumple queda sin emitir
  await expect(page.getByRole('heading', { name: 'Certificados del curso', exact: true })).toBeVisible()
  await expect(page.getByText('Se emitieron 5 constancias de participación.')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Diego Armando Huillca Quispe' })).toContainText('No emitido')

  // 2.5b / 2.5a · Anular exige motivo
  const jose = page.getByRole('row').filter({ hasText: 'José Luis Condori Mamani' })
  await jose.getByRole('button', { name: /Anular el certificado/ }).click()
  await dialogo.getByRole('button', { name: 'Anular certificado' }).click()
  await expect(dialogo).toContainText('Ingresa el motivo de la anulación.')
  await dialogo.getByLabel('Motivo de la anulación').fill('Emitido por error.')
  await dialogo.getByRole('button', { name: 'Anular certificado' }).click()
  await expect(jose).toContainText('Anulado')

  // 2.5c · Corregir emite un certificado nuevo; el anterior queda «Reemplazado»
  const maria = page.getByRole('row').filter({ hasText: 'María Fernanda Quispe Ramos' })
  const codigoAnterior = (await maria.getByRole('link').first().textContent())!.trim()
  await maria.getByRole('button', { name: /Corregir el certificado/ }).click()
  await dialogo.getByLabel('Nombre corregido').fill('María Fernanda Quispe Ramos de Torres')
  await dialogo.getByLabel('Motivo de la corrección').fill('Agregó su apellido de casada.')
  await dialogo.getByRole('button', { name: 'Corregir y emitir nuevo' }).click()
  const mariaNueva = page.getByRole('row').filter({ hasText: 'María Fernanda Quispe Ramos de Torres' })
  await expect(mariaNueva).toContainText('Válido')
  await expect(mariaNueva).not.toContainText(codigoAnterior)

  // La verificación pública muestra el reemplazo (navegando en la SPA para conservar los datos demo)
  await page.evaluate((codigo) => {
    window.history.pushState({}, '', `/verificar/${codigo}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, codigoAnterior)
  await expect(page.getByText('Este certificado fue reemplazado por el código', { exact: false })).toBeVisible()
  await page.getByRole('link', { name: 'Ver certificado vigente' }).click()
  await expect(page.getByText('Registro de demostración verificado.')).toBeVisible()
  await expect(page.getByText('María Fernanda Quispe Ramos de Torres')).toBeVisible()
})

// SCRUM-138: la verificación es pública y acepta el código en minúsculas
test('CER-02: verifica certificados sin sesión', async ({ page }) => {
  await page.goto('/verificar')
  await page.getByLabel('Código del certificado').fill('cppp-7k4m-q9x2')
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByText('Registro de demostración verificado.')).toBeVisible()
  await page.goto('/verificar/CPPP-2B6F-H8Z4')
  await expect(page.getByText('Este certificado fue anulado y no tiene validez.')).toBeVisible()
  await page.goto('/verificar/NO-EXISTE')
  await expect(page.getByRole('alert')).toContainText('No encontramos un certificado con ese código')
})
