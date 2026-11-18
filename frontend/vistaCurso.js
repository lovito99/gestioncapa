import { readFile } from 'node:fs/promises'
import { rutaPortadaSocial } from './src/lib/portadaCategoria.ts'

// HU-40/HU-51 · HTML inicial del enlace compartido: WhatsApp no ejecuta JavaScript,
// así que los metadatos Open Graph se agregan al índice de React en el servidor.

const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapar = (valor) => valor.replace(/[&<>"']/g, (caracter) => entidades[caracter])
const etiqueta = (propiedad, valor) => `<meta property="${propiedad}" content="${escapar(String(valor))}" />`
const loopback = ['localhost', '127.0.0.1', '[::1]']

class RespuestaInvalida extends Error {}

function idDeRuta(ruta) {
  const coincidencia = /^\/(?:c|capacitaciones)\/([^/]+)\/?$/.exec(ruta)
  try {
    const id = coincidencia && decodeURIComponent(coincidencia[1])
    return id && /^[1-9]\d{0,14}$/.test(id) ? id : null
  } catch {
    return null
  }
}

/** Solo se aceptan URLs HTTPS (o loopback local) del mismo origen público que informa el backend. */
function urlPublica(valor, origen) {
  const url = typeof valor === 'string' ? URL.parse(valor) : null
  const valida = url && !url.username && !url.password &&
    (url.protocol === 'https:' || (url.protocol === 'http:' && loopback.includes(url.hostname)))
  if (!valida || (origen && url.origin !== origen)) throw new RespuestaInvalida()
  return url
}

function vistaPreviaDe(datos, id) {
  const enlace = urlPublica(datos?.url)
  const { titulo, descripcion, categoria, imagen } = datos?.vistaPrevia ?? {}
  if (enlace.pathname !== `/c/${id}` || typeof titulo !== 'string' || !titulo.trim() ||
      typeof descripcion !== 'string' || typeof categoria !== 'string') throw new RespuestaInvalida()
  const portada = imagen === null
    ? { url: new URL(rutaPortadaSocial(categoria), enlace.origin).href, ancho: 1280, alto: 720, tipo: 'image/jpeg' }
    : { url: urlPublica(imagen?.url, enlace.origin).href, ancho: imagen.ancho, alto: imagen.alto, tipo: imagen.tipo }
  if (!Number.isInteger(portada.ancho) || !Number.isInteger(portada.alto) || !['image/jpeg', 'image/webp'].includes(portada.tipo)) {
    throw new RespuestaInvalida()
  }
  const resumen = descripcion.replace(/\s+/g, ' ').trim()
  return {
    titulo: titulo.trim(),
    url: enlace.href,
    descripcion: resumen.length > 200 ? `${resumen.slice(0, 199)}…` : resumen || 'Capacitación del CPPP Región Cusco',
    portada,
  }
}

function conMetadatos(indice, vista) {
  const etiquetas = [
    etiqueta('og:type', 'website'),
    etiqueta('og:title', vista.titulo),
    etiqueta('og:url', vista.url),
    etiqueta('og:description', vista.descripcion),
    etiqueta('og:image', vista.portada.url),
    etiqueta('og:image:type', vista.portada.tipo),
    etiqueta('og:image:width', vista.portada.ancho),
    etiqueta('og:image:height', vista.portada.alto),
    etiqueta('og:image:alt', vista.titulo),
    '<meta name="twitter:card" content="summary_large_image" />',
  ]
  return indice
    .replace(/<title>[^<]*<\/title>/i, () => `<title>${escapar(vista.titulo)}</title>`)
    .replace(/<\/head>/i, () => `${etiquetas.join('\n')}\n</head>`)
}

/** Atiende /c/:id y /capacitaciones/:id con la vista previa del curso publicado. */
export function servirVistaCurso(indice, destino) {
  return async (request, response) => {
    const id = idDeRuta(request.path)
    response.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    if (!id) return response.status(404).sendFile(indice)
    try {
      const resultado = await fetch(new URL(`/api/publico/cursos/${id}/compartir`, destino), {
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      })
      if (resultado.status === 404 || resultado.status === 503) {
        await resultado.body?.cancel()
        return response.status(resultado.status).sendFile(indice)
      }
      if (!resultado.ok) throw new RespuestaInvalida()
      const vista = vistaPreviaDe(await resultado.json(), id)
      return response.type('html').send(conMetadatos(await readFile(indice, 'utf8'), vista))
    } catch {
      // Sin datos del curso ni del error: solo el tipo de fallo.
      console.warn('No se pudo preparar la vista previa pública del curso.')
      return response.status(502).sendFile(indice)
    }
  }
}
