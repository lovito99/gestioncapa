import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { sembrarUsuarios } from "../../src/modules/auth/auth.service.js";
import { usuariosSeed } from "../../src/modules/auth/usuarios-seed.js";
import type { Rol } from "../../src/plugins/autorizacion.js";
import { ensureDatabase, pool } from "../../src/shared/database.js";
import { redis } from "../../src/shared/redis.js";

// Requiere Postgres y Redis activos (docker compose up -d --wait) y backend/.env.
// Las clases de esta prueba usan el prefijo "PRG " y una fecha lejana; se borran al empezar.
const FECHA = "2031-03-10";
const tokens = new Map<Rol, string>();
let app: FastifyInstance;
let instructorId: string;

const pedir = (rol: Rol | null, method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
  app.inject({
    method,
    url,
    headers: rol ? { authorization: `Bearer ${tokens.get(rol)}` } : {},
    ...(payload ? { payload } : {})
  });

const datos = (cambios: object = {}) => ({
  nombre: "PRG Seguridad en altura",
  instructorId,
  fecha: FECHA,
  horaInicio: "10:00",
  horaFin: "11:00",
  lugar: "Sala de pruebas",
  ...cambios
});

async function crear(cambios: object = {}) {
  const respuesta = await pedir("COORDINADOR", "POST", "/api/clases", datos(cambios));
  assert.equal(respuesta.statusCode, 201, respuesta.body);
  return respuesta.json();
}

async function contarClases() {
  const resultado = await pool.query<{ total: string }>("select count(*) as total from clases where nombre like 'PRG %'");
  return Number(resultado.rows[0]?.total);
}

describe("Característica: Programar clase presencial", () => {
  before(async () => {
    await ensureDatabase();
    await sembrarUsuarios();
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

    const instructores = (await pedir("COORDINADOR", "GET", "/api/instructores")).json();
    instructorId = instructores.find((i: { nombre: string }) => i.nombre === "Carlos Mendoza Ríos").id;
  });

  beforeEach(async () => {
    await pool.query("delete from clases where nombre like 'PRG %'");
  });

  after(async () => {
    await pool.query("delete from clases where nombre like 'PRG %'");
    await app?.close();
    await pool.end();
    redis.disconnect();
  });

  test("PRG-01: GET /api/instructores lista los instructores activos con id texto", async () => {
    const respuesta = await pedir("COORDINADOR", "GET", "/api/instructores");

    assert.equal(respuesta.statusCode, 200);
    assert.equal(typeof instructorId, "string");
  });

  test("PRG-01: Dado campos válidos, cuando el coordinador guarda, entonces se persiste y aparece en la lista", async () => {
    const respuesta = await pedir("COORDINADOR", "POST", "/api/clases", datos());

    assert.equal(respuesta.statusCode, 201, respuesta.body);
    const clase = respuesta.json();
    assert.deepEqual(clase, {
      id: clase.id,
      nombre: "PRG Seguridad en altura",
      instructor: { id: instructorId, nombre: "Carlos Mendoza Ríos" },
      fecha: FECHA,
      horaInicio: "10:00",
      horaFin: "11:00",
      lugar: "Sala de pruebas",
      inscritos: 0,
      estado: "PROGRAMADA"
    });
    assert.equal(typeof clase.id, "string");

    const lista = (await pedir("COORDINADOR", "GET", "/api/clases")).json();
    assert.deepEqual(lista.find((c: { id: string }) => c.id === clase.id), clase);
    assert.deepEqual((await pedir("COORDINADOR", "GET", `/api/clases/${clase.id}`)).json(), clase);
  });

  for (const campo of ["fecha", "instructorId"]) {
    test(`PRG-02: Dado ${campo} faltante, cuando se envía, entonces 422 en español y no se crea`, async () => {
      const { [campo]: _omitido, ...sinCampo } = datos() as Record<string, string>;
      const respuesta = await pedir("COORDINADOR", "POST", "/api/clases", sinCampo);

      assert.equal(respuesta.statusCode, 422);
      assert.equal(respuesta.json().code, "VALIDACION");
      assert.match(respuesta.json().message, /campos obligatorios/);
      assert.ok(respuesta.json().fields[campo]);
      assert.equal(await contarClases(), 0);
    });
  }

  test("PRG-04: Dado un instructorId que no es instructor, entonces 422 y no se crea", async () => {
    const respuesta = await pedir("COORDINADOR", "POST", "/api/clases", datos({ instructorId: "999999" }));

    assert.equal(respuesta.statusCode, 422);
    assert.equal(respuesta.json().fields.instructorId, "El instructor seleccionado no existe");
    assert.equal(await contarClases(), 0);
  });

  test("PRG-05: Dado un cruce de horario, entonces 409; contiguo se acepta; cancelada no cuenta", async () => {
    const existente = await crear({ nombre: "PRG Existente" });
    const cruce = await pedir("COORDINADOR", "POST", "/api/clases", datos({ horaInicio: "10:30", horaFin: "11:30" }));

    assert.equal(cruce.statusCode, 409);
    assert.equal(cruce.json().code, "CONFLICTO_HORARIO");
    assert.equal(cruce.json().details.claseId, existente.id);
    assert.match(cruce.json().message, /PRG Existente/);
    assert.match(cruce.json().message, /el lunes 10 de marzo de 10:00 a 11:00/);

    await crear({ horaInicio: "11:00", horaFin: "12:00" });

    const sinCambios = await pedir("COORDINADOR", "PUT", `/api/clases/${existente.id}`, datos({ nombre: "PRG Existente" }));
    assert.equal(sinCambios.statusCode, 200, sinCambios.body);

    await pedir("COORDINADOR", "POST", `/api/clases/${existente.id}/cancelar`);
    await crear({ nombre: "PRG Reemplazo", horaInicio: "10:00", horaFin: "11:00" });
  });

  test("PRG-06: Dado una clase programada, cuando se edita el lugar, entonces se guarda; inexistente 404", async () => {
    const clase = await crear();
    const respuesta = await pedir("COORDINADOR", "PUT", `/api/clases/${clase.id}`, datos({ lugar: "Sala actualizada" }));

    assert.equal(respuesta.statusCode, 200);
    assert.equal(respuesta.json().lugar, "Sala actualizada");

    for (const id of ["999999", "abc"]) {
      const inexistente = await pedir("COORDINADOR", "PUT", `/api/clases/${id}`, datos());
      assert.equal(inexistente.statusCode, 404);
      assert.equal(inexistente.json().code, "CLASE_NO_EXISTE");
    }
  });

  test("PRG-07: Dado una clase activa, cuando se cancela, entonces queda CANCELADA y no se edita ni recancela", async () => {
    const clase = await crear();
    const respuesta = await pedir("COORDINADOR", "POST", `/api/clases/${clase.id}/cancelar`);

    assert.equal(respuesta.statusCode, 200);
    assert.equal(respuesta.json().estado, "CANCELADA");

    const otraVez = await pedir("COORDINADOR", "POST", `/api/clases/${clase.id}/cancelar`);
    assert.equal(otraVez.statusCode, 409);
    assert.equal(otraVez.json().code, "CLASE_CANCELADA");

    const editar = await pedir("COORDINADOR", "PUT", `/api/clases/${clase.id}`, datos({ lugar: "Otra" }));
    assert.equal(editar.statusCode, 409);
    assert.equal(editar.json().code, "CLASE_CANCELADA");
  });

  test("PRG-08: Dado una clase cancelada, entonces no admite inscripciones ni QR", async () => {
    const programada = await crear();
    const inscrita = await pedir("COORDINADOR", "POST", `/api/clases/${programada.id}/inscritos`, {
      email: "maria.quispe@demo.pe"
    });
    assert.equal(inscrita.statusCode, 201, inscrita.body);
    assert.equal((await pedir("COORDINADOR", "GET", `/api/clases/${programada.id}`)).json().inscritos, 1);

    await pedir("COORDINADOR", "POST", `/api/clases/${programada.id}/cancelar`);
    const inscripcion = await pedir("COORDINADOR", "POST", `/api/clases/${programada.id}/inscritos`, {
      email: "luz.apaza@demo.pe"
    });
    assert.equal(inscripcion.statusCode, 409);
    assert.equal(inscripcion.json().code, "CLASE_CANCELADA");

    const qr = await pedir("INSTRUCTOR", "GET", `/api/clases/${programada.id}/qr`);
    assert.equal(qr.statusCode, 409);
    assert.equal(qr.json().code, "CLASE_CANCELADA");
  });

  for (const rol of ["INSTRUCTOR", "PARTICIPANTE", "ADMIN"] as Rol[]) {
    test(`PRG-09: Dado ${rol}, cuando intenta crear, editar o cancelar, entonces 403 sin modificar nada`, async () => {
      const clase = await crear();
      const antes = await contarClases();

      const crearRespuesta = await pedir(rol, "POST", "/api/clases", datos({ nombre: "PRG No autorizada" }));
      const editarRespuesta = await pedir(rol, "PUT", `/api/clases/${clase.id}`, datos({ lugar: "Hackeada" }));
      const cancelarRespuesta = await pedir(rol, "POST", `/api/clases/${clase.id}/cancelar`);

      for (const respuesta of [crearRespuesta, editarRespuesta, cancelarRespuesta]) {
        assert.equal(respuesta.statusCode, 403);
        assert.equal(respuesta.json().code, "SIN_PERMISO");
      }
      assert.equal(await contarClases(), antes);
      const actual = (await pedir("COORDINADOR", "GET", `/api/clases/${clase.id}`)).json();
      assert.equal(actual.estado, "PROGRAMADA");
      assert.equal(actual.lugar, "Sala de pruebas");
    });
  }
});
