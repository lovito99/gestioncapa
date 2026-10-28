import { expect, type Page } from '@playwright/test'
import { cuentas } from './datos'
import { completarAcceso, entrar } from './sesion'

export async function flujoCatalogo(page: Page, admin: Parameters<typeof entrar>[1], persistente: boolean) {
  await entrar(page, admin)
  const clave = `HU14 catálogo ${Date.now()}`
  const categoria = `Catálogo E2E ${Date.now()}`
  const fixtures = await page.evaluate(async ({ clave, categoria, luz }) => {
    const token = sessionStorage.getItem('gc.token')!
    const llamar = async (ruta: string, data?: object, credencial = token) => {
      const respuesta = await fetch(`/api${ruta}`, { method: data ? 'POST' : 'GET', headers: { Authorization: `Bearer ${credencial}`, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) })
      const cuerpo = await respuesta.json()
      if (!respuesta.ok) throw new Error(`${respuesta.status}: ${JSON.stringify(cuerpo)}`)
      return cuerpo
    }
    const instructores = await llamar('/cursos/instructores') as { id: string; nombre: string }[]
    const instructorId = instructores.find(i => i.nombre === 'Carlos Mendoza Ríos')!.id
    const cursos: { id: string; titulo: string }[] = []
    for (let i=0;i<9;i++) {
      const curso = await llamar('/cursos', { titulo: `${clave} Curso ${i}`, descripcion: 'Descripción para elegir esta capacitación.', instructorId,
        categoria, fechaInicio: '2031-02-01', fechaFin: '2031-02-28', horasLectivas: 8, modalidad: i%2 ? 'PRESENCIAL' : 'VIRTUAL', costo: 0, cupos: i===7 ? 1 : 2, tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Módulo de ejemplo' }] })
      cursos.push(curso)
      if (i<8) await llamar(`/cursos/${curso.id}/publicar`, {})
    }
    const accesoLuz = await llamar('/auth/login', luz)
    await llamar(`/cursos/${cursos[7]!.id}/inscribirme`, {}, accesoLuz.token)
    return cursos
  }, { clave, categoria, luz: { email: cuentas.luz.email, password: cuentas.luz.password } })
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await completarAcceso(page, cuentas.part)
  await page.getByRole('link', { name: 'Catálogo de cursos', exact: true }).click()
  const buscar = async (texto: string) => {
    await page.getByRole('textbox', { name: 'Buscar por nombre' }).fill(texto)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  }
  const lista = page.getByRole('list').filter({ has: page.getByRole('heading', { level: 2 }) })
  await buscar(clave.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase())
  await expect(page.getByRole('status')).toContainText('8 cursos encontrados')
  await expect(lista.getByRole('listitem')).toHaveCount(6)
  await expect(lista.getByText('Descripción para elegir esta capacitación.', { exact: true }).first()).toBeVisible()
  await expect(lista.getByText('Instructor: Carlos Mendoza Ríos', { exact: true }).first()).toBeVisible()
  await expect(lista.getByText('01/02/2031 al 28/02/2031', { exact: true }).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(lista.getByRole('listitem')).toHaveCount(2)
  if (persistente) {
    await page.reload()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await expect(lista.getByRole('listitem')).toHaveCount(2)
  }
  await page.getByRole('combobox', { name: 'Filtrar por modalidad' }).selectOption('VIRTUAL')
  await page.getByRole('combobox', { name: 'Filtrar por categoría' }).selectOption(categoria)
  await expect(page.getByRole('status')).toContainText('4 cursos encontrados')
  await expect(page.getByText('Página 1 de 1')).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await buscar(fixtures[8]!.titulo)
  await expect(page.getByRole('status')).toContainText('0 cursos encontrados')
  await buscar(fixtures[7]!.titulo)
  await page.getByRole('link', { name: fixtures[7]!.titulo, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sin cupos', exact: true })).toBeDisabled()
  const bloqueo = await page.evaluate(async id => {
    const respuesta = await fetch(`/api/cursos/${id}/inscribirme`, { method: 'POST', headers: { Authorization: `Bearer ${sessionStorage.getItem('gc.token')}` } })
    return { status: respuesta.status, cuerpo: await respuesta.json() }
  }, fixtures[7]!.id)
  expect(bloqueo).toMatchObject({ status: 409, cuerpo: { code: 'SIN_CUPOS' } })
  await page.getByRole('link', { name: 'Catálogo de cursos', exact: true }).click()
  await buscar(fixtures[0]!.titulo)
  await page.getByRole('link', { name: fixtures[0]!.titulo, exact: true }).click()
  await page.getByRole('button', { name: 'Inscribirme', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ya estás inscrito(a)', exact: true })).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('Inscripción registrada')
  await page.getByRole('link', { name: 'Mi historial', exact: true }).click()
  await expect(page.getByRole('heading', { name: fixtures[0]!.titulo, exact: true })).toBeVisible()
}
