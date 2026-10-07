import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { sembrarUsuarios } from "../../src/modules/auth/auth.service.js";
import { emitirTokenQr } from "../../src/modules/qr/qr.token.js";
import { pool } from "../../src/shared/database.js";
import { migrar } from "../../src/shared/migraciones.js";
import { redis } from "../../src/shared/redis.js";

// Requiere Postgres y Redis activos (docker compose up -d --wait) y backend/.env.
const CUENTAS = {
  coordinadora: "ana.torres@organizacion.pe",
  carlos: "carlos.mendoza@organizacion.pe",
  maria: "maria.quispe@demo.pe",
  luz: "luz.apaza@demo.pe"
} as const;
type Cuenta = keyof typeof CUENTAS;

const sesiones = new Map<Cuenta, { token: string; id: string }>();
const clases = { principal: "", cancelada: "", lista: "" };
let app: FastifyInstance;

const llamar = (cuenta: Cuenta, method: "GET" | "POST", url: string, payload?: object) =>
  app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${sesiones.get(cuenta)!.token}` },
    ...(payload ? { payload } : {})
  });

const marcar = (cuenta: Cuenta, cuerpo: object) => llamar(cuenta, "POST", "/api/asistencia/marcar", cuerpo);
const tokenVigente = (claseId: string) => emitirTokenQr(claseId, Date.now(), env.QR_SECRET).token;

async function registros(claseId: string) {
  const resultado = await pool.query<{ user_id: string; created_by: string; timestamp_lima: string }>(
    "select user_id::text, created_by::text, timestamp_lima::text from attendances where class_id = $1",
    [claseId]
  );
  return resultado.rows;
}

async function crearClase(nombre: string, horaInicio: string, inscritas: Cuenta[]) {
  const creada = await llamar("coordinadora", "POST", "/api/clases", {
    nombre,
    instructorId: sesiones.get("carlos")!.id,
    fecha: "2031-08-04",
    horaInicio,
    horaFin: `${String(Number(horaInicio.slice(0, 2)) + 1).padStart(2, "0")}:00`,
    lugar: "Sala"
  });
  assert.equal(creada.statusCode, 201, creada.body);
  const id = creada.json().id as string;
  for (const cuenta of inscritas) {
    const inscripcion = await llamar("coordinadora", "POST", `/api/clases/${id}/inscritos`, { email: CUENTAS[cuenta] });
    assert.equal(inscripcion.statusCode, 201, inscripcion.body);
  }
  return id;
}

describe("Característica: Registrar y consultar asistencia", () => {
  before(async () => {
    await migrar(pool);
    await sembrarUsuarios();
    app = await buildApp();

    for (const [cuenta, email] of Object.entries(CUENTAS)) {
      const sesion = (await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password: "demo123" } })).json();
      sesiones.set(cuenta as Cuenta, { token: sesion.token, id: sesion.usuario.id });
    }

    await pool.query("delete from classes where nombre like 'ASI %'");
    clases.principal = await crearClase("ASI Principal", "08:00", ["maria"]);
    clases.cancelada = await crearClase("ASI Cancelada", "10:00", ["maria"]);
    clases.lista = await crearClase("ASI Lista", "12:00", ["maria", "luz"]);
    await llamar("coordinadora", "POST", `/api/clases/${clases.cancelada}/cancelar`);
  });

  beforeEach(async () => {
    await pool.query("delete from attendances where class_id = any($1)", [Object.values(clases)]);
  });

  after(async () => {
    await pool.query("delete from classes where nombre like 'ASI %'");
    await app?.close();
    await pool.end();
    redis.disconnect();
  });

  test("MAR-01: Dado un QR vigente, cuando María lo envía, entonces 201 con actor y hora de Lima", async () => {
    const respuesta = await marcar("maria", { token: tokenVigente(clases.principal), claseId: clases.principal });

    assert.equal(respuesta.statusCode, 201, respuesta.body);
    assert.deepEqual(respuesta.json().clase, { id: clases.principal, nombre: "ASI Principal" });
    assert.match(respuesta.json().horaRegistro, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
    const [registro, ...otros] = await registros(clases.principal);
    assert.equal(otros.length, 0);
    assert.equal(registro?.user_id, sesiones.get("maria")!.id);
    assert.equal(registro?.created_by, sesiones.get("maria")!.id);
    assert.ok(Math.abs(Date.parse(respuesta.json().horaRegistro) - Date.now()) < 60_000);
  });

  test("MAR-02: Dado una asistencia registrada, cuando se repite, entonces 409 con la hora y un solo registro", async () => {
    const primera = await marcar("maria", { token: tokenVigente(clases.principal) });
    const repetida = await marcar("maria", { token: tokenVigente(clases.principal) });

    assert.equal(repetida.statusCode, 409);
    assert.equal(repetida.json().code, "ASISTENCIA_YA_REGISTRADA");
    const hora = primera.json().horaRegistro.slice(11, 16);
    assert.match(repetida.json().message, new RegExp(`ya estaba registrada a las ${hora}`));
    assert.equal((await registros(clases.principal)).length, 1);
  });

  test("MAR-03: Dado cinco escaneos simultáneos, entonces un 201 y un solo registro", async () => {
    const token = tokenVigente(clases.principal);
    const codigos = (await Promise.all(Array.from({ length: 5 }, () => marcar("maria", { token }))))
      .map((r) => r.statusCode)
      .sort();

    assert.deepEqual(codigos, [201, 409, 409, 409, 409]);
    assert.equal((await registros(clases.principal)).length, 1);
  });

  const rechazos: [string, () => [Cuenta, object], number, string][] = [
    ["un cuerpo sin token", () => ["maria", {}], 422, "QR_INVALIDO"],
    ["un token con la firma alterada", () => ["maria", { token: `${tokenVigente(clases.principal).slice(0, -3)}abc` }], 422, "QR_INVALIDO"],
    ["un token vencido", () => ["maria", { token: emitirTokenQr(clases.principal, Date.now() - 30_000, env.QR_SECRET).token }], 410, "QR_EXPIRADO"],
    ["un claseId de otra clase", () => ["maria", { token: tokenVigente(clases.principal), claseId: clases.lista }], 409, "QR_OTRA_CLASE"],
    ["el token de una clase cancelada", () => ["maria", { token: tokenVigente(clases.cancelada) }], 409, "CLASE_CANCELADA"],
    ["el token enviado por Luz, no inscrita", () => ["luz", { token: tokenVigente(clases.principal) }], 403, "NO_INSCRITO"],
    ["el token de una clase inexistente", () => ["maria", { token: tokenVigente("999999") }], 404, "CLASE_NO_EXISTE"]
  ];

  for (const [caso, preparar, status, code] of rechazos) {
    test(`MAR-04: Dado ${caso}, entonces ${status} ${code} sin registrar`, async () => {
      const [cuenta, cuerpo] = preparar();
      const respuesta = await marcar(cuenta, cuerpo);

      assert.equal(respuesta.statusCode, status, respuesta.body);
      assert.equal(respuesta.json().code, code);
      assert.ok(respuesta.json().message, "mensaje en español para la interfaz");
      for (const id of Object.values(clases)) assert.equal((await registros(id)).length, 0);
    });
  }

  for (const cuenta of ["carlos", "coordinadora"] as const) {
    test(`MAR-05: Dado ${cuenta}, cuando llama a marcar, entonces 403`, async () => {
      const respuesta = await marcar(cuenta, { token: tokenVigente(clases.principal) });

      assert.equal(respuesta.statusCode, 403);
      assert.equal(respuesta.json().code, "SIN_PERMISO");
    });
  }

  test("LIS-01: Dado María presente y Luz ausente, cuando la coordinadora consulta, entonces ve el resumen", async () => {
    const marca = await marcar("maria", { token: tokenVigente(clases.lista) });
    const respuesta = await llamar("coordinadora", "GET", `/api/clases/${clases.lista}/asistencia`);

    assert.equal(respuesta.statusCode, 200, respuesta.body);
    const lista = respuesta.json();
    assert.deepEqual({ inscritos: lista.inscritos, presentes: lista.presentes, ausentes: lista.ausentes }, {
      inscritos: 2,
      presentes: 1,
      ausentes: 1
    });
    assert.deepEqual(
      lista.registros.map((r: { participante: { email: string }; estado: string; horaRegistro: string | null }) => [
        r.participante.email,
        r.estado,
        r.horaRegistro
      ]),
      [
        [CUENTAS.luz, "AUSENTE", null],
        [CUENTAS.maria, "PRESENTE", marca.json().horaRegistro]
      ]
    );
    assert.deepEqual(Object.keys(lista.registros[0].participante).sort(), ["email", "id", "nombre"]);
  });

  test("LIS-02: Dado instructor o participante, entonces 403; clase inexistente 404", async () => {
    assert.equal((await llamar("carlos", "GET", `/api/clases/${clases.lista}/asistencia`)).statusCode, 403);
    assert.equal((await llamar("maria", "GET", `/api/clases/${clases.lista}/asistencia`)).statusCode, 403);
    const inexistente = await llamar("coordinadora", "GET", "/api/clases/999999/asistencia");
    assert.equal(inexistente.statusCode, 404);
    assert.equal(inexistente.json().code, "CLASE_NO_EXISTE");
  });

  test("PAR-01: Dado María, cuando consulta sus clases, entonces ve solo las suyas con miAsistencia", async () => {
    const marca = await marcar("maria", { token: tokenVigente(clases.principal) });
    const respuesta = await llamar("maria", "GET", "/api/participante/clases");

    assert.equal(respuesta.statusCode, 200, respuesta.body);
    const propias = (respuesta.json() as { id: string; miAsistencia: string | null; estado: string }[]).filter((c) =>
      Object.values(clases).includes(c.id)
    );
    assert.deepEqual(
      propias.map((c) => [c.id, c.estado, c.miAsistencia]).sort(),
      [
        [clases.cancelada, "CANCELADA", null],
        [clases.lista, "PROGRAMADA", null],
        [clases.principal, "PROGRAMADA", marca.json().horaRegistro]
      ].sort()
    );
    assert.deepEqual(Object.keys(respuesta.json()[0]).sort(), [
      "estado",
      "fecha",
      "horaFin",
      "horaInicio",
      "id",
      "instructor",
      "lugar",
      "miAsistencia",
      "nombre"
    ]);

    const deLuz = (await llamar("luz", "GET", "/api/participante/clases")).json() as { id: string }[];
    assert.deepEqual(deLuz.filter((c) => Object.values(clases).includes(c.id)).map((c) => c.id), [clases.lista]);
  });
});
