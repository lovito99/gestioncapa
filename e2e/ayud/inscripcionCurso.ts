import { expect, type Page } from '@playwright/test'
import { cuentas } from './datos'
import { completarAcceso, entrar } from './sesion'

export async function flujoInscripcionCurso(page: Page, admin: Parameters<typeof entrar>[1]) {
  await entrar(page, admin)
  const titulo = `HU16 · Curso con costo ${Date.now()}`
  const id = await page.evaluate(async titulo => {
    const cabeceras = { Authorization: `Bearer ${sessionStorage.getItem('gc.token')}`, 'Content-Type': 'application/json' }
    const instructores = await (await fetch('/api/cursos/instructores', { headers: cabeceras })).json()
    const respuesta = await fetch('/api/cursos', { method: 'POST', headers: cabeceras, body: JSON.stringify({
      titulo, descripcion: 'Reserva de vacante pendiente de pago.', instructorId: instructores[0].id,
      horasLectivas: 8, modalidad: 'VIRTUAL', costo: 45, cupos: 1, tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Introducción' }],
    }) })
    if (respuesta.status !== 201) throw new Error(await respuesta.text())
    const curso = await respuesta.json()
    const publicado = await fetch(`/api/cursos/${curso.id}/publicar`, { method: 'POST', headers: cabeceras, body: '{}' })
    if (!publicado.ok) throw new Error(await publicado.text())
    return curso.id as string
  }, titulo)
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await completarAcceso(page, cuentas.part)
  await page.getByRole('link', { name: 'Catálogo', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Buscar curso' }).fill(titulo)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await page.getByRole('link', { name: titulo, exact: true }).click()
  const respuesta = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/cursos/${id}/inscribirme`))
  await page.getByRole('button', { name: 'Inscribirme', exact: true }).click()
  expect((await respuesta).status()).toBe(201)
  await expect(page.getByRole('button', { name: 'Pendiente de pago', exact: true })).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('aún no está confirmada')
  await page.getByRole('link', { name: 'Mis cursos', exact: true }).click()
  const tarjeta = page.getByRole('article').filter({ has: page.getByRole('heading', { name: titulo, exact: true }) })
  await expect(tarjeta.getByText('Pendiente de pago', { exact: true })).toBeVisible()
  await expect(tarjeta.getByText('En curso', { exact: true })).toHaveCount(0)
  await tarjeta.getByRole('link', { name: titulo, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pendiente de pago', exact: true })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}
