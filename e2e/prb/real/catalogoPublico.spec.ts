import { expect, test } from '../../ayud/prueba'
import { completarAcceso,entrar } from '../../ayud/sesion'
import { cuentas,cuentaReal } from '../../ayud/datos'
import { flujoInscripcionPublica } from '../../ayud/catalogoInscripcion'
import { flujoConstanciasPublicas } from '../../ayud/catalogoConstancias'

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
  await page.reload()
  await expect(page).toHaveURL(`/login?curso=${curso.id}`)
  await page.reload()
  await completarAcceso(page,cuentas.part)
  await expect(page).toHaveURL(`/cursos/${curso.id}`)
  for(const ruta of ['/login','/registro']) {
    await page.evaluate(token=>sessionStorage.setItem('gc.token',token),falso)
    await page.goto(`${ruta}?curso=${curso.id}`)
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
  await expect(page.getByRole('heading', { name: 'Catálogo de cursos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: datos.items[0].titulo })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  expect((await request.get('/api/catalogo/cursos/pagina')).status()).toBe(401)
  expect((await request.get(`/api/cursos/${datos.items[0].id}`)).status()).toBe(401)
})
