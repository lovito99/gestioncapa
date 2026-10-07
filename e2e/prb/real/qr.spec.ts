import { expect, test } from '../../ayud/prueba'
import { cuentas } from '../../ayud/datos'
import { apiReal } from '../../ayud/rutas'
import { entrar } from '../../ayud/sesion'

const esQr = (url: string) => /\/api\/clases\/\d+\/qr$/.test(new URL(url).pathname)

test('QR-07: el instructor ve el QR rotativo de su clase con el backend real', async ({ page, request }) => {
  // La rotación depende del reloj real del servidor: se espera una ventana completa.
  test.setTimeout(90_000)

  // Clase de Carlos preparada por la API; fecha propia para no cruzarse con otras pruebas.
  const { token } = await (await request.post(`${apiReal}/auth/login`, { data: cuentas.coord })).json()
  const headers = { Authorization: `Bearer ${token}` }
  const instructores: { id: string; nombre: string }[] = await (await request.get(`${apiReal}/instructores`, { headers })).json()
  const creada = await request.post(`${apiReal}/clases`, {
    headers,
    data: {
      nombre: 'QR rotativo E2E',
      instructorId: instructores.find((i) => i.nombre === 'Carlos Mendoza Ríos')!.id,
      fecha: '2030-04-15',
      horaInicio: '10:00',
      horaFin: '11:00',
      lugar: 'Sala de pruebas',
    },
  })
  expect(creada.status()).toBe(201)

  await entrar(page, cuentas.instr)
  const primera = page.waitForResponse((r) => esQr(r.url()))
  await page.getByRole('row').filter({ hasText: 'QR rotativo E2E' }).getByRole('link', { name: 'Mostrar QR' }).click()
  const primerQr = await (await primera).json()
  expect(primerQr.duracionSegundos).toBe(30)

  // El QR es el svg con título; la sección también contiene íconos.
  const codigo = page.getByRole('region', { name: 'Código QR de asistencia' }).locator('svg', { has: page.locator('title') })
  await expect(codigo).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Tiempo restante del código' })).toBeVisible()
  const dibujoInicial = await codigo.innerHTML()

  // Al vencer, la pantalla pide un token nuevo y redibuja el QR.
  const segunda = await page.waitForResponse((r) => esQr(r.url()), { timeout: 40_000 })
  const segundoQr = await segunda.json()
  expect(segundoQr.token).not.toBe(primerQr.token)
  expect(Date.parse(segundoQr.servidorAhora)).toBeGreaterThanOrEqual(Date.parse(primerQr.expiraEn))
  await expect.poll(() => codigo.innerHTML()).not.toBe(dibujoInicial)
})
