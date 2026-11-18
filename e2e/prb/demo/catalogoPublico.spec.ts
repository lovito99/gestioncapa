import { expect, test } from '../../ayud/prueba'
import { completarAcceso, entrar } from '../../ayud/sesion'
import { cuentas } from '../../ayud/datos'
import { flujoInscripcionPublica } from '../../ayud/catalogoInscripcion'
import { flujoConstanciasPublicas } from '../../ayud/catalogoConstancias'

test('HU40-03: el enlace corto muestra el curso anónimo y conserva la selección al inscribirse', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Catálogo de cursos' })).toBeVisible()
  const { disponible, lleno } = await page.evaluate(async () => {
    const respuesta = await fetch('/api/publico/cursos')
    const { items } = await respuesta.json() as { items: { id: string; titulo: string; cuposDisponibles: number }[] }
    return { disponible: items.find(curso => curso.cuposDisponibles > 0)!, lleno: items.find(curso => curso.cuposDisponibles === 0)! }
  })
  const inscripciones: string[] = []
  page.on('request', solicitud => {
    if (solicitud.method() === 'POST' && solicitud.url().endsWith('/inscribirme')) inscripciones.push(solicitud.url())
  })

  await page.goto(`/c/${lleno.id}`)
  await expect(page.getByRole('heading', { name: lleno.titulo })).toBeVisible()
  await expect(page.getByText('Sin cupos', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Inscribirme', exact: true })).toHaveCount(0)

  await page.goto('/c/1')
  await expect(page.getByRole('heading', { name: /Seguridad y primeros auxilios/ })).toBeVisible()
  await expect(page.getByText('Curso finalizado', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Inscribirme', exact: true })).toHaveCount(0)

  await page.goto('/c/999999999999999')
  await expect(page.getByRole('heading', { name: 'Curso no disponible' })).toBeVisible()

  await page.goto(`/c/${disponible.id}`)
  await page.reload()
  await expect(page.getByRole('heading', { name: disponible.titulo })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Inscribirme', exact: true }).click()
  await expect(page).toHaveURL(`/login?curso=${disponible.id}`)
  await expect(page.getByRole('link', { name: 'Crear cuenta', exact: true }).first())
    .toHaveAttribute('href', `/registro?curso=${disponible.id}`)
  await completarAcceso(page, cuentas.part)
  await expect(page).toHaveURL(`/cursos/${disponible.id}`)
  expect(inscripciones).toEqual([])
})

test('HU40-04: compartir desde la tarjeta funciona con teclado y permite la copia manual', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined })
  })
  await page.goto('/')
  const titulo = 'Demo · Didáctica y evaluación'
  const tarjeta = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: titulo, exact: true }) })
  const inscripcion = tarjeta.getByRole('link', { name: `Inscribirme en ${titulo}` })
  const id = new URL(hrefRequerido(await inscripcion.getAttribute('href')), page.url()).searchParams.get('curso')
  const enlace = new URL(`/c/${id}`, page.url()).href
  const compartir = tarjeta.getByRole('button', { name: 'Compartir', exact: true })
  await compartir.press('Enter')
  await expect(compartir).toHaveAttribute('aria-expanded', 'true')
  const whatsapp = new URL(hrefRequerido(await tarjeta.getByRole('link', { name: 'Compartir por WhatsApp' }).getAttribute('href')))
  expect(whatsapp.origin).toBe('https://wa.me')
  expect(whatsapp.searchParams.get('text')).toBe(`${titulo}\n${enlace}`)
  await tarjeta.getByRole('button', { name: 'Copiar enlace' }).click()
  const campo = tarjeta.getByRole('textbox', { name: 'Enlace del curso' })
  await expect(campo).toHaveValue(enlace)
  await expect(campo).toBeFocused()
  await expect(tarjeta.getByRole('status')).toHaveText('Selecciona y copia el enlace.')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await campo.press('Escape')
  await expect(compartir).toHaveAttribute('aria-expanded', 'false')
  await expect(compartir).toBeFocused()
  await expect(inscripcion).toBeVisible()
})

test('HU40-04: un administrador puede compartir en catálogo y Mis cursos y el borrador queda excluido', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (texto: string) => { document.body.dataset.enlaceCopiado = texto } },
    })
  })
  await entrar(page, cuentas.coord)
  const titulo = 'Demo · Didáctica y evaluación'
  const publicado = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: titulo, exact: true }) })
  const borrador = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Demo · Herramientas digitales para docentes', exact: true }) })
  await page.goto('/catalogo')
  await expect(publicado.getByRole('button', { name: 'Compartir', exact: true })).toBeVisible()
  await page.goto('/cursos')
  await expect(borrador).toBeVisible()
  await expect(borrador.getByRole('button', { name: 'Compartir', exact: true })).toHaveCount(0)
  await publicado.getByRole('button', { name: 'Compartir', exact: true }).click()
  const destino = await publicado.getByRole('link', { name: titulo, exact: true }).getAttribute('href')
  const detalle = new URL(hrefRequerido(destino), page.url())
  const enlace = new URL(`/c/${detalle.pathname.split('/').at(-1)}`, page.url()).href
  await publicado.getByRole('button', { name: 'Copiar enlace' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-enlace-copiado', enlace)
  await expect(publicado.getByRole('status')).toHaveText('Enlace copiado.')
})

function hrefRequerido(href: string | null) {
  expect(href).not.toBeNull()
  return href!
}

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
