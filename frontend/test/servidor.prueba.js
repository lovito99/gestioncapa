import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { crearServidorFrontend } from '../servidor.js'

async function escuchar(servidor, contexto) {
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve))
  contexto.after(() => new Promise((resolve, reject) => {
    servidor.close((error) => error ? reject(error) : resolve())
    servidor.closeIdleConnections()
  }))
  return `http://127.0.0.1:${servidor.address().port}`
}

async function prepararFrontend(contexto, backendUrl) {
  const carpetaDist = await mkdtemp(path.join(tmpdir(), 'gestioncapa-servidor-'))
  contexto.after(() => rm(carpetaDist, { recursive: true, force: true }))
  await writeFile(path.join(carpetaDist, 'index.html'), '<html>GestionCapa</html>')
  return escuchar(createServer(crearServidorFrontend({ carpetaDist, backendUrl })), contexto)
}

test('reenvía POST, cuerpo, autorización y query al backend sin perder la ruta /api', async (contexto) => {
  const backendUrl = await escuchar(createServer(async (request, response) => {
    let cuerpo = ''
    for await (const parte of request) cuerpo += parte
    response.writeHead(201, { 'Content-Type': 'application/json', 'X-Prueba': 'backend' })
    response.end(JSON.stringify({
      metodo: request.method,
      ruta: request.url,
      autorizacion: request.headers.authorization,
      tipo: request.headers['content-type'],
      cuerpo: JSON.parse(cuerpo),
    }))
  }), contexto)
  const frontendUrl = await prepararFrontend(contexto, backendUrl)
  const respuesta = await fetch(`${frontendUrl}/api/auth/login?origen=web`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer prueba' },
    body: JSON.stringify({ email: 'usuario@example.com', password: 'prueba' }),
  })
  assert.equal(respuesta.status, 201)
  assert.equal(respuesta.headers.get('x-prueba'), 'backend')
  assert.deepEqual(await respuesta.json(), {
    metodo: 'POST',
    ruta: '/api/auth/login?origen=web',
    autorizacion: 'Bearer prueba',
    tipo: 'application/json',
    cuerpo: { email: 'usuario@example.com', password: 'prueba' },
  })
})

test('conserva errores de API y sirve rutas de React por separado', async (contexto) => {
  const backendUrl = await escuchar(createServer((request, response) => {
    response.writeHead(404, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ code: 'RUTA_NO_EXISTE', message: 'La ruta solicitada no existe.' }))
  }), contexto)
  const frontendUrl = await prepararFrontend(contexto, backendUrl)
  const api = await fetch(`${frontendUrl}/api/no-existe`)
  assert.equal(api.status, 404)
  assert.equal((await api.json()).code, 'RUTA_NO_EXISTE')
  const pagina = await fetch(`${frontendUrl}/admin/clases`)
  assert.equal(pagina.status, 200)
  assert.equal(await pagina.text(), '<html>GestionCapa</html>')
})

test('devuelve un error JSON en español si el backend no está disponible', async (contexto) => {
  const backend = createServer()
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve))
  const backendUrl = `http://127.0.0.1:${backend.address().port}`
  await new Promise((resolve) => backend.close(resolve))
  const frontendUrl = await prepararFrontend(contexto, backendUrl)
  const respuesta = await fetch(`${frontendUrl}/api/health`)
  assert.equal(respuesta.status, 502)
  assert.deepEqual(await respuesta.json(), {
    code: 'BACKEND_NO_DISPONIBLE',
    message: 'No pudimos conectar con el backend. Verifica que esté iniciado e intenta de nuevo.',
  })
})

// ---------- HU-51 · HTML inicial con Open Graph para el enlace compartido ----------

const indiceReact = '<!doctype html><html lang="es"><head><meta charset="UTF-8" /><title>GestionCapa</title></head><body><div id="root"></div></body></html>'

async function frontendConBackend(contexto, atender) {
  const pedidas = []
  const backendUrl = await escuchar(createServer((request, response) => {
    pedidas.push(request.url)
    atender(request, response)
  }), contexto)
  const carpetaDist = await mkdtemp(path.join(tmpdir(), 'gestioncapa-og-'))
  contexto.after(() => rm(carpetaDist, { recursive: true, force: true }))
  await writeFile(path.join(carpetaDist, 'index.html'), indiceReact)
  return { url: await escuchar(createServer(crearServidorFrontend({ carpetaDist, backendUrl })), contexto), pedidas }
}

const json = (response, estado, cuerpo) => {
  response.writeHead(estado, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(cuerpo))
}
const enlace = (imagen) => ({
  url: 'https://catalogo.example.org/c/42', enlaceCorto: 'catalogo.example.org/c/42',
  vistaPrevia: { titulo: 'Didáctica "activa" <aula> & evaluación', descripcion: 'Estrategias para el aula.', categoria: 'Tecnología', imagen },
})
const meta = (html, propiedad) => html.match(new RegExp(`<meta property="${propiedad}" content="([^"]*)"`))?.[1]

test('HU-51: /c/:id y /capacitaciones/:id entregan Open Graph con la portada vigente, escapado y sin JavaScript', async (contexto) => {
  const imagen = { url: 'https://catalogo.example.org/api/publico/cursos/42/portada/' + 'a'.repeat(64) + '/grande', ancho: 1280, alto: 720, tipo: 'image/jpeg' }
  const { url, pedidas } = await frontendConBackend(contexto, (request, response) => json(response, 200, enlace(imagen)))
  for (const ruta of ['/c/42', '/capacitaciones/42/']) {
    const respuesta = await fetch(url + ruta)
    assert.equal(respuesta.status, 200, ruta)
    assert.match(respuesta.headers.get('content-type'), /^text\/html/)
    assert.equal(respuesta.headers.get('x-content-type-options'), 'nosniff')
    const html = await respuesta.text()
    assert.match(html, /<title>Didáctica &quot;activa&quot; &lt;aula&gt; &amp; evaluación<\/title>/)
    assert.doesNotMatch(html, /<aula>/)
    assert.equal(meta(html, 'og:type'), 'website')
    assert.equal(meta(html, 'og:title'), 'Didáctica &quot;activa&quot; &lt;aula&gt; &amp; evaluación')
    assert.equal(meta(html, 'og:url'), 'https://catalogo.example.org/c/42')
    assert.equal(meta(html, 'og:description'), 'Estrategias para el aula.')
    assert.equal(meta(html, 'og:image'), imagen.url)
    assert.equal(meta(html, 'og:image:type'), 'image/jpeg')
    assert.equal(meta(html, 'og:image:width'), '1280')
    assert.equal(meta(html, 'og:image:height'), '720')
    assert.equal(meta(html, 'og:image:alt'), 'Didáctica &quot;activa&quot; &lt;aula&gt; &amp; evaluación')
    assert.match(html, /<div id="root"><\/div>/)
  }
  assert.deepEqual(pedidas, ['/api/publico/cursos/42/compartir', '/api/publico/cursos/42/compartir'])
})

test('HU-51: sin portada anuncia la ilustración raster de su categoría desde el origen público', async (contexto) => {
  const { url } = await frontendConBackend(contexto, (request, response) => json(response, 200, enlace(null)))
  const html = await (await fetch(url + '/c/42')).text()
  assert.equal(meta(html, 'og:image'), 'https://catalogo.example.org/portadas/azul.jpg')
  assert.equal(meta(html, 'og:image:type'), 'image/jpeg')
})

test('HU-51: curso no visible, backend caído, respuesta inválida u origen sin configurar no publican metadatos', async (contexto) => {
  const casos = [
    [(request, response) => json(response, 404, { code: 'CURSO_NO_EXISTE', message: 'El curso no existe.' }), 404],
    [(request, response) => json(response, 503, { code: 'ORIGEN_NO_CONFIGURADO', message: 'Sin origen.' }), 503],
    [(request, response) => json(response, 500, { code: 'ERROR' }), 502],
    [(request, response) => json(response, 200, { ...enlace(null), url: 'javascript:alert(1)' }), 502],
    [(request, response) => json(response, 200, { ...enlace({ url: 'http://otro.example/x.jpg', ancho: 1280, alto: 720, tipo: 'image/jpeg' }) }), 502],
    [(request, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end('{') }, 502],
  ]
  for (const [atender, estado] of casos) {
    const { url } = await frontendConBackend(contexto, atender)
    const respuesta = await fetch(url + '/c/42')
    assert.equal(respuesta.status, estado)
    const html = await respuesta.text()
    assert.equal(html, indiceReact)
  }
  const { url, pedidas } = await frontendConBackend(contexto, (request, response) => json(response, 200, enlace(null)))
  for (const ruta of ['/c/abc', '/c/042', '/c/1000000000000000', '/c/%E0%A4%A']) {
    const respuesta = await fetch(url + ruta)
    assert.equal(respuesta.status, 404, ruta)
    assert.equal(await respuesta.text(), indiceReact)
  }
  assert.deepEqual(pedidas, [])
  assert.equal(await (await fetch(url + '/catalogo')).text(), indiceReact)
})

test('HU-51: cada categoría tiene su ilustración raster de 1280 × 720 en public/portadas', async () => {
  const { fondosPortada, rutaPortadaSocial } = await import('../src/lib/portadaCategoria.ts')
  const { readFile } = await import('node:fs/promises')
  const medidas = (archivo) => {
    for (let i = 2; i < archivo.length;) {
      const marcador = archivo[i + 1]
      if (marcador >= 0xc0 && marcador <= 0xc2) return [archivo.readUInt16BE(i + 7), archivo.readUInt16BE(i + 5)]
      i += 2 + archivo.readUInt16BE(i + 2)
    }
  }
  for (const fondo of fondosPortada) {
    const archivo = await readFile(new URL(`../public/portadas/${fondo}.jpg`, import.meta.url))
    assert.deepEqual(medidas(archivo), [1280, 720], fondo)
  }
  assert.equal(rutaPortadaSocial('Tecnología educativa'), '/portadas/azul.jpg')
  assert.equal(rutaPortadaSocial('Categoría histórica'), rutaPortadaSocial('General'))
  assert.equal(rutaPortadaSocial('constructor'), rutaPortadaSocial('General'))
})
