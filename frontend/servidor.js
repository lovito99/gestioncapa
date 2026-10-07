import express from 'express'
import { request as solicitarHttp } from 'node:http'
import { request as solicitarHttps } from 'node:https'
import path from 'node:path'

export function crearServidorFrontend({ carpetaDist, backendUrl }) {
  const app = express()
  const destino = new URL(backendUrl)
  if (!['http:', 'https:'].includes(destino.protocol)) {
    throw new Error('La URL del backend debe comenzar con http:// o https://.')
  }

  // Conserva /api, el cuerpo y las cabeceras antes de servir las páginas de React.
  app.use('/api', (request, response) => {
    const solicitar = destino.protocol === 'https:' ? solicitarHttps : solicitarHttp
    const solicitud = solicitar(new URL(request.originalUrl, destino), {
      method: request.method,
      headers: { ...request.headers, host: destino.host },
    })

    function fallarConexion() {
      if (response.destroyed) return
      if (response.headersSent) {
        response.destroy()
        return
      }
      response.status(502).json({
        code: 'BACKEND_NO_DISPONIBLE',
        message: 'No pudimos conectar con el backend. Verifica que esté iniciado e intenta de nuevo.',
      })
    }

    solicitud.on('response', (respuestaBackend) => {
      response.writeHead(respuestaBackend.statusCode ?? 502, respuestaBackend.headers)
      respuestaBackend.on('error', fallarConexion)
      respuestaBackend.pipe(response)
    })
    solicitud.on('error', fallarConexion)
    solicitud.setTimeout(15000, () => solicitud.destroy(new Error('El backend no respondió a tiempo.')))
    request.on('aborted', () => solicitud.destroy())
    response.on('close', () => {
      if (!response.writableFinished) solicitud.destroy()
    })
    request.pipe(solicitud)
  })

  app.use(express.static(carpetaDist))
  app.get(/.*/, (request, response) => {
    response.sendFile(path.join(carpetaDist, 'index.html'))
  })

  return app
}
