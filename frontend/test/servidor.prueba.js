import assert from 'node:assert/strict'
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

async function prepararFrontend(contexto, backendUrl, origenPublico) {
  const carpetaDist = await mkdtemp(path.join(tmpdir(), 'gestioncapa-servidor-'))
  contexto.after(() => rm(carpetaDist, { recursive: true, force: true }))
  const indice = origenPublico ? '<html><head><title>GestionCapa</title></head><body><div id="root"></div></body></html>' : '<html>GestionCapa</html>'
  await writeFile(path.join(carpetaDist, 'index.html'), indice)
  const url = await escuchar(createServer(crearServidorFrontend({ carpetaDist, backendUrl, origenPublico })), contexto)
  return { url, carpetaDist }
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
  const { url: frontendUrl } = await prepararFrontend(contexto, backendUrl)
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
  const { url: frontendUrl } = await prepararFrontend(contexto, backendUrl)
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
  const { url: frontendUrl } = await prepararFrontend(contexto, backendUrl)
  const respuesta = await fetch(`${frontendUrl}/api/health`)
  assert.equal(respuesta.status, 502)
  assert.deepEqual(await respuesta.json(), {
    code: 'BACKEND_NO_DISPONIBLE',
    message: 'No pudimos conectar con el backend. Verifica que esté iniciado e intenta de nuevo.',
  })
})

test('HU-40: la URL corta responde con Open Graph en el HTML y una imagen pública', async (contexto) => {
  const solicitudes = []
  const backend = createServer((request, response) => {
    solicitudes.push(request.url)
    assert.equal(request.headers.authorization, undefined)
    assert.equal(request.headers.cookie, undefined)
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      id: '42', titulo: 'Didáctica "A" & B <nivel> $&', fechaInicio: '2026-11-17', fechaFin: '2026-11-20',
      costo: 25, modalidadCobro: 'CERTIFICADO',
    }))
  })
  const backendUrl = await escuchar(backend, contexto)
  const { url, carpetaDist } = await prepararFrontend(contexto, backendUrl, 'https://cursos.example')
  const respuesta = await fetch(`${url}/c/42?origen=chat`, {
    headers: { 'User-Agent': 'facebookexternalhit/1.1', 'X-Forwarded-Host': 'otro.example', Cookie: 'sesion=prueba', Authorization: 'Bearer prueba' },
  })
  assert.equal(respuesta.status, 200)
  assert.equal(respuesta.headers.get('cache-control'), 'no-store')
  assert.equal(respuesta.headers.get('x-content-type-options'), 'nosniff')
  assert.match(respuesta.headers.get('content-type'), /^text\/html/)
  const html = await respuesta.text()
  assert.match(html, /<title>Didáctica &quot;A&quot; &amp; B &lt;nivel&gt; \$&amp;<\/title>/)
  assert.match(html, /property="og:title" content="Didáctica &quot;A&quot; &amp; B &lt;nivel&gt; \$&amp;"/)
  assert.match(html, /property="og:description" content="17\/11\/2026 al 20\/11\/2026 · Curso gratuito · Constancia: S\/ 25\.00"/)
  assert.match(html, /property="og:url" content="https:\/\/cursos\.example\/c\/42"/)
  assert.match(html, /property="og:image" content="https:\/\/cursos\.example\/vista-curso\.png"/)
  assert.match(html, /<div id="root"><\/div>/)
  assert.equal(html.includes('otro.example'), false)
  assert.deepEqual(solicitudes, ['/api/publico/cursos/42'])

  await copyFile(new URL('../public/vista-curso.png', import.meta.url), path.join(carpetaDist, 'vista-curso.png'))
  const imagen = await fetch(`${url}/vista-curso.png`)
  assert.equal(imagen.status, 200)
  assert.equal(imagen.headers.get('content-type'), 'image/png')
  const png = Buffer.from(await imagen.arrayBuffer())
  assert.equal(png.readUInt32BE(16), 1200)
  assert.equal(png.readUInt32BE(20), 630)
})

test('HU-40: Open Graph muestra fechas y costos según los datos disponibles', async (contexto) => {
  const combinaciones = [
    [null, null, 'GRATUITO', 0, 'Fechas por confirmar · Gratuito'],
    ['2026-11-17', '2026-11-17', 'PREVIO', 15, '17/11/2026 · Curso: S/ 15.00'],
    ['2026-11-17', null, null, 20, 'Inicio: 17/11/2026 · S/ 20.00 · Condiciones de cobro por configurar'],
    [null, '2026-11-20', 'GRATUITO', 0, 'Fin: 20/11/2026 · Gratuito'],
  ]
  const backendUrl = await escuchar(createServer((request, response) => {
    const id = request.url.split('/').at(-1)
    const [fechaInicio, fechaFin, modalidadCobro, costo] = combinaciones[Number(id) - 1]
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ id, titulo: 'Curso de prueba', fechaInicio, fechaFin, modalidadCobro, costo }))
  }), contexto)
  const { url } = await prepararFrontend(contexto, backendUrl, 'https://cursos.example')
  for (const [indice, datos] of combinaciones.entries()) {
    const respuesta = await fetch(`${url}/c/${indice + 1}`)
    assert.equal(respuesta.status, 200)
    assert.ok((await respuesta.text()).includes(`property="og:description" content="${datos[4]}"`))
  }
})

test('HU-40: errores, ID inválidos y redirecciones del backend quedan sin Open Graph', async (contexto) => {
  const solicitudes = []
  const backendUrl = await escuchar(createServer((request, response) => {
    solicitudes.push(request.url)
    const estado = request.url.endsWith('/42') ? 404 : request.url.endsWith('/43') ? 302 : 503
    response.writeHead(estado, estado === 302 ? { Location: '/otra-ruta' } : {})
    response.end()
  }), contexto)
  const { url } = await prepararFrontend(contexto, backendUrl, 'https://cursos.example')
  for (const [id, estado] of [['01', 404], ['%2F', 404], ['42', 404], ['43', 502], ['44', 502]]) {
    const respuesta = await fetch(`${url}/c/${id}`)
    assert.equal(respuesta.status, estado)
    assert.doesNotMatch(await respuesta.text(), /property="og:/)
  }
  assert.deepEqual(solicitudes, ['/api/publico/cursos/42', '/api/publico/cursos/43', '/api/publico/cursos/44'])
})

test('HU-40: sin origen configurado la vista previa no usa el dominio de la petición', async (contexto) => {
  const backend = createServer((_request, response) => {
    response.writeHead(500)
    response.end()
  })
  const backendUrl = await escuchar(backend, contexto)
  const { url } = await prepararFrontend(contexto, backendUrl)
  const respuesta = await fetch(`${url}/c/42`, { headers: { 'X-Forwarded-Host': 'otro.example' } })
  assert.equal(respuesta.status, 503)
  assert.equal(respuesta.headers.get('cache-control'), 'no-store')
  assert.doesNotMatch(await respuesta.text(), /property="og:/)
  assert.equal((await fetch(`${url}/capacitaciones`)).status, 200)
})
