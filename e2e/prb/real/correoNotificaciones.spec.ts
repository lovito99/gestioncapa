import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '../../ayud/prueba'
import { cuentaReal, cuentas } from '../../ayud/datos'
import { completarAcceso, entrar } from '../../ayud/sesion'

async function cabecera(request: APIRequestContext, cuenta: { email: string; password: string }) {
  const acceso = await request.post('/api/auth/login', { data: { email: cuenta.email, password: cuenta.password } })
  expect(acceso.ok()).toBe(true)
  return { authorization: 'Bearer ' + (await acceso.json()).token }
}

async function publicarCurso(request: APIRequestContext) {
  const headers = await cabecera(request, cuentaReal)
  const instructores = await request.get('/api/cursos/instructores', { headers })
  expect(instructores.ok()).toBe(true)
  const { id: instructorId } = (await instructores.json())[0]
  const alta = await request.post('/api/cursos', { headers, data: {
    instructorId, titulo: 'HU29 · Didáctica por correo', horasLectivas: 8, modalidad: 'PRESENCIAL', costo: 0,
    cupos: 5, modalidadCobro: 'GRATUITO', tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Introducción' }],
  } })
  expect(alta.status()).toBe(201)
  const curso = await alta.json() as { id: string; titulo: string }
  expect((await request.post('/api/cursos/' + curso.id + '/publicar', { headers })).ok()).toBe(true)
  return curso
}

test('HU29 panel muestra el estado del aviso y permite filtrarlo', async ({ page, request }) => {
  const curso = await publicarCurso(request)
  const headers = await cabecera(request, cuentas.part)
  expect((await request.post('/api/cursos/' + curso.id + '/inscribirme', { headers })).status()).toBe(201)
  await entrar(page, cuentaReal)
  await page.getByRole('link', { name: 'Correos', exact: true }).click({ timeout: 5000 })
  await expect(page.getByRole('heading', { name: 'Notificaciones por correo' })).toBeVisible()
  await expect(page.getByText('Envío pausado', { exact: true })).toBeVisible()
  await page.getByLabel('Tipo de aviso').selectOption('INSCRIPCION_CONFIRMADA')
  await page.getByLabel('Estado').selectOption('PENDIENTE')
  const aviso = page.getByRole('listitem').filter({ hasText: 'Curso #' + curso.id })
  await expect(aviso).toContainText('Inscripción confirmada')
  await expect(aviso).toContainText('Pendiente')
})

test('HU29 enlace al curso lleva al destino después de iniciar sesión', async ({ page, request }) => {
  const curso = await publicarCurso(request)
  const headers = await cabecera(request, cuentas.part)
  expect((await request.post('/api/cursos/' + curso.id + '/inscribirme', { headers })).status()).toBe(201)
  await page.goto('/cursos/' + curso.id)
  await expect(page).toHaveURL('/login?curso=' + curso.id)
  await completarAcceso(page, cuentas.part)
  await expect(page).toHaveURL('/cursos/' + curso.id)
  await expect(page.getByRole('heading', { name: curso.titulo, exact: true })).toBeVisible()
  expect((await request.get('/api/admin/notificaciones/correo', { headers })).status()).toBe(403)
})
