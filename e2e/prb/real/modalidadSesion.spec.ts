import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { apiReal } from '../../ayud/rutas'
import { entrar } from '../../ayud/sesion'

test('HU-36: cuatro sesiones virtuales y una presencial forman un curso híbrido que el colegiado ve con su aula o su sala', async ({ page, request }) => {
  test.setTimeout(90000)
  const sesionDe = async (cuenta: { email: string; password: string }) => ({ Authorization: `Bearer ${(await (await request.post(`${apiReal}/auth/login`, { data: cuenta })).json()).token}` })
  const admin = await sesionDe(cuentas.coord)
  const instructores: { id: string; nombre: string }[] = await (await request.get(`${apiReal}/cursos/instructores`, { headers: admin })).json()
  // Curso gratuito preparado por la API; las sesiones se programan desde la interfaz.
  const creado = await request.post(`${apiReal}/cursos`, { headers: admin, data: { titulo: `HU36 híbrido ${Date.now()}`, instructorId: instructores.find(i => i.nombre === 'Carlos Mendoza Ríos')!.id,
    horasLectivas: 10, modalidad: 'PRESENCIAL', costo: 0, modalidadCobro: 'GRATUITO', cupos: 30, tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Contenido' }] } })
  expect(creado.status()).toBe(201)
  const curso = await creado.json() as { id: string; titulo: string }
  expect((await request.post(`${apiReal}/cursos/${curso.id}/publicar`, { headers: admin })).status()).toBe(200)
  expect((await request.post(`${apiReal}/cursos/${curso.id}/inscribirme`, { headers: await sesionDe(cuentas.part) })).status()).toBe(201)

  await entrar(page, cuentas.coord)
  // S3 6.1: cada sesión se programa en su propia página con su modalidad.
  const dia = 1 + Number(curso.id) % 20
  for (const [indice, modalidad] of ['Virtual', 'Virtual', 'Virtual', 'Virtual', 'Presencial'].entries()) {
    await page.goto(`/admin/cursos/${curso.id}/sesiones/nueva`)
    await expect(page.getByRole('heading', { level: 1, name: `Programar sesión ${indice + 1}`, exact: true })).toBeVisible()
    await page.locator('label').filter({ hasText: new RegExp(`^${modalidad}En `) }).click()
    // Fechas propias del año 2036 para no cruzarse con otras pruebas del mismo instructor.
    await page.getByRole('textbox', { name: 'Fecha', exact: true }).fill(`2036-0${indice + 1}-${String(dia).padStart(2, '0')}`)
    await page.getByRole('textbox', { name: 'Hora de inicio', exact: true }).fill('16:00')
    await page.getByRole('textbox', { name: 'Hora de fin', exact: true }).fill('18:00')
    await expect(page.getByRole('combobox', { name: 'Sede', exact: true })).toHaveCount(modalidad === 'Presencial' ? 1 : 0)
    if (modalidad === 'Presencial') {
      await page.getByRole('combobox', { name: 'Sede', exact: true }).selectOption('Sede CPPP Cusco · Av. La Cultura 1112')
      await page.getByRole('textbox', { name: 'Aula o referencia', exact: true }).fill('Auditorio del CPPP')
    }
    await page.getByRole('button', { name: 'Guardar sesión', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Sesiones', exact: true }).getByRole('listitem')).toHaveCount(indice + 1)
  }
  await expect(page.getByText('El curso se muestra como «Híbrido»', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/login(\?.*)?$/)

  await entrar(page, cuentas.part)
  await page.goto(`/cursos/${curso.id}`)
  await expect(page.getByText('Híbrido', { exact: true }).first()).toBeVisible()
  const sesiones = page.getByRole('region', { name: 'Sesiones', exact: true }).getByRole('listitem')
  await expect(sesiones).toHaveCount(5)
  for (let indice = 0; indice < 4; indice++) {
    await expect(sesiones.nth(indice)).toContainText('Virtual')
    await expect(sesiones.nth(indice)).toContainText('Sala virtual del CPPP')
  }
  await expect(sesiones.nth(4)).toContainText('Presencial')
  await expect(sesiones.nth(4)).toContainText('Auditorio del CPPP, Sede CPPP Cusco · Av. La Cultura 1112')
  await expect(sesiones.nth(4)).not.toContainText('sala virtual')
})
