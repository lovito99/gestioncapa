import { expect, type Page } from '@playwright/test'
import { cuentas } from './datos'
import { completarAcceso, entrar } from './sesion'

export async function flujoInscripcionPublica(page: Page, administrador: Parameters<typeof entrar>[1], persistente: boolean) {
  const errores: string[] = []
  page.on('pageerror', error => errores.push(error.message))
  await entrar(page, administrador)
  const cursos: { id: string; titulo: string; costo: number }[] = []
  for (const costo of [0, 25]) {
    const titulo = `HU22 elección ${costo} ${Date.now()}`
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Cursos', exact: true }).click()
    await page.getByRole('link', { name: 'Crear curso', exact: true }).click()
    await page.getByLabel('Nombre del curso').fill(titulo)
    await page.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Curso público para elegir e inscribirse.')
    await page.getByLabel('Categoría').selectOption('Educación')
    await page.getByRole('combobox', { name: 'Modalidad', exact: true }).selectOption('PRESENCIAL')
    await page.getByLabel('Instructor asignado').selectOption({ label: 'Carlos Mendoza Ríos' })
    await page.getByLabel('Fecha de inicio').fill('2031-02-01')
    await page.getByLabel('Fecha de fin').fill('2031-02-28')
    await page.getByLabel('Horas lectivas').fill('8')
    const modalidadCobro = costo === 0 ? 'GRATUITO' : 'PREVIO'
    await page.getByRole('combobox', { name: 'Modalidad de cobro', exact: true }).selectOption(modalidadCobro)
    if (modalidadCobro === 'PREVIO') {
      await page.getByLabel('Costo (S/)').fill(String(costo))
      await page.getByLabel('Plazo para pagar (minutos)').fill('60')
    }
    await page.getByLabel('Cupos').fill('1')
    await page.getByRole('button', { name: '+ Agregar módulo', exact: true }).click()
    await page.getByLabel('Nombre del módulo 1').fill('Contenido de prueba')
    await page.getByRole('button', { name: 'Listo', exact: true }).click()
    const alta = page.waitForResponse(respuesta => respuesta.request().method() === 'POST' && respuesta.url().endsWith('/api/cursos'))
    await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click()
    const respuesta = await alta
    expect(respuesta.status()).toBe(201)
    const curso = await respuesta.json() as { id: string; titulo: string }
    await expect(page.getByRole('heading', { name: 'Editar curso', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Volver a cursos', exact: true }).click()
    await page.getByRole('link', { name: curso.titulo, exact: true }).click()
    await page.getByRole('button', { name: 'Publicar en catálogo', exact: true }).click()
    await expect(page.getByText('Publicado', { exact: true })).toBeVisible()
    cursos.push({ ...curso, costo })
  }
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await page.setViewportSize({ width: 360, height: 800 })
  const solicitudes: string[] = []
  page.on('request', solicitud => { if (solicitud.method() === 'POST' && solicitud.url().includes('/inscribirme')) solicitudes.push(solicitud.url()) })
  const buscar = async (titulo: string) => {
    await page.getByRole('banner').getByRole('link', { name: 'Colegio Profesional de Profesores del Perú – Región Cusco', exact: true }).click()
    await page.getByRole('searchbox', { name: 'Buscar curso', exact: true }).fill(titulo)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  }
  for (const curso of cursos) {
    await buscar(curso.titulo)
    const tarjeta = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: curso.titulo, exact: true }) })
    await expect(tarjeta).toContainText('8 horas lectivas')
    await expect(tarjeta).toContainText(curso.costo ? 'S/ 25.00' : 'Gratuito')
    const accion = tarjeta.getByRole('link', { name: `Inscribirme en ${curso.titulo}`, exact: true })
    await expect(accion).toHaveAttribute('href', `/login?curso=${curso.id}`)
    await accion.click()
    await expect(page).toHaveURL(`/login?curso=${curso.id}`)
    solicitudes.length = 0
    await completarAcceso(page, cuentas.part)
    await expect(page).toHaveURL(`/cursos/${curso.id}`)
    await expect(page.getByRole('heading', { name: curso.titulo, exact: true })).toBeVisible()
    expect(solicitudes).toEqual([])
    const inscripcion = page.waitForResponse(respuesta => respuesta.request().method() === 'POST' && respuesta.url().endsWith(`/cursos/${curso.id}/inscribirme`))
    await page.getByRole('button', { name: 'Inscribirme', exact: true }).click()
    const resultado = await inscripcion
    expect(resultado.status()).toBe(201)
    expect((await resultado.json()).estado).toBe(curso.costo ? 'PENDIENTE_PAGO' : 'EN_CURSO')
    await expect(page.getByRole('button', { name: curso.costo ? 'Pendiente de pago' : 'Ya estás inscrito(a)', exact: true })).toBeDisabled()
    if (persistente) await page.reload()
    await expect(page.getByRole('button', { name: curso.costo ? 'Pendiente de pago' : 'Ya estás inscrito(a)', exact: true })).toBeDisabled()
    expect(solicitudes).toHaveLength(1)
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  }
  const lleno = cursos[1]!
  await buscar(lleno.titulo)
  const tarjeta = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: lleno.titulo, exact: true }) })
  await expect(tarjeta).toContainText('Sin cupos')
  await expect(tarjeta.getByRole('link', { name: /Inscribirme/ })).toHaveCount(0)
  expect(errores).toEqual([])
}
