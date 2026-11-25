import assert from 'node:assert/strict';
import { test } from 'node:test';
import { esquemaPoliticaCobro, aCentimos } from '../src/dto/cursos/cobroDto.js';

test('HU53-01: distingue cobro previo, por certificado y gratuidad', () => {
  for (const modalidadCobro of ['PREVIO', 'CERTIFICADO', 'GRATUITO']) {
    const resultado = esquemaPoliticaCobro.parse({ modalidadCobro, costo: modalidadCobro === 'GRATUITO' ? 0 : 150.50,
      plazoPagoMinutos: modalidadCobro === 'PREVIO' ? 60 : null });
    assert.equal(resultado.modalidadCobro, modalidadCobro);
  }
});

test('HU53-01: rechaza importes y plazos incoherentes sin inventar valores', () => {
  for (const entrada of [
    { modalidadCobro: 'PREVIO', costo: 20 },
    { modalidadCobro: 'PREVIO', costo: 20, plazoPagoMinutos: 0 },
    { modalidadCobro: 'PREVIO', costo: 20, plazoPagoMinutos: 1.5 },
    { modalidadCobro: 'PREVIO', costo: 0, plazoPagoMinutos: 60 },
    { modalidadCobro: 'CERTIFICADO', costo: 0, plazoPagoMinutos: null },
    { modalidadCobro: 'CERTIFICADO', costo: 20, plazoPagoMinutos: 60 },
    { modalidadCobro: 'GRATUITO', costo: 10, plazoPagoMinutos: null },
    { modalidadCobro: 'GRATUITO', costo: 0, plazoPagoMinutos: 60 },
    { modalidadCobro: 'OTRO', costo: 0, plazoPagoMinutos: null },
    { modalidadCobro: 'CERTIFICADO', costo: 1.234, plazoPagoMinutos: null },
    { modalidadCobro: 'CERTIFICADO', costo: '20', plazoPagoMinutos: null },
  ]) assert.equal(esquemaPoliticaCobro.safeParse(entrada).success, false, JSON.stringify(entrada));
});

test('HU53-01: convierte decimales validados a céntimos exactos', () => {
  assert.equal(aCentimos(0.29), 29);
  assert.equal(aCentimos(150.50), 15050);
  assert.equal(aCentimos(9999999999.99), 999999999999);
  for (const valor of [-1, 1.234, Infinity, NaN]) assert.throws(() => aCentimos(valor));
});
