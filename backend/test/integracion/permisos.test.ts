import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { sembrarUsuarios } from "../../src/modules/auth/auth.service.js";
import { usuariosSeed } from "../../src/modules/auth/usuarios-seed.js";
import type { Rol } from "../../src/plugins/autorizacion.js";
import { permisos } from "../../src/plugins/permisos.js";
import { pool } from "../../src/shared/database.js";
import { migrar } from "../../src/shared/migraciones.js";
import { redis } from "../../src/shared/redis.js";

// Requiere Postgres y Redis activos (docker compose up -d --wait) y backend/.env.
const criticas = permisos.filter((permiso) => permiso.critica);
const urlDe = (ruta: string) => ruta.replace(/:[a-zA-Z]+/g, "1");
const tokens = new Map<Rol, string>();
let app: FastifyInstance;

describe("Característica: Autorización por rol en cada ruta del servidor", () => {
  before(async () => {
    await migrar(pool);
    await sembrarUsuarios();
    app = await buildApp();

    // Un usuario del seed por rol, autenticado por el login real.
    for (const usuario of usuariosSeed(env)) {
      const rol = usuario.role.toUpperCase() as Rol;
      if (tokens.has(rol)) continue;
      const respuesta = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: usuario.email, password: usuario.password }
      });
      tokens.set(rol, respuesta.json().token);
    }
  });

  after(async () => {
    await app?.close();
    await pool.end();
    redis.disconnect();
  });

  test("PER-07: Hay un token del seed para cada uno de los 4 roles", () => {
    assert.deepEqual([...tokens.keys()].sort(), ["ADMIN", "COORDINADOR", "INSTRUCTOR", "PARTICIPANTE"]);
  });

  for (const { metodo, ruta, acceso } of criticas) {
    test(`PER-07: ${metodo} ${ruta} sin token responde 401`, async () => {
      const respuesta = await app.inject({ method: metodo, url: urlDe(ruta) });
      assert.equal(respuesta.statusCode, 401);
    });

    for (const rol of ["ADMIN", "COORDINADOR", "INSTRUCTOR", "PARTICIPANTE"] as Rol[]) {
      const permitido = (acceso as Rol[]).includes(rol);

      test(`PER-07: ${rol} del seed en ${metodo} ${ruta} ${permitido ? "pasa el guard" : "responde 403"}`, async () => {
        const respuesta = await app.inject({
          method: metodo,
          url: urlDe(ruta),
          headers: { authorization: `Bearer ${tokens.get(rol)}` },
          payload: {}
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
});
