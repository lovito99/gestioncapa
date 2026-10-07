import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { registrarErrores } from "../src/plugins/errores.js";

let app: FastifyInstance;

describe("Característica: Errores de API comprensibles y uniformes", () => {
  before(async () => {
    app = Fastify();
    registrarErrores(app);
    app.post("/datos", async (request) =>
      z.object({ email: z.email("Ingresa un correo válido") }).parse(request.body)
    );
    app.get("/fallo", async () => {
      throw new Error("Detalle interno de la conexión de prueba");
    });
    await app.ready();
  });

  after(() => app.close());

  test("VAL-01: un error Zod devuelve 422 VALIDACION y el mensaje del campo", async () => {
    const respuesta = await app.inject({ method: "POST", url: "/datos", payload: { email: "inválido" } });
    assert.equal(respuesta.statusCode, 422);
    assert.deepEqual(respuesta.json(), {
      code: "VALIDACION",
      message: "Revisa los campos indicados e intenta de nuevo.",
      fields: { email: "Ingresa un correo válido" }
    });
  });

  test("VAL-02: JSON incompleto devuelve 400 con un mensaje en español", async () => {
    const respuesta = await app.inject({
      method: "POST",
      url: "/datos",
      headers: { "content-type": "application/json" },
      payload: "{"
    });
    assert.equal(respuesta.statusCode, 400);
    assert.equal(respuesta.json().code, "SOLICITUD_INVALIDA");
    assert.equal(respuesta.json().message, "El cuerpo de la solicitud debe ser un JSON válido.");
  });

  test("VAL-03: un fallo interno no expone detalles de la base o del servidor", async () => {
    const respuesta = await app.inject({ method: "GET", url: "/fallo" });
    assert.equal(respuesta.statusCode, 500);
    assert.deepEqual(respuesta.json(), {
      code: "ERROR_INTERNO",
      message: "No pudimos completar la solicitud. Vuelve a intentar."
    });
  });

  test("VAL-04: una ruta inexistente conserva el contrato de errores", async () => {
    const respuesta = await app.inject({ method: "GET", url: "/no-existe" });
    assert.equal(respuesta.statusCode, 404);
    assert.equal(respuesta.json().code, "RUTA_NO_EXISTE");
  });
});
