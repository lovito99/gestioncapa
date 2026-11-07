/** Generación local solo para las descargas de la simulación MSW. */
export function pdfTextoDemo(titulo: string, lineas: string[]) {
  const textoHex = (s: string) => Array.from(s, letra => {
    const n = letra.charCodeAt(0); return (n >= 32 && n <= 255 ? n : 63).toString(16).padStart(2, '0')
  }).join('')
  const contenido = lineas.flatMap(linea => {
    const partes: string[] = []; let resto = linea.replace(/[\x00-\x1f]/g, ' ')
    while (resto.length > 84) { const espacio = resto.lastIndexOf(' ', 84); const corte = espacio > 0 ? espacio : 84; partes.push(resto.slice(0, corte)); resto = resto.slice(corte).trimStart() }
    return [...partes, resto]
  })
  const paginas = Math.max(1, Math.ceil(contenido.length / 48))
  const objetos = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>']
  const ids: number[] = []
  for (let i = 0; i < paginas; i++) {
    const pagina = objetos.length + 1; ids.push(pagina)
    const texto = [titulo, `Página ${i + 1} de ${paginas}`, '', ...contenido.slice(i * 48, (i + 1) * 48)]
    const stream = `BT /F1 10 Tf 14 TL 40 790 Td\n${texto.map(s => `<${textoHex(s)}> Tj T*`).join('\n')}\nET`
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pagina + 1} 0 R >>`)
    objetos.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  }
  objetos[0] = '<< /Type /Catalog /Pages 2 0 R >>'
  objetos[1] = `<< /Type /Pages /Kids [${ids.map(n => `${n} 0 R`).join(' ')}] /Count ${paginas} >>`
  let pdf = '%PDF-1.4\n'; const offsets: number[] = []
  objetos.forEach((objeto, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(pdf)
}
