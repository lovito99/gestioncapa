import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { sembrarUsuarios } from "../../src/modules/auth/auth.service.js";
import { usuariosSeed } from "../../src/modules/auth/usuarios-seed.js";
import { ensureDatabase, pool } from "../../src/shared/database.js";
import { redis } from "../../src/shared/redis.js";

// Requiere Postgres y Redis activos (docker compose up -d --wait) y backend/.env.
const usuarios = usuariosSeed(env);
let app: FastifyInstance;

describe("Característica: Entorno local reproducible", () => {
  before(async () => {
    await ensureDatabase();
    await sembrarUsuarios();
    app = await buildApp();
  });

  after(async () => {
    await app?.close();
    await pool.end();
    redis.disconnect();
  });

  for (const usuario of usuarios) {
    test(`AMB-02: Dado el seed, cuando ${usuario.role} ${usuario.email} inicia sesión, entonces recibe su rol`, async () => {
      const respuesta = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: usuario.email, password: usuario.password }
      });

      assert.equal(respuesta.statusCode, 200, respuesta.body);
      assert.equal(respuesta.json().usuario.rol, usuario.role.toUpperCase());
    });
  }

  test("AMB-03: Dado que el seed ya se ejecutó, cuando se ejecuta otra vez, entonces no duplica usuarios", async () => {
    await sembrarUsuarios();
    const correos = usuarios.map((u) => u.email);
    const resultado = await pool.query<{ total: string }>(
      "select count(*) as total from users where email = any($1)",
      [correos]
    );

    assert.equal(Number(resultado.rows[0]?.total), correos.length);
  });
});
