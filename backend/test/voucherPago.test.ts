import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearPdfTexto } from '../src/shared/pdf.js';
import { validarArchivoVoucher } from '../src/services/pagos/voucherArchivo.js';
import { normalizarNumeroOperacion } from '../src/repositories/pagos/vouchersRepository.js';
import { entradaRecepcionEfectivo } from '../src/dto/pagos/pagoDto.js';

const pdf={tipo:'application/pdf',contenidoBase64:crearPdfTexto('Voucher de prueba',['Sin movimiento bancario.']).toString('base64')};
test('HU32-02: admite PDF/PNG privados y rechaza tipo falso, SVG, base64 inválido y tamaño excesivo',()=>{
  assert.equal(validarArchivoVoucher(pdf).tipo,'application/pdf');
  const png={tipo:'image/png',contenidoBase64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg=='};
  assert.equal(validarArchivoVoucher(png).contenido[0],137);
  for(const archivo of [{...pdf,tipo:'image/png'},{tipo:'image/svg+xml',contenidoBase64:Buffer.from('<svg/>').toString('base64')},
    {...pdf,contenidoBase64:'no es base64'},{...pdf,contenidoBase64:Buffer.alloc(5242881).toString('base64')},
    {...png,nombre:'../../privado.pdf'}]) assert.throws(()=>validarArchivoVoucher(archivo));
});
test('HU32-03: referencias equivalentes tienen una sola clave sin separadores',()=>{
  assert.equal(normalizarNumeroOperacion('  ab-123.456 /7 '),'AB1234567');
  assert.equal(normalizarNumeroOperacion('123 456'),normalizarNumeroOperacion('123-456'));
  assert.throws(()=>normalizarNumeroOperacion('---'));
});
test('HU32-06: efectivo exige importe en céntimos y fecha válida además de referencia',()=>{
  const entrada={referencia:'CAJA-HU32',importeCentimos:15050,fechaRecepcion:'2026-11-15'};
  assert.equal(entradaRecepcionEfectivo.parse(entrada).importeCentimos,15050);
  for(const cambio of [{importeCentimos:1.5},{importeCentimos:0},{fechaRecepcion:'2026-02-30'},{importeCentimos:undefined}])
    assert.equal(entradaRecepcionEfectivo.safeParse({...entrada,...cambio}).success,false);
});
