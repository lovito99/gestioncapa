/** «María Elena Quispe» → «MQ» (primera y última palabra), como los avatares del Figma S3 9.x. */
export function iniciales(nombre: string) {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (!palabras.length) return '?'
  const primera = palabras[0]!.charAt(0)
  const ultima = palabras.length > 1 ? palabras.at(-1)!.charAt(0) : ''
  return (primera + ultima).toUpperCase()
}
