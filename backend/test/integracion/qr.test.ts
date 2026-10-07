import assert from "node:assert/strict";
import { after, afterEach, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { sembrarUsuarios } from "../../src/modules/auth/auth.service.js";
import { reloj, verificarTokenQr } from "../../src/modules/qr/qr.token.js";
import { pool } from "../../src/shared/database.js";
import { migrar } from "../../src/shared/migraciones.js";
import { redis } from "../../src/shared/redis.js";

// Requiere Postgres y Redis activos (docker compose up -d --wait) y backend/.env.
const CUENTAS = {
  coordinadora: "ana.torres@organizacion.pe",
  carlos: "carlos.mendoza@organizacion.pe",
  lucia: "lucia.paredes@organizacion.pe",
  participante: "maria.quispe@demo.pe"
} as const;
type Cuenta = keyof typeof CUENTAS | "admin";

const tokens = new Map<Cuenta, string>();
const ids = { carlos: "", lucia: "" };
const clases = { deCarlos: "", cancelada: "", deLucia: "" };
const relojReal = reloj.ahora;
let app: FastifyInstance;

const pedir = (cuenta: Cuenta, url: string) =>
  app.inject({ method: "GET", url, headers: { authorization: `Bearer ${tokens.get(cuenta)}` } });

async function crearClase(instructorId: string, nombre: string, horaInicio: string) {
  const respuesta = await app.inject({
    method: "POST",
    url: "/api/clases",
    headers: { authorization: `Bearer ${tokens.get("coordinadora")}` },
    payload: { nombre, instructorId, fecha: "2031-07-01", horaInicio, horaFin: `${Number(horaInicio.slice(0, 2)) + 1}:00`, lugar: "Sala" }
  });
  assert.equal(respuesta.statusCode, 201, respuesta.body);
  return respuesta.json().id as string;
}

describe("Característica: QR temporal rotatorio", () => {
  before(async () => {
    await migrar(pool);
    await sembrarUsuarios();
    app = await buildApp();

    const entrar = async (email: string, password = "demo123") =>
      (await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } })).json();
    for (const [cuenta, email] of Object.entries(CUENTAS)) {
      const sesion = await entrar(email);
      tokens.set(cuenta as Cuenta, sesion.token);
      if (cuenta === "carlos" || cuenta === "lucia") ids[cuenta] = sesion.usuario.id;
    }
    tokens.set("admin", (await entrar(env.ADMIN_EMAIL, env.ADMIN_PASSWORD)).token);

    await pool.query("delete from classes where nombre like 'QR %'");
    clases.deCarlos = await crearClase(ids.carlos, "QR Clase de Carlos", "10:00");
    clases.cancelada = await crearClase(ids.carlos, "QR Clase cancelada", "12:00");
    clases.deLucia = await crearClase(ids.lucia, "QR Clase de Lucía", "10:00");
    await app.inject({
      method: "POST",
      url: `/api/clases/${clases.cancelada}/cancelar`,
      headers: { authorization: `Bearer ${tokens.get("coordinadora")}` }
    });
  });

  afterEach(() => {
    reloj.ahora = relojReal;
  });

  after(async () => {
    await pool.query("delete from classes where nombre like 'QR %'");
    await app?.close();
    await pool.end();
    redis.disconnect();
  });

  test("QR-01: Dado Carlos asignado a una clase activa, cuando pide el QR, entonces recibe un token firmado de 30 s", async () => {
    const respuesta = await pedir("carlos", `/api/clases/${clases.deCarlos}/qr`);

    assert.equal(respuesta.statusCode, 200, respuesta.body);
    const qr = respuesta.json();
    assert.deepEqual(Object.keys(qr).sort(), ["duracionSegundos", "expiraEn", "servidorAhora", "token"]);
    assert.equal(qr.duracionSegundos, 30);
    const restante = Date.parse(qr.expiraEn) - Date.parse(qr.servidorAhora);
    assert.ok(restante > 0 && restante <= 30_000, `restan ${restante} ms`);
    assert.deepEqual(verificarTokenQr(qr.token, Date.parse(qr.servidorAhora), env.QR_SECRET), {
      ok: true,
      claseId: clases.deCarlos
    });
  });

  test("QR-03: Dado el QR de una ventana, cuando pasan 30 s, entonces el anterior expira y solo el nuevo vale", async () => {
    const inicio = Date.UTC(2031, 6, 1, 15, 0, 0);
    reloj.ahora = () => inicio + 1_000;
    const anterior = (await pedir("carlos", `/api/clases/${clases.deCarlos}/qr`)).json();
    reloj.ahora = () => inicio + 29_000;
    const mismaVentana = (await pedir("carlos", `/api/clases/${clases.deCarlos}/qr`)).json();

    assert.equal(mismaVentana.token, anterior.token);
    assert.equal(anterior.expiraEn, new Date(inicio + 30_000).toISOString());

    reloj.ahora = () => inicio + 30_000;
    const nuevo = (await pedir("carlos", `/api/clases/${clases.deCarlos}/qr`)).json();

    assert.notEqual(nuevo.token, anterior.token);
    assert.deepEqual(verificarTokenQr(anterior.token, inicio + 30_000, env.QR_SECRET), { ok: false, motivo: "EXPIRADO" });
    assert.deepEqual(verificarTokenQr(nuevo.token, inicio + 30_000, env.QR_SECRET), { ok: true, claseId: clases.deCarlos });
  });

  test("QR-04: Dado Lucía, cuando pide el QR de la clase de Carlos, entonces 403", async () => {
    const respuesta = await pedir("lucia", `/api/clases/${clases.deCarlos}/qr`);

    assert.equal(respuesta.statusCode, 403);
    assert.equal(respuesta.json().code, "SIN_PERMISO");
    assert.match(respuesta.json().message, /no está asignada a ti/);
    assert.equal((await pedir("lucia", `/api/clases/${clases.deLucia}/qr`)).statusCode, 200);
  });

  for (const cuenta of ["coordinadora", "participante", "admin"] as const) {
    test(`QR-04: Dado ${cuenta}, cuando pide un QR, entonces 403`, async () => {
      assert.equal((await pedir(cuenta, `/api/clases/${clases.deCarlos}/qr`)).statusCode, 403);
    });
  }

  test("QR-04: Dado una clase cancelada o inexistente, entonces 409 o 404", async () => {
    const cancelada = await pedir("carlos", `/api/clases/${clases.cancelada}/qr`);
    assert.equal(cancelada.statusCode, 409);
    assert.equal(cancelada.json().code, "CLASE_CANCELADA");
    assert.equal((await pedir("carlos", "/api/clases/999999/qr")).statusCode, 404);
  });

  test("QR-06: Dado Carlos, cuando pide sus clases, entonces solo ve las suyas programadas", async () => {
    const respuesta = await pedir("carlos", "/api/instructor/clases");

    assert.equal(respuesta.statusCode, 200, respuesta.body);
    const propias = (respuesta.json() as { id: string; instructor: { id: string }; estado: string }[]).filter((c) =>
      Object.values(clases).includes(c.id)
    );
    assert.deepEqual(propias.map((c) => c.id), [clases.deCarlos]);
    assert.ok(respuesta.json().every((c: { instructor: { id: string }; estado: string }) => c.instructor.id === ids.carlos && c.estado === "PROGRAMADA"));
  });
});
