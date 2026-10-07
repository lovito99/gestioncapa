import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { sembrarUsuarios } from "../../src/modules/auth/auth.service.js";
import { ensureDatabase, pool } from "../../src/shared/database.js";
import { redis } from "../../src/shared/redis.js";

// Requiere Postgres y Redis activos (docker compose up -d --wait) y backend/.env.
// Usa clases con prefijo "SOL " en una fecha lejana; se borran antes de cada escenario.
const DIA = "2031-04-07";
const DIA_SIGUIENTE = "2031-04-08";
let app: FastifyInstance;
let token: string;
let carlos: string;
let lucia: string;

const enviar = (method: "POST" | "PUT", url: string, payload: object) =>
  app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload });

const clase = (cambios: object = {}) => ({
  nombre: "SOL Clase nueva",
  instructorId: carlos,
  fecha: DIA,
  horaInicio: "10:30",
  horaFin: "11:30",
  lugar: "Sala de pruebas",
  ...cambios
});

async function crear(cambios: object = {}) {
  const respuesta = await enviar("POST", "/api/clases", clase(cambios));
  assert.equal(respuesta.statusCode, 201, respuesta.body);
  return respuesta.json();
}

async function contar() {
  const resultado = await pool.query<{ total: string }>("select count(*) as total from clases where nombre like 'SOL %'");
  return Number(resultado.rows[0]?.total);
}

let existente: { id: string };

describe("Característica: Evitar solapamiento de instructor", () => {
  before(async () => {
    await ensureDatabase();
    await sembrarUsuarios();
    app = await buildApp();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "ana.torres@organizacion.pe", password: "demo123" }
    });
    token = login.json().token;

    const instructores: { id: string; nombre: string }[] = (
      await app.inject({ method: "GET", url: "/api/instructores", headers: { authorization: `Bearer ${token}` } })
    ).json();
    carlos = instructores.find((i) => i.nombre === "Carlos Mendoza Ríos")!.id;
    lucia = instructores.find((i) => i.nombre === "Lucía Paredes Quispe")?.id ?? "";
  });

  // Antecedentes: Carlos tiene una clase el DIA de 10:00 a 11:00.
  beforeEach(async () => {
    await pool.query("delete from clases where nombre like 'SOL %'");
    existente = await crear({ nombre: "SOL Existente", horaInicio: "10:00", horaFin: "11:00" });
  });

  after(async () => {
    await pool.query("delete from clases where nombre like 'SOL %'");
    await app?.close();
    await pool.end();
    redis.disconnect();
  });

  test("SOL-01: Dado Carlos de 10:00 a 11:00, cuando se le asigna 10:30–11:30, entonces 409 y no se crea", async () => {
    const respuesta = await enviar("POST", "/api/clases", clase());

    assert.equal(respuesta.statusCode, 409);
    assert.equal(respuesta.json().code, "CONFLICTO_HORARIO");
    assert.equal(respuesta.json().details.claseId, existente.id);
    assert.match(respuesta.json().message, /Carlos Mendoza Ríos/);
    assert.match(respuesta.json().message, /«SOL Existente»/);
    assert.match(respuesta.json().message, /de 10:00 a 11:00/);
    assert.equal(await contar(), 1);
  });

  test("SOL-02: Dado la misma solicitud con otra instructora, cuando se guarda, entonces se acepta", async () => {
    assert.ok(lucia, "Lucía Paredes Quispe debe existir como instructora del seed");
    await crear({ instructorId: lucia });

    assert.equal(await contar(), 2);
  });

  test("SOL-03: Dado una clase que empieza o termina justo en el borde, entonces se acepta", async () => {
    await crear({ horaInicio: "11:00", horaFin: "12:00" });
    await crear({ horaInicio: "09:00", horaFin: "10:00" });

    assert.equal(await contar(), 3);
  });

  for (const [inicio, fin, caso] of [
    ["10:00", "11:00", "mismo horario"],
    ["09:00", "12:00", "la nueva contiene a la otra"],
    ["10:15", "10:45", "la nueva está dentro"],
    ["09:30", "10:30", "cruce por el inicio"]
  ] as const) {
    test(`SOL-04: Dado ${caso} (${inicio}–${fin}), entonces 409`, async () => {
      const respuesta = await enviar("POST", "/api/clases", clase({ horaInicio: inicio, horaFin: fin }));

      assert.equal(respuesta.statusCode, 409);
      assert.equal(respuesta.json().code, "CONFLICTO_HORARIO");
      assert.equal(await contar(), 1);
    });
  }

  test("SOL-05: Dado el mismo horario en otro día, entonces se acepta", async () => {
    await crear({ fecha: DIA_SIGUIENTE, horaInicio: "10:00", horaFin: "11:00" });

    assert.equal(await contar(), 2);
  });

  test("SOL-06: Dado editar hasta cruzarse, entonces 409 y conserva su horario; con otra instructora se acepta", async () => {
    const otra = await crear({ nombre: "SOL Otra", horaInicio: "12:00", horaFin: "13:00" });
    const cruce = await enviar("PUT", `/api/clases/${otra.id}`, clase({ nombre: "SOL Otra" }));

    assert.equal(cruce.statusCode, 409);
    const actual = await pool.query<{ inicio: string; fin: string }>(
      "select to_char(hora_inicio, 'HH24:MI') as inicio, to_char(hora_fin, 'HH24:MI') as fin from clases where id = $1",
      [otra.id]
    );
    assert.deepEqual(actual.rows[0], { inicio: "12:00", fin: "13:00" });

    assert.ok(lucia, "Lucía Paredes Quispe debe existir como instructora del seed");
    const conLucia = await enviar("PUT", `/api/clases/${otra.id}`, clase({ nombre: "SOL Otra", instructorId: lucia }));
    assert.equal(conLucia.statusCode, 200, conLucia.body);
  });

  test("SOL-07: Dado dos solicitudes simultáneas que se cruzan, entonces exactamente una se acepta", async () => {
    await pool.query("delete from clases where nombre like 'SOL %'");
    const solicitudes = Array.from({ length: 5 }, (_, indice) =>
      enviar("POST", "/api/clases", clase({ nombre: `SOL Simultánea ${indice}`, horaInicio: "14:00", horaFin: "15:00" }))
    );
    const codigos = (await Promise.all(solicitudes)).map((respuesta) => respuesta.statusCode).sort();

    assert.deepEqual(codigos, [201, 409, 409, 409, 409]);
    assert.equal(await contar(), 1);
  });
});
