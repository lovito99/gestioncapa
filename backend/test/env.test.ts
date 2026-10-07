import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { EnvError, parseEnv } from "../src/config/env.schema.js";

const entornoValido = {
  DB_HOST: "localhost",
  DB_NAME: "gestiondecapacitacion",
  DB_USER: "gestiondecapacitacion",
  DB_PASSWORD: "gestiondecapacitacion",
  REDIS_URL: "redis://:gestiondecapacitacion@localhost:6379",
  JWT_SECRET: "secreto-propio-de-prueba-con-mas-de-32-caracteres",
  ADMIN_EMAIL: "admin@gestioncapa.local",
  ADMIN_PASSWORD: "ClavePropia123!"
};

function errorDe(source: Record<string, string | undefined>) {
  try {
    parseEnv(source);
  } catch (error) {
    assert.ok(error instanceof EnvError, "debe lanzar EnvError");
    return error;
  }
  assert.fail("la configuración debía ser rechazada");
}

describe("Característica: Configuración validada al arrancar", () => {
  test("CFG-01: Dado que falta JWT_SECRET, cuando se valida, entonces indica que falta", () => {
    const { JWT_SECRET: _omitida, ...source } = entornoValido;
    const error = errorDe(source);

    assert.deepEqual(error.problemas, [{ variable: "JWT_SECRET", motivo: "falta" }]);
    assert.match(error.message, /JWT_SECRET: falta/);
  });

  test("CFG-02: Dado ADMIN_PASSWORD con el valor de ejemplo, cuando se valida, entonces lo rechaza", () => {
    const error = errorDe({ ...entornoValido, ADMIN_PASSWORD: "CambiaEstaClave123!" });

    assert.deepEqual(error.problemas.map((p) => p.variable), ["ADMIN_PASSWORD"]);
    assert.match(error.message, /ADMIN_PASSWORD: tiene el valor de ejemplo/);
  });

  test("CFG-02: Dado JWT_SECRET con el marcador de .env.example, cuando se valida, entonces lo rechaza", () => {
    const error = errorDe({ ...entornoValido, JWT_SECRET: "CAMBIA_ESTE_SECRETO_JWT_DE_32_CARACTERES_MINIMO" });

    assert.match(error.message, /JWT_SECRET: tiene el valor de ejemplo/);
  });

  test("CFG-03: Dado DB_PASSWORD vacía, cuando se valida, entonces indica que falta", () => {
    const error = errorDe({ ...entornoValido, DB_PASSWORD: "  " });

    assert.deepEqual(error.problemas, [{ variable: "DB_PASSWORD", motivo: "falta" }]);
  });

  test("CFG-04: Dado varios problemas, cuando se valida, entonces los lista todos sin mostrar secretos", () => {
    const secreto = "corto";
    const error = errorDe({
      ...entornoValido,
      DB_HOST: undefined,
      REDIS_URL: undefined,
      JWT_SECRET: secreto,
      ADMIN_EMAIL: "no-es-correo"
    });

    assert.deepEqual(error.problemas.map((p) => p.variable).sort(), [
      "ADMIN_EMAIL",
      "DB_HOST",
      "JWT_SECRET",
      "REDIS_URL"
    ]);
    assert.match(error.message, /JWT_SECRET: debe tener al menos 32 caracteres/);
    assert.equal(error.message.split("\n").filter((l) => l.startsWith("  - ")).length, 4);
    assert.ok(!error.message.includes(secreto), "no debe mostrar el valor del secreto");
  });

  test("CFG-05: Dado un entorno completo, cuando se valida, entonces aplica los valores por defecto", () => {
    const env = parseEnv(entornoValido);

    assert.equal(env.PORT, 8080);
    assert.equal(env.NODE_ENV, "development");
    assert.equal(env.DB_PORT, 5432);
    assert.equal(env.DB_SSL, false);
    assert.equal(env.JWT_SECRET, entornoValido.JWT_SECRET);
  });
});
