import { expect, type Page } from '@playwright/test'

export async function flujoRegistro(page: Page,curso?:{id:string;titulo:string}) {
  const seleccion=curso?`?curso=${curso.id}`:''
  const inscripciones:string[]=[]
  const observar=(solicitud:import('@playwright/test').Request)=>{if(solicitud.method()==='POST'&&solicitud.url().includes('/inscribirme')) inscripciones.push(solicitud.url())}
  page.on('request',observar)
  await page.goto(`/login${seleccion}`)
  await page.getByRole('link', { name: 'Crear cuenta', exact: true }).click()
  await expect(page).toHaveURL(`/registro${seleccion}`)
  if(curso) {
    await page.getByRole('banner').getByRole('link',{name:'Iniciar sesión',exact:true}).click()
    await expect(page).toHaveURL(`/login${seleccion}`)
    await page.getByRole('link',{name:'Crear cuenta',exact:true}).click()
    await page.getByRole('link',{name:'Volver a iniciar sesión',exact:true}).click()
    await expect(page).toHaveURL(`/login${seleccion}`)
    await page.getByRole('link',{name:'Crear cuenta',exact:true}).click()
    await page.reload()
  }
  await expect(page.getByRole('textbox', { name: 'DNI', exact: true })).toHaveAttribute('inputmode', 'numeric')
  await expect(page.getByRole('textbox', { name: 'Celular', exact: true })).toHaveAttribute('inputmode', 'numeric')
  const marca = Date.now().toString()
  const dni = marca.slice(-8)
  const email = `registro-${marca}@prueba.local`
  const llenar = async (correo: string) => {
    await page.getByRole('textbox', { name: 'DNI', exact: true }).fill(dni)
    await page.getByRole('textbox', { name: 'Nombres', exact: true }).fill('Docente')
    await page.getByRole('textbox', { name: 'Apellidos', exact: true }).fill('De prueba')
    await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(correo)
    await page.getByRole('textbox', { name: 'Celular', exact: true }).fill('987654321')
    await page.getByLabel(/^Contraseña/).fill('abcdefgh')
    await page.getByRole('checkbox').check()
  }
  await llenar('invalido')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByText('Ingresa un correo válido.', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Nombres', exact: true })).toHaveValue('Docente')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(email)
  const respuesta = page.waitForResponse(r => r.url().endsWith('/api/auth/registro') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  const alta=await respuesta
  expect(alta.status()).toBe(201)
  expect((await alta.json()).usuario.rol).toBe('AGREMIADO')
  await expect(page).toHaveURL(curso?`/cursos/${curso.id}`:'/catalogo')
  await expect(page.getByRole('heading', { name: curso?.titulo??'Catálogo de cursos', exact: true })).toBeVisible()
  expect(inscripciones).toEqual([])
  page.off('request',observar)
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await page.getByRole('link', { name: 'Crear cuenta', exact: true }).click()
  await llenar(email)
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByText('Ya tienes una cuenta', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Nombres', exact: true })).toHaveValue('Docente')
  await page.getByRole('link', { name: 'Recuperar mi contraseña', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Recuperar mi contraseña', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Solicitar ayuda al CPPP' })).toHaveAttribute('href', /^https:\/\/wa.me\//)
}
