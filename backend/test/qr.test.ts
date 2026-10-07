import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DURACION_QR_SEGUNDOS, emitirTokenQr, verificarTokenQr } from "../src/modules/qr/qr.token.js";

const SECRETO = "secreto-de-prueba-del-qr-con-32-caracteres";
// 2026-10-12 10:00:05 en Lima (15:00:05 UTC): 5 s dentro de una ventana.
const INICIO_VENTANA = Date.UTC(2026, 9, 12, 15, 0, 0);
const AHORA = INICIO_VENTANA + 5_000;
const VENTANA = DURACION_QR_SEGUNDOS * 1000;

describe("Característica: QR temporal rotatorio", () => {
  test("QR-01: el token vence al final de la ventana de 30 s", () => {
    const { expiraEnMs } = emitirTokenQr("7", AHORA, SECRETO);

    assert.equal(DURACION_QR_SEGUNDOS, 30);
    assert.equal(expiraEnMs, INICIO_VENTANA + VENTANA);
  });

  test("QR-02: el token sin alterar se verifica y devuelve su clase", () => {
    const { token } = emitirTokenQr("7", AHORA, SECRETO);

    assert.deepEqual(verificarTokenQr(token, AHORA, SECRETO), { ok: true, claseId: "7" });
    assert.match(token, /^7\.\d+\.[A-Za-z0-9_-]+$/, "solo clase, vencimiento y firma");
  });

  test("QR-02: alterar la clase, el vencimiento o la firma lo invalida", () => {
    const { token } = emitirTokenQr("7", AHORA, SECRETO);
    const [clase, expira, firma] = token.split(".") as [string, string, string];
    const invalido = { ok: false, motivo: "INVALIDO" };

    assert.deepEqual(verificarTokenQr(`8.${expira}.${firma}`, AHORA, SECRETO), invalido);
    assert.deepEqual(verificarTokenQr(`${clase}.${Number(expira) + 30}.${firma}`, AHORA, SECRETO), invalido);
    assert.deepEqual(verificarTokenQr(`${clase}.${expira}.${firma.slice(0, -2)}xx`, AHORA, SECRETO), invalido);
  });

  test("QR-02: un token firmado con otro secreto o mal formado es INVALIDO", () => {
    const ajeno = emitirTokenQr("7", AHORA, "otro-secreto-distinto-con-32-caracteres!!").token;

    for (const token of [ajeno, "", "basura", "7.abc.firma", "7..", "a.b.c.d"]) {
      assert.deepEqual(verificarTokenQr(token, AHORA, SECRETO), { ok: false, motivo: "INVALIDO" }, token);
    }
  });

  test("QR-03: dentro de la misma ventana el token es el mismo", () => {
    const primero = emitirTokenQr("7", INICIO_VENTANA, SECRETO).token;
    const ultimo = emitirTokenQr("7", INICIO_VENTANA + VENTANA - 1, SECRETO).token;

    assert.equal(primero, ultimo);
  });

  test("QR-03: pasados 30 s el anterior es EXPIRADO y solo el nuevo es válido", () => {
    const anterior = emitirTokenQr("7", AHORA, SECRETO);
    const siguienteVentana = anterior.expiraEnMs;
    const nuevo = emitirTokenQr("7", siguienteVentana, SECRETO);

    assert.notEqual(nuevo.token, anterior.token);
    assert.deepEqual(verificarTokenQr(anterior.token, siguienteVentana - 1, SECRETO), { ok: true, claseId: "7" });
    assert.deepEqual(verificarTokenQr(anterior.token, siguienteVentana, SECRETO), { ok: false, motivo: "EXPIRADO" });
    assert.deepEqual(verificarTokenQr(nuevo.token, siguienteVentana, SECRETO), { ok: true, claseId: "7" });
  });

  test("QR-02: el token de una clase no se confunde con el de otra", () => {
    assert.notEqual(emitirTokenQr("7", AHORA, SECRETO).token, emitirTokenQr("70", AHORA, SECRETO).token.replace(/^70/, "7"));
  });
});
