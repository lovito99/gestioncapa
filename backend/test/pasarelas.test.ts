import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearRegistroPasarelas } from '../src/modules/pagos/pasarelas.registro.js';
import { cotizarImporte } from '../src/modules/pagos/pagos.modelo.js';

test('HU54-05: desactivar altas o retirar un adaptador deja disponibles los demás', () => {
  const primero = { medio: 'PRIMERA', ruta: 'primera', altas: () => false, conciliacion: () => true };
  const segundo = { medio: 'SEGUNDA', ruta: 'segunda', altas: () => true, conciliacion: () => true };
  const registro = crearRegistroPasarelas([primero, segundo]);
  assert.deepEqual(registro.altas(), [segundo]);
  assert.deepEqual(registro.conciliables().map(pasarela => pasarela.medio), ['PRIMERA', 'SEGUNDA']);
  assert.equal(registro.porRuta('primera'), primero);
  const restante = crearRegistroPasarelas([segundo]);
  assert.equal(restante.porMedio('PRIMERA'), undefined);
  assert.equal(restante.porRuta('segunda'), segundo);
});

test('HU54-01: calcula en céntimos, con medias al alza y cero explícito', () => {
  assert.deepEqual(cotizarImporte(10020, 350), {
    baseCentimos: 10020, comisionCentimos: 351, totalCentimos: 10371, moneda: 'PEN',
  });
  assert.equal(cotizarImporte(200, 25).comisionCentimos, 1);
  assert.equal(cotizarImporte(199, 25).totalCentimos, 199);
  assert.equal(cotizarImporte(10020, 0).totalCentimos, 10020);
  assert.equal(cotizarImporte(999999999961, 9359).comisionCentimos, 935899999963);
});
