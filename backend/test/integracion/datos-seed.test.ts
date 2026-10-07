import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import { Pool } from "pg";
import { env } from "../../src/config/env.js";
import type { EnvSeed } from "../../src/modules/auth/usuarios-seed.js";
import { pool } from "../../src/shared/database.js";
import { migrar } from "../../src/shared/migraciones.js";
import { sembrarDatos } from "../../src/shared/seed.js";

// Cada ejecución usa su propia base temporal: nunca vacía la base de desarrollo.
const nombre = `gestioncapa_seed_${randomUUID().replaceAll("-", "")}`;
const conectar = (database: string) => new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false
});
const administracion = conectar("postgres");
const conexion = conectar(nombre);
const configuracion: EnvSeed = {
  NODE_ENV: "development",
  ADMIN_NAME: "Administrador seed",
  ADMIN_EMAIL: "admin@seed.local",
  ADMIN_PASSWORD: "ClaveSeedPrueba123!"
};
let creada = false;

async function contar() {
  const resultado = await conexion.query(
    `select (select count(*)::int from users) as usuarios,
            (select count(*)::int from classes) as clases,
            (select count(*)::int from enrollments) as inscripciones,
            (select count(*)::int from attendances) as asistencias`
  );
  return resultado.rows[0];
}

async function instantanea() {
  const resultado = await conexion.query(
    `select jsonb_build_object(
       'usuarios', (select jsonb_agg(to_jsonb(u) order by id) from users u),
       'clases', (select jsonb_agg(to_jsonb(c) order by id) from classes c),
       'inscripciones', (select jsonb_agg(to_jsonb(e) order by id) from enrollments e),
       'asistencias', (select jsonb_agg(to_jsonb(a) order by id) from attendances a)
     ) as datos`
  );
  return resultado.rows[0].datos;
}

describe("Característica: Seed completo para todos los perfiles", () => {
  before(async () => {
    await administracion.query(`create database ${nombre}`);
    creada = true;
    await migrar(conexion);
  });

  beforeEach(async () => {
    await conexion.query("truncate users restart identity cascade");
  });

  after(async () => {
    await conexion.end();
    if (creada) await administracion.query(`drop database ${nombre}`);
    await administracion.end();
    await pool.end();
  });

  test("siembra todos los roles, clases, inscripciones y asistencia con fechas de Lima", async () => {
    const resumen = await sembrarDatos(conexion, configuracion);

    assert.deepEqual(await contar(), { usuarios: 6, clases: 5, inscripciones: 9, asistencias: 1 });
    assert.deepEqual([...new Set(resumen.usuarios.map((u) => u.role))].sort(),
      ["admin", "coordinador", "instructor", "participante"]);
    assert.equal(resumen.clases, 5);
    assert.equal(resumen.inscripciones, 9);
    assert.equal(resumen.asistencias, 1);

    const sinDatos = await conexion.query(
      `select id from users u
       where (role = 'instructor' and not exists (
         select 1 from classes where instructor_id = u.id and estado = 'PROGRAMADA'
       )) or (role = 'participante' and not exists (
         select 1 from enrollments where user_id = u.id
       ))`
    );
    assert.equal(sinDatos.rowCount, 0);

    const pasada = await conexion.query(
      `select count(e.id)::int as inscritos, count(a.id)::int as presentes,
              bool_and(c.fecha = (now() at time zone 'America/Lima')::date - 1) as ayer,
              bool_and(a.timestamp_lima = c.fecha + c.hora_inicio + interval '2 minutes') as hora_correcta
       from classes c join enrollments e on e.class_id = c.id
       left join attendances a on a.class_id = e.class_id and a.user_id = e.user_id
       where c.nombre = 'Demo · Seguridad y salud en el trabajo'`
    );
    assert.deepEqual(pasada.rows[0], { inscritos: 2, presentes: 1, ayer: true, hora_correcta: true });

    const cruces = await conexion.query(
      `select 1 from classes a join classes b
       on a.id < b.id and a.instructor_id = b.instructor_id and a.fecha = b.fecha
       and a.hora_inicio < b.hora_fin and b.hora_inicio < a.hora_fin
       where a.estado = 'PROGRAMADA' and b.estado = 'PROGRAMADA'`
    );
    assert.equal(cruces.rowCount, 0);
  });

  test("repetir el seed conserva contraseñas, fechas, cancelaciones y asistencias existentes", async () => {
    await sembrarDatos(conexion, configuracion);
    await conexion.query("update users set name = 'Nombre editado', password_hash = 'hash editado' where role = 'admin'");
    await conexion.query("update classes set estado = 'CANCELADA' where nombre = 'Demo · Atención al cliente'");
    await conexion.query("update attendances set timestamp_lima = timestamp_lima + interval '5 minutes'");
    const anterior = await instantanea();

    await sembrarDatos(conexion, configuracion);

    assert.deepEqual(await instantanea(), anterior);
  });

  test("dos seeds simultáneos no duplican clases ni inscripciones", async () => {
    await Promise.all([
      sembrarDatos(conexion, configuracion),
      sembrarDatos(conexion, configuracion)
    ]);

    assert.deepEqual(await contar(), { usuarios: 6, clases: 5, inscripciones: 9, asistencias: 1 });
  });

  test("producción solo crea el administrador", async () => {
    await sembrarDatos(conexion, { ...configuracion, NODE_ENV: "production" });

    assert.deepEqual(await contar(), { usuarios: 1, clases: 0, inscripciones: 0, asistencias: 0 });
    const usuarios = await conexion.query("select role from users");
    assert.deepEqual(usuarios.rows, [{ role: "admin" }]);
  });

  test("un horario ocupado revierte todos los datos nuevos y conserva los anteriores", async () => {
    const instructor = await conexion.query<{ id: string }>(
      `insert into users (name, email, password_hash, role)
       values ('Carlos', 'carlos.mendoza@organizacion.pe', 'hash propio', 'instructor') returning id`
    );
    await conexion.query(
      `insert into classes (nombre, instructor_id, fecha, hora_inicio, hora_fin, lugar)
       values ('Clase propia', $1, (now() at time zone 'America/Lima')::date - 1,
               '10:00', '11:00', 'Sala propia')`,
      [instructor.rows[0]!.id]
    );
    const anterior = await instantanea();

    await assert.rejects(sembrarDatos(conexion, configuracion), /ya tiene una clase en ese horario/);

    assert.deepEqual(await instantanea(), anterior);
  });
});
