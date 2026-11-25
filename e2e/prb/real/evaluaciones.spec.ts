import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { cuentaReal, cuentas } from '../../ayud/datos'
import { entornoBackendReal } from '../../ayud/entornoReal'
import { expect, test } from '../../ayud/prueba'
import { completarAcceso, entrar } from '../../ayud/sesion'

test('HU19-01 a HU19-09: autoría, dos intentos y certificado grabado con QR', async ({ page, browser }) => {
  test.setTimeout(90000)
  const { stdout } = await promisify(execFile)('npm', ['exec', '-w', 'backend', '--', 'tsx', 'src/scripts/evaluacionDemoE2e.ts'], {
    env: { ...process.env, ...entornoBackendReal },
  })
  const { cursoId, titulo, leccion } = JSON.parse(stdout) as { cursoId: string; titulo: string; leccion: string }
  const salir = () => page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()

  await entrar(page, cuentas.instr)
  await page.goto(`/instructor/cursos/${cursoId}/evaluaciones`)
  await page.getByRole('button', { name: 'Nueva evaluación' }).click()
  await page.getByLabel('Título de la evaluación').fill('Cuestionario de salida')
  await page.getByRole('checkbox', { name: 'Cuestionario oficial del curso' }).check()
  await page.getByRole('checkbox', { name: new RegExp(leccion) }).check()

  for (const [indice, datos] of [
    ['¿Cuál es el primer paso?', 'Identificar la evidencia', 'Publicar sin revisar'],
    ['¿Qué se hace después?', 'Revisar el resultado', 'Eliminar los datos'],
  ].entries()) {
    if (indice > 0) await page.getByRole('button', { name: 'Agregar pregunta' }).click()
    const pregunta = page.getByRole('group', { name: `Pregunta ${indice + 1}`, exact: true })
    await pregunta.getByLabel('Enunciado').fill(datos[0]!)
    await pregunta.getByRole('textbox', { name: 'Opción 1' }).fill(datos[1]!)
    await pregunta.getByRole('textbox', { name: 'Opción 2' }).fill(datos[2]!)
    await pregunta.getByRole('radio', { name: `Opción 1 correcta de la pregunta ${indice + 1}` }).check()
  }
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByText('Borrador guardado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Publicar evaluación' }).click()
  await expect(page.getByText('Evaluación publicada', { exact: true })).toBeVisible()

  await salir()
  await completarAcceso(page, cuentas.part)
  await page.getByRole('link', { name: 'Mis cursos', exact: true }).click()
  const curso = page.getByRole('article').filter({ hasText: titulo })
  await curso.getByRole('link', { name: 'Abrir aula grabada' }).click()
  await expect(page.getByRole('link', { name: /Rendir evaluación/ })).toHaveCount(0)
  await page.getByRole('button', { name: `Completar lección: ${leccion}` }).click()
  const rendir = page.getByRole('link', { name: 'Rendir evaluación: Cuestionario de salida' })
  await expect(rendir).toBeVisible()
  await page.reload()
  await rendir.click()

  async function entregar(opcion: string) {
    await page.getByRole('radio', { name: 'Identificar la evidencia', exact: true }).check()
    await page.getByRole('radio', { name: opcion, exact: true }).check()
    await page.getByRole('button', { name: 'Enviar respuestas' }).click()
  }

  await entregar('Eliminar los datos')
  await expect(page.getByText('Nota del intento: 10/20.')).toBeVisible()
  await page.getByRole('button', { name: 'Rendir de nuevo' }).click()
  await entregar('Revisar el resultado')
  await expect(page.getByText('Nota del intento: 20/20.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rendir de nuevo' })).toHaveCount(0)

  await salir()
  await completarAcceso(page, cuentaReal)
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
  await page.goto(`/admin/cursos/${cursoId}/certificados`)
  await page.getByRole('button', { name: 'Evaluar inscripción de María Quispe' }).click()
  await expect(page.getByText('Certificado de aprobación emitido.')).toBeVisible()

  await salir()
  await completarAcceso(page, cuentas.part)
  await page.getByRole('link', { name: 'Mis certificados', exact: true }).click()
  const certificado = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: titulo, exact: true }) })
  await certificado.getByRole('link', { name: 'Ver certificado' }).click()
  await expect(page.getByText('Nota: 20/20', { exact: true })).toBeVisible()
  await expect(page.getByText(/modalidad grabado|modalidad grabada/i)).toBeVisible()
  const espera = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PDF' }).click()
  const descarga = await espera
  const pdf = await readFile(await descarga.path())
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')

  const enlaceQr = await page.getByRole('link', { name: /Verificar el certificado/ }).getAttribute('href')
  expect(enlaceQr).toMatch(/\/verificar\/CPPP-[A-F0-9]+$/)
  const anonimo = await browser.newPage()
  try {
    const respuesta = anonimo.waitForResponse(item => new URL(item.url()).pathname.startsWith('/api/certificados/')
      && item.status() === 200)
    await anonimo.goto(new URL(enlaceQr!, page.url()).href)
    await expect(anonimo.getByRole('region', { name: 'Resultado de la verificación' })).toContainText('Válido')
    const publico = await (await respuesta).json()
    expect(publico).not.toHaveProperty('nota')
    expect(publico).not.toHaveProperty('dni')
  } finally {
    await anonimo.close()
  }
})
