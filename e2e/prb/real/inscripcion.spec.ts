import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { apiReal, rutas } from '../../ayud/rutas'
import { entrar } from '../../ayud/sesion'

test('INS-07: la coordinadora inscribe a una participante sin duplicarla con el backend real', async ({ page, request }) => {
  // Clase preparada por la API real; fecha propia para no cruzarse con otras pruebas en paralelo.
  const { token } = await (await request.post(`${apiReal}/auth/login`, { data: cuentas.coord })).json()
  const headers = { Authorization: `Bearer ${token}` }
  const instructores: { id: string; nombre: string }[] = await (await request.get(`${apiReal}/instructores`, { headers })).json()
  const creada = await request.post(`${apiReal}/clases`, {
    headers,
    data: {
      nombre: 'Inscripción E2E',
      instructorId: instructores.find((i) => i.nombre === 'Carlos Mendoza Ríos')!.id,
      fecha: '2030-03-10',
      horaInicio: '10:00',
      horaFin: '11:00',
      lugar: 'Sala de pruebas',
    },
  })
  expect(creada.status()).toBe(201)
  const { id } = await creada.json()

  await entrar(page, cuentas.coord)
  await page.goto(rutas.detalle(id))
  await expect(page.getByRole('heading', { name: 'Inscritos (0)', exact: true })).toBeVisible()
  const correo = page.getByLabel('Correo del participante')
  const inscribir = page.getByRole('button', { name: 'Inscribir', exact: true })

  await correo.fill('persona-inexistente@demo.pe')
  await inscribir.click()
  await expect(page.getByRole('alert')).toContainText('No encontramos un participante')

  await correo.fill(cuentas.part.email)
  await inscribir.click()
  await expect(page.getByRole('heading', { name: 'Inscritos (1)', exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: cuentas.part.email })).toBeVisible()

  await correo.fill(cuentas.part.email)
  await inscribir.click()
  await expect(page.getByRole('alert')).toContainText('ya está inscrito(a)')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Inscritos (1)', exact: true })).toBeVisible()
})
