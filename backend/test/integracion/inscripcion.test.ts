import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { sembrarUsuarios } from "../../src/modules/auth/auth.service.js";
import { usuariosSeed } from "../../src/modules/auth/usuarios-seed.js";
import type { Rol } from "../../src/plugins/autorizacion.js";
import { pool } from "../../src/shared/database.js";
import { migrar } from "../../src/shared/migraciones.js";
import { redis } from "../../src/shared/redis.js";

// Requiere Postgres y Redis activos (docker compose up -d --wait) y backend/.env.
const MARIA = "maria.quispe@demo.pe";
const INACTIVO = "inactivo@prueba-inscripcion.local";
const tokens = new Map<Rol, string>();
let app: FastifyInstance;
let claseId: string;

const inscribir = (email: unknown, rol: Rol = "COORDINADOR", id = claseId) =>
  app.inject({
    method: "POST",
    url: `/api/clases/${id}/inscritos`,
    headers: { authorization: `Bearer ${tokens.get(rol)}` },
    payload: { email }
  });

async function inscritos() {
  const respuesta = await app.inject({
    method: "GET",
    url: `/api/clases/${claseId}/inscritos`,
    headers: { authorization: `Bearer ${tokens.get("COORDINADOR")}` }
  });
  assert.equal(respuesta.statusCode, 200);
  return respuesta.json() as { id: string; nombre: string; email: string }[];
}

describe("Característica: Inscribir participante en clase", () => {
  before(async () => {
    await migrar(pool);
    await sembrarUsuarios();
    await pool.query(
      `insert into users (name, email, password_hash, role, active) values ('Inactivo', $1, $2, 'participante', false)
       on conflict (email) do update set active = false, role = 'participante'`,
      [INACTIVO, await bcrypt.hash("ClaveInactiva123!", 4)]
    );
    app = await buildApp();

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

  // Antecedentes: una clase activa sin inscritos.
  beforeEach(async () => {
    await pool.query("delete from classes where nombre like 'INS %'");
    const instructor = await pool.query<{ id: string }>("select id::text as id from users where email = 'carlos.mendoza@organizacion.pe'");
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/clases",
      headers: { authorization: `Bearer ${tokens.get("COORDINADOR")}` },
      payload: {
        nombre: "INS Clase de inscripción",
        instructorId: instructor.rows[0]!.id,
        fecha: "2031-05-12",
        horaInicio: "10:00",
        horaFin: "11:00",
        lugar: "Sala de pruebas"
      }
    });
    assert.equal(respuesta.statusCode, 201, respuesta.body);
    claseId = respuesta.json().id;
  });

  after(async () => {
    await pool.query("delete from classes where nombre like 'INS %'");
    await pool.query("delete from users where email = $1", [INACTIVO]);
    await app?.close();
    await pool.end();
    redis.disconnect();
  });

  test("INS-01: Dado una clase activa y María, cuando el coordinador la inscribe, entonces hay exactamente una inscripción", async () => {
    const respuesta = await inscribir(MARIA);

    assert.equal(respuesta.statusCode, 201, respuesta.body);
    assert.deepEqual(Object.keys(respuesta.json()).sort(), ["email", "id", "nombre"]);
    assert.equal(respuesta.json().email, MARIA);

    const lista = await inscritos();
    assert.equal(lista.length, 1);
    assert.equal(lista[0]?.email, MARIA);

    const clase = await app.inject({
      method: "GET",
      url: `/api/clases/${claseId}`,
      headers: { authorization: `Bearer ${tokens.get("COORDINADOR")}` }
    });
    assert.equal(clase.json().inscritos, 1);
  });

  test("INS-02: Dado María inscrita, cuando se repite, entonces 409 con el estado actual y sin duplicado", async () => {
    const primera = await inscribir(MARIA);
    const repetida = await inscribir(MARIA);

    assert.equal(repetida.statusCode, 409);
    const cuerpo = repetida.json();
    assert.equal(cuerpo.code, "YA_INSCRITO");
    // Misma forma de fecha que la interfaz: «martes 6 de octubre», sin coma.
    assert.match(cuerpo.message, /ya está inscrito\(a\) en esta clase desde el [a-záéíóúñ]+ \d{1,2} de [a-z]+ a las \d{2}:\d{2}\./);
    assert.equal(cuerpo.details.participanteId, primera.json().id);
    assert.match(cuerpo.details.inscritoEn, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
    assert.equal((await inscritos()).length, 1);
  });

  test("INS-03: Dado cinco solicitudes simultáneas para María, entonces una 201 y una sola inscripción", async () => {
    const codigos = (await Promise.all(Array.from({ length: 5 }, () => inscribir(MARIA))))
      .map((respuesta) => respuesta.statusCode)
      .sort();

    assert.deepEqual(codigos, [201, 409, 409, 409, 409]);
    assert.equal((await inscritos()).length, 1);
  });

  for (const rol of ["PARTICIPANTE", "INSTRUCTOR", "ADMIN"] as Rol[]) {
    test(`INS-04: Dado ${rol} que llama directamente al endpoint, entonces 403 y no se inscribe`, async () => {
      const respuesta = await inscribir(MARIA, rol);

      assert.equal(respuesta.statusCode, 403);
      assert.equal(respuesta.json().code, "SIN_PERMISO");
      assert.equal((await inscritos()).length, 0);
    });
  }

  for (const [caso, email] of [
    ["una persona que no existe", "nadie@prueba-inscripcion.local"],
    ["un instructor", "carlos.mendoza@organizacion.pe"],
    ["un participante inactivo", INACTIVO]
  ] as const) {
    test(`INS-05: Dado el correo de ${caso}, entonces 404 PARTICIPANTE_NO_EXISTE`, async () => {
      const respuesta = await inscribir(email);

      assert.equal(respuesta.statusCode, 404);
      assert.equal(respuesta.json().code, "PARTICIPANTE_NO_EXISTE");
      assert.equal((await inscritos()).length, 0);
    });
  }

  for (const email of ["", "   ", "no-es-correo", 42]) {
    test(`INS-06: Dado el correo ${JSON.stringify(email)}, entonces 422 con fields.email`, async () => {
      const respuesta = await inscribir(email);

      assert.equal(respuesta.statusCode, 422);
      assert.equal(respuesta.json().code, "VALIDACION");
      assert.ok(respuesta.json().fields.email);
      assert.equal((await inscritos()).length, 0);
    });
  }

  test("INS-06: Dado un correo con mayúsculas y espacios, entonces inscribe a la persona", async () => {
    const respuesta = await inscribir("  Maria.Quispe@Demo.PE ");

    assert.equal(respuesta.statusCode, 201, respuesta.body);
    assert.equal((await inscritos())[0]?.email, MARIA);
  });
});
