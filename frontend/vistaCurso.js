import { readFile } from 'node:fs/promises'
import { costoPublicoCurso, esIdCursoPublico, fechaPublicaCurso, rutaCortaCurso } from './src/lib/enlaceCurso.ts'

const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapar = (valor) => valor.replace(/[&<>"']/g, caracter => entidades[caracter])
const meta = (propiedad, valor) => `<meta property="${propiedad}" content="${escapar(valor)}" />`
const fechaValida = (valor) => valor === null || (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor))

function incluirMetadatos(indice, curso, origen) {
  const etiquetas = [
    meta('og:type', 'website'),
    meta('og:title', curso.titulo),
    meta('og:url', `${origen}${rutaCortaCurso(curso.id)}`),
    meta('og:description', `${fechaPublicaCurso(curso)} · ${costoPublicoCurso(curso)}`),
    meta('og:image', `${origen}/vista-curso.png`),
    meta('og:image:type', 'image/png'),
    meta('og:image:width', '1200'),
    meta('og:image:height', '630'),
    meta('og:image:alt', 'Capacitaciones del CPPP Región Cusco'),
  ]
  return indice
    .replace(/<title>[^<]*<\/title>/i, () => `<title>${escapar(curso.titulo)}</title>`)
    .replace(/<\/head>/i, () => `${etiquetas.join('\n')}\n</head>`)
}

function idDeRuta(ruta) {
  try {
    const id = decodeURIComponent(ruta.slice(3).replace(/\/$/, ''))
    return esIdCursoPublico(id) ? id : null
  } catch {
    return null
  }
}

export function servirVistaCurso(indice, destino, origen) {
  return async (request, response) => {
    response.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    const id = idDeRuta(request.path)
    if (!id) return response.status(404).sendFile(indice)
    if (!origen) return response.status(503).sendFile(indice)

    try {
      const resultado = await fetch(new URL(`/api/publico/cursos/${id}`, destino), {
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      })
      if (!resultado.ok) {
        await resultado.body?.cancel()
        if (resultado.status === 404) return response.status(404).sendFile(indice)
        throw new Error('La respuesta de la ficha no está disponible')
      }
      const curso = await resultado.json()
      if (curso?.id !== id || typeof curso.titulo !== 'string' || !Number.isFinite(curso.costo) ||
          !fechaValida(curso.fechaInicio) || !fechaValida(curso.fechaFin)) {
        throw new Error('Los datos públicos del curso son inválidos')
      }
      const plantilla = await readFile(indice, 'utf8')
      return response.type('html').send(incluirMetadatos(plantilla, curso, origen))
    } catch {
      console.warn('No se pudo servir la vista previa pública del curso.')
      return response.status(502).sendFile(indice)
    }
  }
}
