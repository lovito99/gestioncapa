import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, test } from "node:test";
import jwt from "@fastify/jwt";
import Fastify, { type FastifyInstance } from "fastify";
import { crearGuard } from "../src/plugins/autorizacion.js";

const SECRETO = "secreto-de-prueba-del-guard-con-32-caracteres";

const usuarios = new Map([
  [1, { id: 1, name: "Ana Torres", email: "ana.torres@organizacion.pe", role: "coordinador" }],
  [2, { id: 2, name: "María Quispe", email: "maria.quispe@demo.pe", role: "participante" }]
]);

// Firma HS256 manual para fabricar tokens expirados o con otro secreto.
function firmar(payload: object, secreto = SECRETO) {
  const parte = (valor: object) => Buffer.from(JSON.stringify(valor)).toString("base64url");
  const cuerpo = `${parte({ alg: "HS256", typ: "JWT" })}.${parte(payload)}`;
  return `${cuerpo}.${createHmac("sha256", secreto).update(cuerpo).digest("base64url")}`;
}

const ahora = () => Math.floor(Date.now() / 1000);
const tokenDe = (id: number) => firmar({ sub: String(id), iat: ahora(), exp: ahora() + 60 });

let app: FastifyInstance;

async function pedir(token?: string) {
  return app.inject({
    method: "GET",
    url: "/solo-coordinador",
    headers: token ? { authorization: `Bearer ${token}` } : {}
  });
}

describe("Característica: Autorización en el servidor", () => {
  before(async () => {
    app = Fastify();
    await app.register(jwt, { secret: SECRETO });
    const requerirRol = crearGuard(async (id) => usuarios.get(id) ?? null);
    app.get("/solo-coordinador", { preHandler: requerirRol("COORDINADOR") }, async (request) => ({
      email: request.usuario?.email
    }));
    await app.ready();
  });

  after(() => app.close());

  test("API-01: Cuando se llama sin token, entonces responde 401 NO_AUTENTICADO", async () => {
    const respuesta = await pedir();

    assert.equal(respuesta.statusCode, 401);
    assert.equal(respuesta.json().code, "NO_AUTENTICADO");
  });

  test("API-02: Cuando el token expiró, entonces responde 401 NO_AUTENTICADO", async () => {
    const respuesta = await pedir(firmar({ sub: "1", iat: ahora() - 120, exp: ahora() - 60 }));

    assert.equal(respuesta.statusCode, 401);
    assert.equal(respuesta.json().code, "NO_AUTENTICADO");
  });

  test("API-02: Cuando el token tiene otra firma, entonces responde 401 NO_AUTENTICADO", async () => {
    const respuesta = await pedir(firmar({ sub: "1", exp: ahora() + 60 }, "otro-secreto-distinto-de-32-caracteres!!"));

    assert.equal(respuesta.statusCode, 401);
    assert.equal(respuesta.json().code, "NO_AUTENTICADO");
  });

  test("ROL-04: Dado un usuario que ya no existe o está inactivo, cuando usa su token, entonces 401", async () => {
    const respuesta = await pedir(tokenDe(99));

    assert.equal(respuesta.statusCode, 401);
    assert.equal(respuesta.json().code, "NO_AUTENTICADO");
  });

  test("API-03: Dado un participante, cuando llama a una ruta de coordinador, entonces 403 SIN_PERMISO", async () => {
    const respuesta = await pedir(tokenDe(2));

    assert.equal(respuesta.statusCode, 403);
    assert.equal(respuesta.json().code, "SIN_PERMISO");
  });

  test("API-04: Dado un coordinador, cuando llama a su ruta, entonces 200 con el usuario autenticado", async () => {
    const respuesta = await pedir(tokenDe(1));

    assert.equal(respuesta.statusCode, 200);
    assert.equal(respuesta.json().email, "ana.torres@organizacion.pe");
  });
});
