import { expect, test } from '../../ayud/prueba'
import { cuentaReal, cuentas } from '../../ayud/datos'
import { entrar } from '../../ayud/sesion'
import { registrarEfectivo } from '../../ayud/registroEfectivo'
import { confirmarInscripcion, elegirCobro } from '../../ayud/cobroInscripcion'

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
  await page.getByLabel('Instructor asignado').selectOption({ label: 'Carlos Mendoza Ríos' })
  await page.getByLabel('Fecha de inicio').fill('2032-01-15')
  await page.getByLabel('Fecha de fin').fill('2032-01-20')
  await page.getByLabel('Horas lectivas').fill('24')
  // S3 2.1: la modalidad se calcula por las sesiones y el cobro se elige con tarjetas
  await elegirCobro(page, 'PREVIO', 25.5, 1)
  await page.getByLabel('Cupos').fill('1')
  await page.getByRole('button', { name: '+ Agregar módulo', exact: true }).click()
  await page.getByLabel('Nombre del módulo 1').fill('Contenido reservado')
  await page.getByRole('button', { name: 'Listo', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Editar curso', exact: true })).toBeVisible()
  const cursoId = new URL(page.url()).pathname.split('/').at(-2)!
  const editor = page.getByRole('form', { name: 'Cobro', exact: true })
  await editor.getByLabel('Precio para colegiados (S/)').fill('30.50')
  await editor.getByLabel('Precio general (S/)').fill('30.50')
  const guardado = page.waitForResponse(respuesta => respuesta.request().method() === 'PATCH' && respuesta.url().endsWith(`/cursos/${cursoId}/cobro`))
  await editor.getByRole('button', { name: 'Guardar cobro', exact: true }).click()
  expect((await guardado).status()).toBe(200)
  await page.goto(`/cursos/${cursoId}`)
  await page.getByRole('button', { name: 'Publicar en catálogo' }).click()
  await expect(page.getByText('Publicado', { exact: true })).toBeVisible()
  const participante = await context.newPage()
  await entrar(participante, cuentas.part)
  await participante.goto(`/cursos/${cursoId}`)
  const inscripcion = participante.getByRole('region', { name: 'Inscripción', exact: true })
  await expect(inscripcion).toContainText('S/ 30.50')
  await expect(inscripcion).toContainText('Pago antes de llevar el curso')
  const alta = participante.waitForResponse(respuesta => respuesta.url().endsWith(`/cursos/${cursoId}/inscribirme`))
  await confirmarInscripcion(participante, true)
  const { pagoId } = await (await alta).json() as { pagoId: string }
  await expect(participante).toHaveURL(`/cursos/${cursoId}/pagar`)
  await participante.goto(`/cursos/${cursoId}`)
  await expect(participante.getByText('Inscripción pendiente de pago', { exact: true })).toBeVisible()
  await expect(participante.getByRole('heading', { name: '1. Contenido reservado' })).toHaveCount(0)
  await registrarEfectivo(page, pagoId)
  await participante.goto(`/cursos/${cursoId}/pagar`)
  await expect(participante.getByRole('heading', { name: '¡Pago confirmado!', exact: true })).toBeVisible({ timeout: 10000 })
  await participante.getByRole('link', { name: 'Ir al curso', exact: true }).click()
  await expect(participante.getByRole('heading', { name: '1. Contenido reservado' })).toBeVisible()
  expect(await participante.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await participante.screenshot({ path: test.info().outputPath('pagoConfirmado.png'), fullPage: true })
  await participante.close()
  expect(errores).toEqual([])
})
