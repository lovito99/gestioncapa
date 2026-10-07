import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, test } from "node:test";
import jwt from "@fastify/jwt";
import Fastify, { type FastifyInstance } from "fastify";
import { rutasPendientes } from "../src/modules/pendientes/pendientes.routes.js";
import { registrarAutorizacion, type Rol } from "../src/plugins/autorizacion.js";
import { permisos } from "../src/plugins/permisos.js";

const SECRETO = "secreto-de-prueba-de-permisos-con-32-caracteres";
const ROLES: Rol[] = ["ADMIN", "COORDINADOR", "INSTRUCTOR", "PARTICIPANTE"];

const usuarios = new Map(
  ROLES.map((rol, indice) => [
    indice + 1,
    { id: indice + 1, name: rol, email: `${rol.toLowerCase()}@prueba.local`, role: rol.toLowerCase() }
  ])
);

function tokenDe(rol: Rol) {
  const id = ROLES.indexOf(rol) + 1;
  const parte = (valor: object) => Buffer.from(JSON.stringify(valor)).toString("base64url");
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = `${parte({ alg: "HS256", typ: "JWT" })}.${parte({ sub: String(id), iat: ahora, exp: ahora + 60 })}`;
  return `${cuerpo}.${createHmac("sha256", SECRETO).update(cuerpo).digest("base64url")}`;
}

/** Sustituye los parámetros (:id) por un valor de ejemplo. */
const urlDe = (ruta: string) => ruta.replace(/:[a-zA-Z]+/g, "1");

async function crearApp(registrarRutas: (app: FastifyInstance) => void | Promise<void>) {
  const app = Fastify();
  await app.register(jwt, { secret: SECRETO });
  registrarAutorizacion(app, async (id) => usuarios.get(id) ?? null);
  await registrarRutas(app);
  await app.ready();
  return app;
}

let app: FastifyInstance;
let crearClaseEjecutada = 0;

const protegidas = permisos.filter((permiso) => permiso.acceso !== "publico");
const conRoles = permisos.filter((permiso) => Array.isArray(permiso.acceso));

describe("Característica: Autorización por rol en cada ruta del servidor", () => {
  before(async () => {
    app = await crearApp(async (app) => {
      // Ruta "implementada" con efecto observable: cuenta las veces que se ejecuta.
      app.post("/api/clases", async (_request, reply) => {
        crearClaseEjecutada++;
        return reply.code(201).send({ id: "1" });
      });
      await app.register(rutasPendientes);
    });
  });

  after(() => app.close());

  test("PER-01: Dado una ruta sin permiso declarado, cuando el servidor arranca, entonces falla nombrándola", async () => {
    await assert.rejects(
      crearApp((app) => {
        app.delete("/api/clases/:id", async () => ({}));
      }),
      /DELETE \/api\/clases\/:id/
    );
  });

  test("PER-01: La matriz no repite rutas", () => {
    const claves = permisos.map((p) => `${p.metodo} ${p.ruta}`);
    assert.equal(new Set(claves).size, claves.length);
  });

  for (const { metodo, ruta } of protegidas) {
    test(`PER-02: ${metodo} ${ruta} sin token responde 401`, async () => {
      const respuesta = await app.inject({ method: metodo, url: urlDe(ruta) });

      assert.equal(respuesta.statusCode, 401);
      assert.equal(respuesta.json().code, "NO_AUTENTICADO");
    });
  }

  for (const { metodo, ruta, acceso } of conRoles) {
    for (const rol of ROLES) {
      const permitido = (acceso as Rol[]).includes(rol);

      test(`${permitido ? "PER-04" : "PER-03"}: ${rol} en ${metodo} ${ruta} ${permitido ? "pasa el guard" : "responde 403"}`, async () => {
        const respuesta = await app.inject({
          method: metodo,
          url: urlDe(ruta),
          headers: { authorization: `Bearer ${tokenDe(rol)}` }
        });

        if (permitido) {
          assert.ok(![401, 403].includes(respuesta.statusCode), `recibió ${respuesta.statusCode}`);
        } else {
          assert.equal(respuesta.statusCode, 403);
          assert.equal(respuesta.json().code, "SIN_PERMISO");
        }
      });
    }
  }

  test("PER-04: Una ruta pendiente responde 501 NO_IMPLEMENTADO al rol permitido", async () => {
    const respuesta = await app.inject({
      method: "GET",
      url: "/api/participante/clases",
      headers: { authorization: `Bearer ${tokenDe("PARTICIPANTE")}` }
    });

    assert.equal(respuesta.statusCode, 501);
    assert.equal(respuesta.json().code, "NO_IMPLEMENTADO");
  });

  test("PER-05: Dado un participante, cuando llama a POST /api/clases, entonces 403 y el handler no se ejecuta", async () => {
    crearClaseEjecutada = 0;
    const pedir = (rol: Rol) =>
      app.inject({
        method: "POST",
        url: "/api/clases",
        headers: { authorization: `Bearer ${tokenDe(rol)}` },
        payload: { nombre: "Clase no autorizada" }
      });

    const rechazo = await pedir("PARTICIPANTE");
    assert.equal(rechazo.statusCode, 403);
    assert.equal(crearClaseEjecutada, 0);

    const permitido = await pedir("COORDINADOR");
    assert.equal(permitido.statusCode, 201);
    assert.equal(crearClaseEjecutada, 1);
  });

  for (const { metodo, ruta } of permisos.filter((p) => p.acceso === "publico")) {
    test(`PER-06: ${metodo} ${ruta} es pública y no exige sesión`, async () => {
      const respuesta = await app.inject({ method: metodo, url: urlDe(ruta) });

      assert.ok(![401, 403].includes(respuesta.statusCode), `recibió ${respuesta.statusCode}`);
    });
  }
});
