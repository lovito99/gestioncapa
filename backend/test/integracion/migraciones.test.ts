import assert from "node:assert/strict";
import { cp, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { env } from "../../src/config/env.js";
import { CARPETA_MIGRACIONES, migrar, verificarMigraciones } from "../../src/shared/migraciones.js";

// Requiere Postgres activo (docker compose up -d --wait) y un usuario con permiso
// para crear bases. Cada escenario usa una base temporal propia y la borra al final.
const conexion = (database: string) =>
  new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : false
  });

const administracion = conexion("postgres");
const temporales: { nombre: string; pool: Pool }[] = [];

async function baseTemporal(sufijo: string) {
  const nombre = `gestioncapa_prueba_migraciones_${sufijo}`;
  await administracion.query(`drop database if exists ${nombre} with (force)`);
  await administracion.query(`create database ${nombre}`);
  const pool = conexion(nombre);
  temporales.push({ nombre, pool });
  return pool;
}

const totalArchivos = async () => (await readdir(fileURLToPath(CARPETA_MIGRACIONES))).filter((f) => f.endsWith(".sql")).length;

async function codigoDeError(consulta: Promise<unknown>) {
  try {
    await consulta;
  } catch (error) {
    return (error as { code?: string }).code;
  }
  assert.fail("Postgres debía rechazar la consulta");
}

/** Datos mínimos: un instructor, un participante y una clase. */
async function sembrar(pool: Pool) {
  const usuarios = await pool.query<{ id: string }>(
    `insert into users (name, email, password_hash, role) values
       ('Instructor', 'instructor@bd.local', 'x', 'instructor'),
       ('Participante', 'participante@bd.local', 'x', 'participante')
     returning id`
  );
  const [instructor, participante] = usuarios.rows.map((fila) => fila.id);
  const clase = await pool.query<{ id: string }>(
    `insert into classes (nombre, instructor_id, fecha, hora_inicio, hora_fin, lugar)
     values ('Clase BD', $1, '2031-01-10', '10:00', '11:00', 'Sala') returning id`,
    [instructor]
  );
  return { instructor: instructor!, participante: participante!, clase: clase.rows[0]!.id };
}

// Esquema creado por ensureDatabase() antes de T-07, con datos.
const ESQUEMA_ANTERIOR = `
  create table users (
    id bigserial primary key, name varchar(120) not null, email varchar(180) not null unique,
    password_hash text not null, role varchar(40) not null default 'admin',
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  );
  alter table users add column if not exists active boolean not null default true;
  create table clases (
    id bigserial primary key, nombre varchar(160) not null, instructor_id bigint not null references users(id),
    fecha date not null, hora_inicio time not null, hora_fin time not null, lugar varchar(160) not null,
    estado varchar(20) not null default 'PROGRAMADA' check (estado in ('PROGRAMADA', 'CANCELADA')),
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    check (hora_fin > hora_inicio)
  );
  create index clases_instructor_fecha_idx on clases (instructor_id, fecha);
  create table inscripciones (
    clase_id bigint not null references clases(id) on delete cascade,
    participante_id bigint not null references users(id),
    created_at timestamptz not null default now(),
    primary key (clase_id, participante_id)
  );
  insert into users (id, name, email, password_hash, role) values
    (10, 'Carlos', 'carlos@bd.local', 'x', 'instructor'), (11, 'María', 'maria@bd.local', 'x', 'participante');
  select setval('users_id_seq', 11);
  insert into clases (id, nombre, instructor_id, fecha, hora_inicio, hora_fin, lugar, estado) values
    (7, 'Clase antigua', 10, '2030-05-01', '09:00', '10:00', 'Sala A', 'PROGRAMADA'),
    (8, 'Clase cancelada', 10, '2030-05-02', '09:00', '10:00', 'Sala B', 'CANCELADA');
  select setval('clases_id_seq', 8);
  insert into inscripciones (clase_id, participante_id) values (7, 11);
`;

describe("Característica: Base de datos versionada del Sprint 1", () => {
  after(async () => {
    for (const { nombre, pool } of temporales) {
      await pool.end();
      await administracion.query(`drop database if exists ${nombre} with (force)`);
    }
    await administracion.end();
  });

  test("BD-01: Dado una base vacía, cuando se migra, entonces aplica todo en orden y luego nada", async () => {
    const pool = await baseTemporal("vacia");
    const aplicadas = await migrar(pool);

    assert.equal(aplicadas.length, await totalArchivos());
    assert.deepEqual(aplicadas, [...aplicadas].sort());
    const registradas = await pool.query("select version, nombre, checksum, aplicada_en from schema_migrations order by version");
    assert.deepEqual(registradas.rows.map((fila) => fila.nombre), aplicadas);
    assert.deepEqual(await migrar(pool), []);
  });

  test("BD-02: Dado la base migrada, entonces existen las tablas y columnas con organization_id obligatorio", async () => {
    const pool = await baseTemporal("columnas");
    await migrar(pool);
    const columnas = await pool.query<{ table_name: string; column_name: string; is_nullable: string; column_default: string | null }>(
      `select table_name, column_name, is_nullable, column_default from information_schema.columns
       where table_schema = 'public' and table_name in ('users', 'classes', 'enrollments', 'attendances')`
    );
    const de = (tabla: string) => columnas.rows.filter((c) => c.table_name === tabla).map((c) => c.column_name);

    for (const columna of ["fecha", "hora_inicio", "hora_fin", "lugar", "instructor_id", "organization_id"]) {
      assert.ok(de("classes").includes(columna), `classes.${columna}`);
    }
    for (const columna of ["class_id", "user_id", "organization_id"]) {
      assert.ok(de("enrollments").includes(columna), `enrollments.${columna}`);
    }
    for (const columna of ["class_id", "user_id", "timestamp_lima", "created_by", "organization_id"]) {
      assert.ok(de("attendances").includes(columna), `attendances.${columna}`);
    }

    for (const tabla of ["users", "classes", "enrollments", "attendances"]) {
      const organizacion = columnas.rows.find((c) => c.table_name === tabla && c.column_name === "organization_id");
      assert.equal(organizacion?.is_nullable, "NO", `${tabla}.organization_id obligatorio`);
      assert.match(organizacion?.column_default ?? "", /^1\b/, `${tabla}.organization_id por defecto 1`);
    }

    const demo = await pool.query("select id::int, name from organizations");
    assert.deepEqual(demo.rows, [{ id: 1, name: "Organización demo" }]);
  });

  test("BD-03: Dado una inscripción, cuando se repite por SQL, entonces Postgres la rechaza (23505)", async () => {
    const pool = await baseTemporal("inscripciones");
    await migrar(pool);
    const { participante, clase } = await sembrar(pool);
    const inscribir = () => pool.query("insert into enrollments (class_id, user_id) values ($1, $2)", [clase, participante]);

    await inscribir();
    assert.equal(await codigoDeError(inscribir()), "23505");
  });

  test("BD-04: Dado una asistencia, cuando se repite o el usuario no está inscrito, entonces Postgres la rechaza", async () => {
    const pool = await baseTemporal("asistencias");
    await migrar(pool);
    const { instructor, participante, clase } = await sembrar(pool);
    const registrar = (usuario: string) =>
      pool.query("insert into attendances (class_id, user_id, created_by) values ($1, $2, $2)", [clase, usuario]);

    assert.equal(await codigoDeError(registrar(participante)), "23503");
    await pool.query("insert into enrollments (class_id, user_id) values ($1, $2)", [clase, participante]);
    await registrar(participante);
    assert.equal(await codigoDeError(registrar(participante)), "23505");
    assert.equal(await codigoDeError(registrar(instructor)), "23503");

    const hora = await pool.query<{ diferencia: number }>(
      `select abs(extract(epoch from (timestamp_lima - (now() at time zone 'America/Lima'))))::int as diferencia
       from attendances`
    );
    assert.ok(hora.rows[0]!.diferencia < 60, "timestamp_lima es la hora local de Lima");
  });

  test("BD-05: Dado la base migrada, entonces existen los índices y UNIQUE del modelo", async () => {
    const pool = await baseTemporal("indices");
    await migrar(pool);
    const indices = (await pool.query<{ indexname: string }>("select indexname from pg_indexes where schemaname = 'public'")).rows.map(
      (fila) => fila.indexname
    );

    for (const indice of [
      "users_email_key",
      "users_organization_idx",
      "classes_instructor_fecha_idx",
      "classes_organization_fecha_idx",
      "enrollments_class_user_key",
      "enrollments_user_idx",
      "attendances_class_user_key",
      "attendances_user_idx"
    ]) {
      assert.ok(indices.includes(indice), `falta el índice ${indice}`);
    }
  });

  test("BD-06: Dado una base anterior a T-07 con datos, cuando se migra, entonces los conserva", async () => {
    const pool = await baseTemporal("anterior");
    await pool.query(ESQUEMA_ANTERIOR);
    await migrar(pool);

    const clases = await pool.query("select id::int, nombre, estado, organization_id::int from classes order by id");
    assert.deepEqual(clases.rows, [
      { id: 7, nombre: "Clase antigua", estado: "PROGRAMADA", organization_id: 1 },
      { id: 8, nombre: "Clase cancelada", estado: "CANCELADA", organization_id: 1 }
    ]);
    const inscripciones = await pool.query("select class_id::int, user_id::int from enrollments");
    assert.deepEqual(inscripciones.rows, [{ class_id: 7, user_id: 11 }]);

    const antiguas = await pool.query("select to_regclass('public.clases') as clases, to_regclass('public.inscripciones') as inscripciones");
    assert.deepEqual(antiguas.rows[0], { clases: null, inscripciones: null });

    const nueva = await pool.query<{ id: string }>(
      `insert into classes (nombre, instructor_id, fecha, hora_inicio, hora_fin, lugar)
       values ('Nueva', 10, '2030-06-01', '10:00', '11:00', 'Sala') returning id`
    );
    assert.ok(Number(nueva.rows[0]!.id) > 8);
  });

  test("BD-07: Dado una migración aplicada que cambió, cuando se migra, entonces falla y no aplica nada", async () => {
    const pool = await baseTemporal("modificada");
    const carpeta = await mkdtemp(join(tmpdir(), "gestioncapa-migraciones-"));

    try {
      await cp(fileURLToPath(CARPETA_MIGRACIONES), carpeta, { recursive: true });
      await migrar(pool, carpeta);
      await writeFile(join(carpeta, "0001_usuarios.sql"), "-- editada\nselect 1;\n");
      await writeFile(join(carpeta, "9999_nueva.sql"), "create table no_debe_existir (id int);\n");

      await assert.rejects(migrar(pool, carpeta), /0001_usuarios\.sql/);
      const nueva = await pool.query("select to_regclass('public.no_debe_existir') as tabla");
      assert.equal(nueva.rows[0].tabla, null);
    } finally {
      await rm(carpeta, { recursive: true, force: true });
    }
  });

  test("BD-09: Dado dos migraciones simultáneas, entonces cada archivo se aplica una sola vez", async () => {
    const pool = await baseTemporal("simultanea");
    const otro = conexion("gestioncapa_prueba_migraciones_simultanea");

    try {
      const [primero, segundo] = await Promise.all([migrar(pool), migrar(otro)]);

      assert.equal(primero.length + segundo.length, await totalArchivos());
      const registradas = await pool.query("select count(*)::int as total from schema_migrations");
      assert.equal(registradas.rows[0].total, await totalArchivos());
    } finally {
      await otro.end();
    }
  });

  test("BD-10: Dado migraciones pendientes, cuando se verifica al arrancar, entonces pide npm run migrate", async () => {
    const pool = await baseTemporal("pendientes");

    await assert.rejects(verificarMigraciones(pool), (error: Error) => {
      assert.match(error.message, /0001_usuarios\.sql/);
      assert.match(error.message, /npm run migrate/);
      return true;
    });
    await migrar(pool);
    await verificarMigraciones(pool);
  });
});
