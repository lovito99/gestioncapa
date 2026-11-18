// Genera public/portadas/*.jpg (1280 × 720) desde las ilustraciones de src/assets/portadas.
// Uso desde la raíz: node frontend/scripts/portadasSociales.mjs (usa sharp del workspace backend).
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const frontend = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const origen = path.join(frontend, 'src/assets/portadas')
const destino = path.join(frontend, 'public/portadas')
const [ancho, alto] = [1280, 720]

const dato = async archivo => `data:image/svg+xml;base64,${(await readFile(path.join(origen, archivo))).toString('base64')}`
const capa = (href, x, y, w, h) => `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>`

/** Misma composición por capas que FondoAzul en piezasCurso.tsx, en porcentajes del contenedor. */
async function azul() {
  const icono = alto * 0.338
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">
    <defs><linearGradient id="g" gradientTransform="rotate(60.64 .5 .5)"><stop offset="0" stop-color="#1f4e79"/><stop offset=".7143" stop-color="#0d2840"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${capa(await dato('azul-circulo-1.svg'), ancho * 0.625, alto * -0.25, ancho * 0.45, ancho * 0.45)}
    ${capa(await dato('azul-circulo-2.svg'), ancho * -0.075, alto * 0.639, ancho * 0.35, ancho * 0.35)}
    ${capa(await dato('azul-circulo-3.svg'), ancho * 0.56, alto * 0.69, ancho * 0.18, ancho * 0.18)}
    ${capa(await dato('azul-icono.svg'), (ancho - icono) / 2, (alto - icono) / 2, icono, icono)}
  </svg>`)
}

for (const fondo of ['vino', 'verde', 'dorado', 'azul', 'morado', 'rojo']) {
  const svg = fondo === 'azul' ? await azul() : await readFile(path.join(origen, `${fondo}.svg`))
  await sharp(svg, { density: 300 }).resize(ancho, alto, { fit: 'fill' }).flatten({ background: '#371724' })
    .jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(destino, `${fondo}.jpg`))
}
