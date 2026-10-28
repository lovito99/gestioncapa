/** PDF con texto seleccionable, paginado y caracteres españoles mediante WinAnsi. */
function textoPdf(texto: string) {
  const especiales: Record<string, number> = { '€': 128, '“': 147, '”': 148, '‘': 145, '’': 146, '–': 150, '—': 151, '…': 133 };
  return Buffer.from(Array.from(texto, letra => {
    const codigo = letra.codePointAt(0)!;
    return especiales[letra] ?? (codigo >= 32 && codigo <= 255 ? codigo : 63);
  })).toString('hex');
}
function envolver(texto: string, ancho = 84) {
  const limpio = texto.replace(/[\x00-\x1f\x7f]/g, ' ');
  if (!limpio.length) return [''];
  const lineas: string[] = [];
  let resto = limpio;
  while (resto.length > ancho) {
    const espacio = resto.lastIndexOf(' ', ancho);
    const corte = espacio > 0 ? espacio : ancho;
    lineas.push(resto.slice(0, corte)); resto = resto.slice(corte).trimStart();
  }
  lineas.push(resto); return lineas;
}
export function crearPdfTexto(titulo: string, contenido: string[]) {
  const lineas = contenido.flatMap(linea => envolver(linea));
  const cantidad = Math.max(1, Math.ceil(lineas.length / 48));
  const objetos: string[] = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'];
  const paginas: number[] = [];
  for (let i = 0; i < cantidad; i++) {
    const pagina = objetos.length + 1; const flujo = pagina + 1; paginas.push(pagina);
    const texto = [titulo, `Página ${i + 1} de ${cantidad}`, '', ...lineas.slice(i * 48, (i + 1) * 48)];
    const stream = `BT /F1 10 Tf 14 TL 40 790 Td\n${texto.map(linea => `<${textoPdf(linea)}> Tj T*`).join('\n')}\nET`;
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${flujo} 0 R >>`);
    objetos.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objetos[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objetos[1] = `<< /Type /Pages /Kids [${paginas.map(id => `${id} 0 R`).join(' ')}] /Count ${cantidad} >>`;
  let pdf = '%PDF-1.4\n'; const offsets: number[] = [];
  objetos.forEach((objeto, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
