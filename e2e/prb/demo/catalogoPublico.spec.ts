import { expect, test } from '../../ayud/prueba'
import { completarAcceso } from '../../ayud/sesion'
import { cuentas } from '../../ayud/datos'
import { flujoInscripcionPublica } from '../../ayud/catalogoInscripcion'
import { flujoConstanciasPublicas } from '../../ayud/catalogoConstancias'

test('HU22-P4: encabezado anónimo permite consultar constancias con teclado y en móvil',async({page})=>{
  await flujoConstanciasPublicas(page)
})

test('HU22-P3: visitante elige e inicia inscripción gratuita o reserva con costo en demo',async({page})=>{
  test.setTimeout(90000)
  await flujoInscripcionPublica(page,cuentas.coord,false)
})

test('HU22-P1: login conserva selección tras error y recarga sin inscribir automáticamente',async({page})=>{
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Catálogo de cursos',exact:true})).toBeVisible()
  const curso=await page.evaluate(async()=>{
    const pagina=await(await fetch('/api/publico/cursos')).json()
    return pagina.items.find((item:{cuposDisponibles:number})=>item.cuposDisponibles>0) as {id:string;titulo:string}
  })
  const inscripciones:string[]=[]
  page.on('request',solicitud=>{if(solicitud.method()==='POST'&&solicitud.url().includes('/inscribirme')) inscripciones.push(solicitud.url())})
  await page.goto(`/login?curso=${curso.id}`)
  await completarAcceso(page,{...cuentas.part,password:'clave-incorrecta'})
  await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos')
  await page.reload()
  await completarAcceso(page,cuentas.part)
  await expect(page).toHaveURL(`/cursos/${curso.id}`)
  await expect(page.getByRole('heading',{name:curso.titulo,exact:true})).toBeVisible()
  expect(inscripciones).toEqual([])
  await page.goto('/')
  const tarjeta=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:curso.titulo,exact:true})})
  const accion=tarjeta.getByRole('link',{name:`Inscribirme en ${curso.titulo}`,exact:true})
  await expect(accion).toHaveAttribute('href',`/cursos/${curso.id}`)
  await accion.click()
  await expect(page).toHaveURL(`/cursos/${curso.id}`)
  expect(inscripciones).toEqual([])
})

test('HU22-P5: conserva QR y maneja curso inexistente sin bucles ni redirección externa',async({page})=>{
  const qr='/asistencia/marcar?token=prueba-hu22-sin-validez'
  await page.goto(qr)
  await expect(page).toHaveURL('/login')
  await completarAcceso(page,cuentas.part)
  await expect(page).toHaveURL(qr)
  await page.goto('/login?curso=99999999999999')
  await expect(page).toHaveURL('/cursos/99999999999999')
  await expect(page.getByRole('alert')).toContainText('El curso no existe')
  await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('link',{name:'Catálogo',exact:true}).click()
  await expect(page).toHaveURL('/catalogo')
  await page.goto('/login?curso=https%3A%2F%2Fexterno.example')
  await expect(page).toHaveURL(cuentas.part.inicio)
})

test('RF-07: explorar cursos sin sesión desde 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Catálogo de cursos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText(/Mostrando|No hay cursos/)
  await page.getByRole('searchbox').fill('curso-inexistente-publico')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('No hay cursos que coincidan')
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.getByRole('status')).toContainText('Mostrando')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
})
