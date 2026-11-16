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
  await page.goto(`/cursos/${curso.id}`)
  const formulario = page.getByRole('group', { name: 'Programar sesión' })
  // Fechas propias del año 2036 para no cruzarse con otras pruebas del mismo instructor.
  const dia = 1 + Number(curso.id) % 20
  for (const [indice, modalidad] of ['Virtual en vivo', 'Virtual en vivo', 'Virtual en vivo', 'Virtual en vivo', 'Presencial'].entries()) {
    await formulario.getByLabel('Nombre de la sesión').fill(`Día ${indice + 1}`)
    await formulario.getByLabel('Fecha de la sesión').fill(`2036-0${indice + 1}-${String(dia).padStart(2, '0')}`)
    await formulario.getByLabel('Modalidad de la sesión').selectOption({ label: modalidad })
    await expect(formulario.getByLabel('Lugar de la sesión')).toHaveCount(modalidad === 'Presencial' ? 1 : 0)
    if (modalidad === 'Presencial') await formulario.getByLabel('Lugar de la sesión').fill('Auditorio del CPPP')
    await formulario.getByLabel('Hora de inicio de la sesión').fill('16:00')
    await formulario.getByLabel('Hora de fin de la sesión').fill('18:00')
    await formulario.getByRole('button', { name: 'Guardar sesión', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: /Sesión programada/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: `Día ${indice + 1}`, exact: true }).or(page.getByText(`Día ${indice + 1}`, { exact: true }))).toBeVisible()
  }
  await expect(page.getByRole('definition').filter({ hasText: 'Híbrido' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/login(\?.*)?$/)

  await entrar(page, cuentas.part)
  await page.goto(`/cursos/${curso.id}`)
  await expect(page.getByRole('definition').filter({ hasText: 'Híbrido' })).toBeVisible()
  const sesiones = page.getByRole('region', { name: 'Sesiones del curso' }).getByRole('listitem')
  await expect(sesiones).toHaveCount(5)
  for (let indice = 0; indice < 4; indice++) {
    await expect(sesiones.nth(indice)).toContainText('Virtual en vivo')
    await expect(sesiones.nth(indice)).toContainText('La sala se habilita al iniciar la sesión')
  }
  await expect(sesiones.nth(4)).toContainText('Presencial')
  await expect(sesiones.nth(4)).toContainText('Auditorio del CPPP')
  await expect(sesiones.nth(4)).not.toContainText('sala')
})
