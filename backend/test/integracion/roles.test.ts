import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { pool } from "../../src/shared/database.js";
import { migrar } from "../../src/shared/migraciones.js";
import { redis } from "../../src/shared/redis.js";

// Requiere Postgres y Redis activos (docker compose up -d --wait) y backend/.env.
const CLAVE = "ClaveDePruebaRoles123!";
const inactivo = "inactivo@prueba-roles.local";
const desactivado = "desactivado@prueba-roles.local";
let app: FastifyInstance;

async function crearUsuario(email: string, active: boolean) {
  await pool.query(
    `insert into users (name, email, password_hash, role, active)
     values ($1, $2, $3, 'participante', $4)
     on conflict (email) do update set active = excluded.active, password_hash = excluded.password_hash`,
    [email, email, await bcrypt.hash(CLAVE, 4), active]
  );
}

const login = (email: string) =>
  app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password: CLAVE } });

describe("Característica: Acceso únicamente a las opciones del rol", () => {
  before(async () => {
    await migrar(pool);
    app = await buildApp();
  });

  after(async () => {
    await pool.query("delete from users where email = any($1)", [[inactivo, desactivado]]);
    await app?.close();
    await pool.end();
    redis.disconnect();
  });

  test("ROL-03: Dado un usuario inactivo con contraseña correcta, cuando inicia sesión, entonces 403 sin token", async () => {
    await crearUsuario(inactivo, false);
    const respuesta = await login(inactivo);

    assert.equal(respuesta.statusCode, 403);
    assert.equal(respuesta.json().code, "USUARIO_INACTIVO");
    assert.equal(respuesta.json().token, undefined);
  });

  test("ROL-03: Dado un usuario inactivo, cuando la contraseña es incorrecta, entonces no revela que existe", async () => {
    await crearUsuario(inactivo, false);
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: inactivo, password: "incorrecta" }
    });

    assert.equal(respuesta.statusCode, 401);
    assert.equal(respuesta.json().code, "CREDENCIALES_INVALIDAS");
  });

  test("ROL-04: Dado un token vigente, cuando el usuario es desactivado, entonces /me responde 401", async () => {
    await crearUsuario(desactivado, true);
    const { token } = (await login(desactivado)).json();
    const me = () => app.inject({ method: "GET", url: "/api/auth/me", headers: { authorization: `Bearer ${token}` } });

    assert.equal((await me()).statusCode, 200);
    await pool.query("update users set active = false where email = $1", [desactivado]);
    const respuesta = await me();

    assert.equal(respuesta.statusCode, 401);
    assert.equal(respuesta.json().code, "NO_AUTENTICADO");
  });
});
