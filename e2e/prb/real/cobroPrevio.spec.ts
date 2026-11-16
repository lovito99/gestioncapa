import { expect, test } from '../../ayud/prueba'
import { cuentaReal, cuentas } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'
import { registrarEfectivo } from '../../ayud/registroEfectivo'

test.use({ viewport: { width: 360, height: 800 } })

test('HU53: crea y edita el cobro; reserva, recibe efectivo y habilita contenido', async ({ page, context }) => {
  test.setTimeout(90000)
  const errores: string[] = []
  page.on('pageerror', error => errores.push(error.message))
  const titulo = `HU53 pago previo ${Date.now()}`
  await entrar(page, cuentaReal)
  await page.goto('/admin/cursos/nuevo')
  await page.getByLabel('Nombre del curso').fill(titulo)
  await page.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Curso con reserva y pago previo.')
  await page.getByLabel('Categoría').selectOption('Educación')
  await page.getByRole('combobox', { name: 'Modalidad', exact: true }).selectOption('PRESENCIAL')
  await page.getByLabel('Instructor asignado').selectOption({ label: 'Carlos Mendoza Ríos' })
  await page.getByLabel('Fecha de inicio').fill('2032-01-15')
  await page.getByLabel('Fecha de fin').fill('2032-01-20')
  await page.getByLabel('Horas lectivas').fill('24')
  await page.getByRole('combobox', { name: 'Modalidad de cobro', exact: true }).selectOption('PREVIO')
  await page.getByLabel('Costo (S/)').fill('25.50')
  await page.getByLabel('Plazo para pagar (minutos)').fill('60')
  await page.getByLabel('Cupos').fill('1')
  await page.getByRole('button', { name: '+ Agregar módulo', exact: true }).click()
  await page.getByLabel('Nombre del módulo 1').fill('Contenido reservado')
  await page.getByRole('button', { name: 'Listo', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Editar curso', exact: true })).toBeVisible()
  const cursoId = new URL(page.url()).pathname.split('/').at(-2)!
  const editor = page.getByRole('form', { name: 'Condiciones de cobro', exact: true })
  await editor.getByLabel('Costo (S/)').fill('30.50')
  const guardado = page.waitForResponse(respuesta => respuesta.request().method() === 'PATCH' && respuesta.url().endsWith(`/cursos/${cursoId}/cobro`))
  await editor.getByRole('button', { name: 'Guardar condiciones de cobro' }).click()
  expect((await guardado).status()).toBe(200)
  await page.goto(`/cursos/${cursoId}`)
  await page.getByRole('button', { name: 'Publicar en catálogo' }).click()
  await expect(page.getByText('Publicado', { exact: true })).toBeVisible()
  const participante = await context.newPage()
  await entrar(participante, cuentas.part)
  await participante.goto(`/cursos/${cursoId}`)
  await expect(participante.getByText(/Pago antes de llevar el curso.*30\.50/)).toBeVisible()
  const alta = participante.waitForResponse(respuesta => respuesta.url().endsWith(`/cursos/${cursoId}/inscribirme`))
  await participante.getByRole('button', { name: 'Inscribirme', exact: true }).click()
  const { pagoId } = await (await alta).json() as { pagoId: string }
  await expect(participante.getByRole('button', { name: 'Pendiente de pago', exact: true })).toBeDisabled()
  await expect(participante.getByRole('heading', { name: '1. Contenido reservado' })).toHaveCount(0)
  await expect(participante.getByRole('button', { name: 'Pagar con Culqi' })).toHaveCount(0)
  await registrarEfectivo(page, pagoId)
  await expect(participante.getByRole('heading', { name: 'Pago confirmado', exact: true })).toBeVisible({ timeout: 10000 })
  await expect(participante.getByRole('heading', { name: '1. Contenido reservado' })).toBeVisible()
  expect(await participante.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await participante.screenshot({ path: test.info().outputPath('pagoConfirmado.png'), fullPage: true })
  await participante.close()
  expect(errores).toEqual([])
})
