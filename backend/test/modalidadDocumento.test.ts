import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, type PDFObject } from 'pdf-lib';
import type { DatosDocumento } from '../src/entities/certificados/certificado.js';
import { crearConstancia } from '../src/providers/certificados/constanciaPdf.js';

// Las fuentes incrustadas del certificado usan glifos de dos bytes con un mapa ToUnicode.
async function leerTextoCertificado(archivo: Uint8Array) {
  const pdf = await PDFDocument.load(archivo);
  const pagina = pdf.getPage(0).node;
  const contenidos = pagina.Contents();
  const fuentes = pagina.Resources()?.lookup(PDFName.of('Font'), PDFDict);
  assert.ok(contenidos instanceof PDFArray && fuentes);
  const textoDelFlujo = (flujo: PDFObject | undefined) => {
    assert.ok(flujo instanceof PDFRawStream);
    return Buffer.from(decodePDFRawStream(flujo).decode()).toString();
  };
  const utf = new TextDecoder('utf-16be');
  const texto = [];
  for (const referencia of contenidos.asArray()) {
    const contenido = textoDelFlujo(pdf.context.lookup(referencia));
    for (const [, fuente, glifos] of contenido.matchAll(/\/(\S+) [\d.]+ Tf\n[^<]*<([A-F0-9]+)> Tj/g)) {
      const mapa = fuentes.lookup(PDFName.of(fuente!), PDFDict).lookup(PDFName.of('ToUnicode'));
      const caracteres = new Map(Array.from(textoDelFlujo(mapa).matchAll(/<([A-F0-9]{4})> <([A-F0-9]+)>/g),
        ([, glifo, valor]) => [glifo, utf.decode(Buffer.from(valor!, 'hex'))]));
      texto.push(glifos!.match(/.{4}/g)!.map(glifo => caracteres.get(glifo)).join(''));
    }
  }
  return texto.join('\n');
}

test('HU19-09: el PDF conserva la modalidad real de cada curso', async () => {
  for (const [modalidad, etiqueta] of [
    ['PRESENCIAL', 'Presencial'], ['VIRTUAL', 'Virtual'], ['HIBRIDA', 'Híbrida'], ['GRABADO', 'Grabada']
  ] as const) {
    const datos: DatosDocumento = {
      nombre: 'Colegiada de prueba', dniEnmascarado: null, curso: 'Curso de prueba', modalidad,
      horasLectivas: 10, fechaInicio: null, fechaFin: null, instructorNombre: 'Instructor', tipo: 'PARTICIPACION', demo: true
    };
    const archivo = await crearConstancia(datos, 'CPPP-PRUEBA', '2026-11-25T12:00:00Z', 'https://cursos.example');
    const texto = await leerTextoCertificado(archivo);
    assert.ok(texto.includes(`Modalidad: ${etiqueta}`), texto);
  }
});

test('HU19-08/09: el PDF de aprobación incluye la mejor nota y el título correcto', async () => {
  const datos: DatosDocumento = {
    nombre: 'Colegiada de prueba', dniEnmascarado: null, curso: 'Curso de prueba', modalidad: 'GRABADO',
    horasLectivas: 10, fechaInicio: null, fechaFin: null, instructorNombre: 'Instructor',
    tipo: 'APROBACION', nota: 20, demo: true
  };
  const archivo = await crearConstancia(datos, 'CPPP-PRUEBA', '2026-11-25T12:00:00Z', 'https://cursos.example');
  const texto = await leerTextoCertificado(archivo);
  assert.match(texto, /CERTIFICADO DE APROBACIÓN/);
  assert.match(texto, /Nota final: 20\/20/);
});
