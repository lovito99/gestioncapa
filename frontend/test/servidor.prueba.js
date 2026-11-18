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
