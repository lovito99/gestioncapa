import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearPdfTexto } from '../src/shared/pdf.js';
import { ocultarDni, resumirAsistencia, type SesionHistorial } from '../src/modules/historial/historial.modelo.js';

test('HU-18: DNI expone solo los últimos cuatro dígitos; datos ausentes no se inventan', () => {
  assert.equal(ocultarDni('12345678'), '****5678'); assert.equal(ocultarDni('00001234'), '****1234');
  for (const dni of [null, '', '123', 'abcdef12']) assert.equal(ocultarDni(dni), null);
});
test('HU-18: porcentaje excluye pendientes y canceladas y evita división por cero', () => {
  const sesiones = [{ estado: 'PRESENTE', contabiliza: true }, { estado: 'AUSENTE', contabiliza: true },
    { estado: 'PENDIENTE', contabiliza: false }, { estado: 'CANCELADA', contabiliza: false }] as SesionHistorial[];
  assert.deepEqual(resumirAsistencia(sesiones), { presentes: 1, realizadas: 2, porcentaje: 50 });
  assert.deepEqual(resumirAsistencia([]), { presentes: 0, realizadas: 0, porcentaje: null });
});
test('HU-18: PDF paginado contiene texto español y referencias válidas sin interpretar contenido como objetos', () => {
  const archivo = crearPdfTexto('Historial de capacitación', ['José Núñez (colegiado)', 'DNI: ****5678', 'Texto literal: endstream ( ) \\', ...Array.from({ length: 140 }, (_, i) => `Sesión ${i + 1}: ${'curso '.repeat(25)}`)]);
  const pdf = archivo.toString();
  assert.ok(pdf.startsWith('%PDF-1.4')); assert.ok(pdf.endsWith('%%EOF\n'));
  assert.match(pdf, /\/Count [4-9]/);
  const texto = [...pdf.matchAll(/<([0-9a-f]*)> Tj/g)].map(m => Buffer.from(m[1]!, 'hex').toString('latin1')).join('\n');
  assert.match(texto, /José Núñez/); assert.match(texto, /Sesión 140/); assert.ok(!texto.includes('12345678'));
  const xref = Number(pdf.match(/startxref\n(\d+)/)![1]); assert.equal(archivo.subarray(xref, xref + 4).toString(), 'xref');
  const entradas = pdf.slice(xref).split('\n');
  const cantidad = Number(entradas[1]!.split(' ')[1]);
  for (let id = 1; id < cantidad; id++) {
    const offset = Number(entradas[id + 2]!.slice(0, 10));
    assert.ok(archivo.subarray(offset, offset + 20).toString().startsWith(`${id} 0 obj`));
  }
});
