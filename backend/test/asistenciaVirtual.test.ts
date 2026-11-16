import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularAsistenciaVirtual } from "../src/modules/reuniones/asistenciaVirtual.js";

const referencia = { inicio: 0, fin: 1000 };

test('HU26-13: une conexiones solapadas de la misma persona sin contarlas dos veces', () => {
  const resultado = calcularAsistenciaVirtual([{ inicio: 0, fin: 400 }, { inicio: 300, fin: 600 }, { inicio: 800, fin: 900 }], referencia, 70);
  assert.deepEqual(resultado, { segundosConectados: 700, porcentaje: 70, cuenta: true });
});

test('HU26-13: recorta los intervalos a la duración de referencia', () => {
  const resultado = calcularAsistenciaVirtual([{ inicio: -500, fin: 100 }, { inicio: 950, fin: 4000 }], referencia, 10);
  assert.equal(resultado.segundosConectados, 150);
  assert.equal(resultado.porcentaje, 15);
});

test('HU26-14: por debajo del mínimo no cuenta la asistencia', () => {
  assert.equal(calcularAsistenciaVirtual([{ inicio: 0, fin: 699 }], referencia, 70).cuenta, false);
  assert.equal(calcularAsistenciaVirtual([{ inicio: 0, fin: 700 }], referencia, 70).cuenta, true);
});

test('HU26-13: sin conexiones, intervalos inválidos o referencia vacía no divide entre cero', () => {
  assert.deepEqual(calcularAsistenciaVirtual([], referencia, 70), { segundosConectados: 0, porcentaje: 0, cuenta: false });
  assert.deepEqual(calcularAsistenciaVirtual([{ inicio: 500, fin: 400 }], referencia, 70), { segundosConectados: 0, porcentaje: 0, cuenta: false });
  assert.deepEqual(calcularAsistenciaVirtual([{ inicio: 0, fin: 10 }], { inicio: 5, fin: 5 }, 70), { segundosConectados: 0, porcentaje: 0, cuenta: false });
});

test('HU26-13: el porcentaje se redondea a dos decimales y no supera 100', () => {
  assert.equal(calcularAsistenciaVirtual([{ inicio: 0, fin: 1 }], { inicio: 0, fin: 3 }, 1).porcentaje, 33.33);
  assert.equal(calcularAsistenciaVirtual([{ inicio: 0, fin: 1000 }, { inicio: 0, fin: 1000 }], referencia, 100).porcentaje, 100);
});
