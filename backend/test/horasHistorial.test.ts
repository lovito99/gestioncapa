import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resumirHoras } from '../src/modules/historial/historial.modelo.js';

test('HU-34: suma cada certificado válido y agrupa por año de emisión en Lima', () => {
  assert.deepEqual(resumirHoras([
    { estado: 'VALIDO', horasLectivas: 24, emitidoEn: '2026-01-01T04:59:59Z' },
    { estado: 'VALIDO', horasLectivas: 16, emitidoEn: '2026-01-01T05:00:00Z' },
    { estado: 'VALIDO', horasLectivas: 8, emitidoEn: '2026-09-01T00:00:00Z' },
    { estado: 'ANULADO', horasLectivas: 100, emitidoEn: '2026-09-01T00:00:00Z' },
    { estado: 'REEMPLAZADO', horasLectivas: 200, emitidoEn: '2025-09-01T00:00:00Z' },
  ]), { total: 48, porAnio: [{ anio: '2026', horas: 24 }, { anio: '2025', horas: 24 }] });
});
test('HU-34: sin certificados válidos el total es cero y no inventa años', () => {
  assert.deepEqual(resumirHoras([]), { total: 0, porAnio: [] });
  assert.deepEqual(resumirHoras([{ estado: 'ANULADO', horasLectivas: 12, emitidoEn: '2026-06-01T00:00:00Z' }]), { total: 0, porAnio: [] });
});
