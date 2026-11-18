import { crc32, deflateSync } from 'node:zlib'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { elegirCobro } from './cobroInscripcion'
import { cuentas } from './datos'
import { completarAcceso, entrar } from './sesion'

export function pngPortada(ancho: number, alto: number, color = [39, 133, 156]) {
  function bloque(tipo: string, datos: Buffer) {
    const cuerpo = Buffer.concat([Buffer.from(tipo), datos])
    const cabecera = Buffer.alloc(4)
    const suma = Buffer.alloc(4)
    cabecera.writeUInt32BE(datos.length)
    suma.writeUInt32BE(crc32(cuerpo))
    return Buffer.concat([cabecera, cuerpo, suma])
  }
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(ancho)
  cabecera.writeUInt32BE(alto, 4)
  cabecera[8] = 8
  cabecera[9] = 2
  const linea = Buffer.alloc(ancho * 3 + 1)
  linea.fill(Buffer.from(color), 1)
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    bloque('IHDR', cabecera),
    bloque('IDAT', deflateSync(Buffer.concat(Array.from({ length: alto }, () => linea)))),
    bloque('IEND', Buffer.alloc(0)),
  ])
}

export async function elegirPortada(page: Page, ancho = 1600, alto = 900, color?: number[]) {
  await page.getByLabel('Imagen de portada').setInputFiles({
    name: 'portada.png', mimeType: 'image/png', buffer: pngPortada(ancho, alto, color),
  })
}

export async function completarBorrador(page: Page, titulo: string) {
  await page.goto('/admin/cursos/nuevo')
  await page.getByRole('textbox', { name: 'Nombre del curso' }).fill(titulo)
  await page.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Prácticas para el aula.')
  await page.getByLabel('Categoría').selectOption('Educación')
  await page.getByLabel('Instructor asignado').selectOption({ label: 'Carlos Mendoza Ríos' })
  await page.getByLabel('Fecha de inicio').fill('2090-03-02')
  await page.getByLabel('Fecha de fin').fill('2090-03-27')
  await page.getByLabel('Horas lectivas').fill('24')
  await elegirCobro(page, 'GRATUITO')
  await page.getByLabel('Cupos').fill('30')
  await page.getByRole('button', { name: '+ Agregar módulo', exact: true }).click()
  await page.getByRole('textbox', { name: 'Nombre del módulo 1' }).fill('Introducción')
  await page.getByRole('button', { name: 'Listo', exact: true }).click()
}

type CursoCreado = { id: string; titulo: string }

/** Publica tres cursos: uno con portada y dos sin ella, de categorías con ilustraciones distintas. */
export async function publicarCursosConPortada(page: Page, admin: Parameters<typeof entrar>[1]) {
  await entrar(page, admin)
  const clave = `HU51 tarjeta ${Date.now()}`
  const portada = pngPortada(1600, 900).toString('base64')
  const cursos = await page.evaluate(async ({ clave, portada }) => {
    const token = sessionStorage.getItem('gc.token')!
    const llamar = async (ruta: string, data?: object) => {
      const respuesta = await fetch(`/api${ruta}`, { method: data ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) })
      const cuerpo = await respuesta.json()
      if (!respuesta.ok) throw new Error(`${respuesta.status}: ${JSON.stringify(cuerpo)}`)
      return cuerpo
    }
    const instructores = await llamar('/cursos/instructores') as { id: string; nombre: string }[]
    const base = { descripcion: 'Prácticas para reconocer el curso.', instructorId: instructores.find(i => i.nombre === 'Carlos Mendoza Ríos')!.id,
      fechaInicio: '2031-03-02', fechaFin: '2031-03-27', horasLectivas: 16, modalidad: 'VIRTUAL', costo: 0, cupos: 20,
      tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Módulo de ejemplo' }] }
    const crear = async (titulo: string, categoria: string, extra: object = {}) => {
      const curso = await llamar('/cursos', { ...base, titulo, categoria, ...extra })
      await llamar(`/cursos/${curso.id}/publicar`, {})
      return { id: curso.id as string, titulo }
    }
    return {
      cursos: {
        conImagen: await crear(`${clave} con imagen`, 'Educación', { portada: { nombre: 'portada.png', tipo: 'image/png', contenidoBase64: portada } }),
        educacion: await crear(`${clave} educación`, 'Educación'),
        tecnologia: await crear(`${clave} tecnología`, 'Tecnología'),
      },
      vencido: await crear(`${clave} vencido`, 'General', { fechaInicio: '2020-01-06', fechaFin: '2020-01-31' }),
    }
  }, { clave, portada })
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('gc.token'))).toBeNull()
  return { clave, ...cursos }
}

const tarjetaDe = (page: Page, curso: CursoCreado) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: curso.titulo, exact: true }) })

/** HU-51 · Tarjeta con portada arriba, datos debajo, respaldo por categoría y apertura del detalle. */
export async function flujoPortadaCatalogo(page: Page, real: boolean, cursos: Record<'conImagen' | 'educacion' | 'tecnologia', CursoCreado>, clave: string) {
  await completarAcceso(page, cuentas.part)
  // En demo, recargar reinicia los datos simulados: se navega desde la interfaz.
  await page.getByRole('link', { name: 'Catálogo', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Buscar curso' }).fill(clave)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  for (const curso of Object.values(cursos)) {
    await expect(tarjetaDe(page, curso).getByRole('img', { name: curso.titulo, exact: true })).toBeVisible()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  const tarjeta = tarjetaDe(page, cursos.conImagen)
  const imagen = tarjeta.getByRole('img', { name: cursos.conImagen.titulo, exact: true })
  await imagen.scrollIntoViewIfNeeded()
  const caja = (await imagen.boundingBox())!
  const debajo = (await tarjeta.getByRole('heading', { name: cursos.conImagen.titulo }).boundingBox())!
  const modalidad = (await tarjeta.getByText('Virtual en vivo', { exact: true }).boundingBox())!
  expect(Math.abs(caja.width / caja.height - 16 / 9)).toBeLessThan(0.02)
  expect(debajo.y).toBeGreaterThanOrEqual(caja.y + caja.height - 1)
  expect(modalidad.y).toBeGreaterThanOrEqual(caja.y + caja.height - 1)
  for (const dato of ['2 mar – 27 mar 2031', '16 horas lectivas', 'Gratuito']) await expect(tarjeta.getByText(dato, { exact: true }).first()).toBeVisible()
  await expect(tarjeta.getByText(/20 cupos|20 de 20/).first()).toBeVisible()
  if (real) {
    await expect.poll(() => imagen.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/portada\/[0-9a-f]{64}\/miniatura$/)
    const bytes = await imagen.evaluate(async (img: HTMLImageElement) => (await (await fetch(img.currentSrc)).arrayBuffer()).byteLength)
    expect(bytes).toBeLessThanOrEqual(90 * 1024)
  }
  const ilustraciones = await Promise.all([cursos.educacion, cursos.tecnologia].map(curso =>
    tarjetaDe(page, curso).getByRole('img', { name: curso.titulo, exact: true }).evaluate(fondo => fondo.innerHTML)))
  expect(ilustraciones[0]).not.toBe(ilustraciones[1])

  const articulo = tarjeta.locator('article')
  const estilo = () => articulo.evaluate(elemento => `${getComputedStyle(elemento).borderColor} ${getComputedStyle(elemento).backgroundColor}`)
  const reposo = await estilo()
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2)
  await expect.poll(estilo).not.toBe(reposo)

  await tarjeta.getByRole('button', { name: `Compartir ${cursos.conImagen.titulo}` }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(/\/catalogo\?/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  await tarjetaDe(page, cursos.educacion).getByRole('link', { name: cursos.educacion.titulo }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(`/cursos/${cursos.educacion.id}`)
  await page.goBack()

  await imagen.scrollIntoViewIfNeeded()
  const portada = (await imagen.boundingBox())!
  await page.mouse.move(portada.x + portada.width / 2, portada.y + portada.height / 2)
  await page.mouse.down()
  await expect.poll(estilo).not.toBe(reposo)
  await page.mouse.up()
  await expect(page).toHaveURL(`/cursos/${cursos.conImagen.id}`)
  const grande = page.getByRole('img', { name: cursos.conImagen.titulo, exact: true })
  await expect(grande).toBeVisible()
  expect((await grande.boundingBox())!.width).toBeGreaterThan(300)
  if (real) await expect.poll(() => grande.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/grande$/)

  if (!real) return
  // Si la descarga falla, la tarjeta pasa a la ilustración de su categoría.
  await page.route('**/portada/**', ruta => ruta.abort())
  await page.goto(`/catalogo?buscar=${encodeURIComponent(clave)}`)
  const respaldo = tarjetaDe(page, cursos.conImagen).getByRole('img', { name: cursos.conImagen.titulo, exact: true })
  await expect(respaldo).not.toHaveAttribute('src')
  await expect(respaldo).toBeVisible()
  await page.unroute('**/portada/**')
}
