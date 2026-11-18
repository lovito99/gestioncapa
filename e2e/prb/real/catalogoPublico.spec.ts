import { expect, test } from '../../ayud/prueba'
import { completarAcceso,entrar } from '../../ayud/sesion'
import { cuentas,cuentaReal } from '../../ayud/datos'
import { flujoInscripcionPublica } from '../../ayud/catalogoInscripcion'
import { flujoConstanciasPublicas } from '../../ayud/catalogoConstancias'

test('HU40-01: el administrador comparte un enlace y el profesor llega al curso desde otra pestaña', async ({ page, context, request }) => {
  const respuesta = await request.get('/api/publico/cursos', { params: { buscar: 'Demo · Didáctica y evaluación' } })
  expect(respuesta.ok()).toBe(true)
  const { items } = await respuesta.json() as { items: { id: string; titulo: string; cuposDisponibles: number }[] }
  const curso = items.find(item => item.cuposDisponibles > 0)!
  expect(curso).toBeDefined()
  const enlace = new URL(`/c/${curso.id}`, respuesta.url())

  await entrar(page, cuentaReal)
  await page.goto(`/cursos/${curso.id}`)
  await expect(page.getByRole('heading', { name: curso.titulo, exact: true })).toBeVisible()
  const compartir = page.getByRole('button', { name: `Compartir ${curso.titulo}`, exact: true })
  await expect(compartir).toBeVisible()
  await compartir.click()

  await context.route('https://wa.me/**', ruta => ruta.fulfill({ body: 'WhatsApp de prueba', contentType: 'text/plain' }))
  const popupEsperado = page.waitForEvent('popup')
  await page.getByRole('dialog').getByRole('link', { name: /^WhatsApp/ }).click()
  const popup = await popupEsperado
  await popup.waitForURL('https://wa.me/**')
  expect(new URL(popup.url()).searchParams.get('text')).toBe(`${curso.titulo}\n${enlace.href}`)
  await popup.close()

  const visitante = await context.newPage()
  const inscripciones: string[] = []
  const errores: string[] = []
  visitante.on('pageerror', error => errores.push(error.message))
  visitante.on('request', solicitud => {
    if (solicitud.method() === 'POST' && solicitud.url().endsWith('/inscribirme')) inscripciones.push(solicitud.url())
  })
  await visitante.goto(enlace.href)
  await expect(visitante.getByRole('heading', { name: curso.titulo, exact: true })).toBeVisible()
  await visitante.getByRole('button', { name: `Compartir ${curso.titulo}`, exact: true }).click()
  await expect(visitante.getByRole('textbox', { name: 'Enlace corto' })).toHaveValue(enlace.href)
  await visitante.getByRole('textbox', { name: 'Enlace corto' }).press('Escape')
  await visitante.getByRole('button', { name: 'Inscribirme', exact: true }).click()
  await expect(visitante).toHaveURL(`/login?curso=${curso.id}`)
  await completarAcceso(visitante, cuentas.part)
  await expect(visitante).toHaveURL(`/cursos/${curso.id}`)
  await expect(visitante.getByRole('heading', { name: curso.titulo, exact: true })).toBeVisible()
  expect(inscripciones).toEqual([])
  expect(errores).toEqual([])
})

test('HU22-P4: consultar constancias funciona sin sesión con el verificador real',async({page})=>{
  await flujoConstanciasPublicas(page)
})

test('HU22-P3: visitante retoma curso y confirma inscripción o reserva con API y BD reales',async({page})=>{
  test.setTimeout(90000)
  await flujoInscripcionPublica(page,cuentaReal,true)
})

test('HU22-P1: un401 conserva el curso tras recargar y volver a iniciar sesión',async({page,request})=>{
  const datos=await(await request.get('/api/publico/cursos')).json()
  const curso=datos.items.find((item:{cuposDisponibles:number})=>item.cuposDisponibles>0) as {id:string;titulo:string}
  await entrar(page,cuentas.part)
  await page.goto(`/cursos/${curso.id}`)
  await expect(page.getByRole('heading',{name:curso.titulo,exact:true})).toBeVisible()
  const falso=['{"alg":"HS256","typ":"JWT"}',JSON.stringify({sub:'1',exp:Date.now()/1000+3600})].map(parte=>Buffer.from(parte).toString('base64url')).concat('firma-invalida').join('.')
  await page.evaluate(token=>sessionStorage.setItem('gc.token',token),falso)
  await page.reload({ waitUntil: 'commit' })
  await expect(page).toHaveURL(`/login?curso=${curso.id}`)
  await page.reload()
  await completarAcceso(page,cuentas.part)
  await expect(page).toHaveURL(`/cursos/${curso.id}`)
  for(const ruta of ['/login','/registro']) {
    await expect(page.getByRole('heading',{name:curso.titulo,exact:true})).toBeVisible()
    await page.evaluate(token=>sessionStorage.setItem('gc.token',token),falso)
    // La verificación de sesión puede redirigir antes del evento load.
    await page.goto(`${ruta}?curso=${curso.id}`, { waitUntil: 'commit' })
    await expect(page.getByRole('alert')).toContainText('Tu sesión expiró')
    await expect(page).toHaveURL(`/login?curso=${curso.id}`)
    await completarAcceso(page,cuentas.part)
    await expect(page).toHaveURL(`/cursos/${curso.id}`)
  }
})

test('RF-07: catálogo anónimo conectado al servidor real', async ({ page, request }) => {
  const respuesta = await request.get('/api/publico/cursos?tamanoPagina=50')
  expect(respuesta.status()).toBe(200)
  const datos = await respuesta.json()
  expect(datos.items.length).toBeGreaterThan(0)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Cursos vigentes del CPPP' })).toBeVisible()
  await expect(page.getByRole('heading', { name: datos.items[0].titulo })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  expect((await request.get('/api/catalogo/cursos/pagina')).status()).toBe(401)
  expect((await request.get(`/api/cursos/${datos.items[0].id}`)).status()).toBe(401)
})
