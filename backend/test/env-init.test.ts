import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { generarEnv } from "../src/config/env-init.js";
import { parseEnv } from "../src/config/env.schema.js";
import { parse } from "dotenv";
import { readFile } from "node:fs/promises";

const plantilla = await readFile(new URL("../.env.example", import.meta.url), "utf8");

describe("Característica: Configuración validada al arrancar", () => {
  test("CFG-06: Dado .env.example, cuando se genera el .env, entonces reemplaza los marcadores", () => {
    let llamada = 0;
    const generado = generarEnv(plantilla, () => `aleatorio${++llamada}`.padEnd(40, "x"));
    const valores = parse(generado);

    assert.equal(valores.JWT_SECRET, "aleatorio1".padEnd(40, "x"));
    assert.equal(valores.ADMIN_PASSWORD, "aleatorio2".padEnd(40, "x"));
    assert.equal(valores.QR_SECRET, "aleatorio3".padEnd(40, "x"));
    assert.doesNotMatch(generado, /cambia/i);
  });

  test("CFG-06: Dado el .env generado, cuando se valida, entonces la configuración es aceptada", () => {
    const valores = parse(generarEnv(plantilla));

    assert.doesNotThrow(() => parseEnv(valores));
  });

  test("CFG-06: Dado la plantilla sin cambios, cuando se valida, entonces es rechazada", () => {
    assert.throws(() => parseEnv(parse(plantilla)), /valor de ejemplo/);
  });
});
