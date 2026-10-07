import type { PoolClient } from "pg";
import { pool } from "../../shared/database.js";
import type { DatosClase } from "./clases.validacion.js";

export type EstadoClase = "PROGRAMADA" | "CANCELADA";

/** Forma del contrato (docs/API.md): ids como texto, fecha y horas de Lima. */
export type Clase = {
  id: string;
  nombre: string;
  instructor: { id: string; nombre: string };
  fecha: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  inscritos: number;
  estado: EstadoClase;
};

type FilaClase = {
  id: string;
  nombre: string;
  instructor_id: string;
  instructor_nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  inscritos: number;
  estado: EstadoClase;
};

type Consultor = Pick<PoolClient, "query">;

// to_char evita que pg convierta date/time a Date con la zona del proceso.
const SELECT_CLASE = `
  select c.id::text as id, c.nombre, u.id::text as instructor_id, u.name as instructor_nombre,
         to_char(c.fecha, 'YYYY-MM-DD') as fecha,
         to_char(c.hora_inicio, 'HH24:MI') as hora_inicio,
         to_char(c.hora_fin, 'HH24:MI') as hora_fin,
         c.lugar, c.estado,
         (select count(*)::int from enrollments e where e.class_id = c.id) as inscritos
  from classes c
  join users u on u.id = c.instructor_id
`;

const aClase = (fila: FilaClase): Clase => ({
  id: fila.id,
  nombre: fila.nombre,
  instructor: { id: fila.instructor_id, nombre: fila.instructor_nombre },
  fecha: fila.fecha,
  horaInicio: fila.hora_inicio,
  horaFin: fila.hora_fin,
  lugar: fila.lugar,
  inscritos: fila.inscritos,
  estado: fila.estado
});

export async function listarClases() {
  const resultado = await pool.query<FilaClase>(`${SELECT_CLASE} order by c.fecha, c.hora_inicio, c.id`);
  return resultado.rows.map(aClase);
}

export async function obtenerClase(id: number, consultor: Consultor = pool) {
  const resultado = await consultor.query<FilaClase>(`${SELECT_CLASE} where c.id = $1`, [id]);
  const fila = resultado.rows[0];
  return fila ? aClase(fila) : null;
}

export async function listarInstructores() {
  const resultado = await pool.query<{ id: string; nombre: string }>(
    `select id::text as id, name as nombre from users where role = 'instructor' and active order by name`
  );
  return resultado.rows;
}

export async function esInstructorActivo(id: number, consultor: Consultor = pool) {
  const resultado = await consultor.query(
    `select 1 from users where id = $1 and role = 'instructor' and active`,
    [id]
  );
  return resultado.rowCount === 1;
}

/** Clase PROGRAMADA del mismo instructor y día cuyo horario se cruza (contiguo no cuenta). */
export async function buscarConflicto(datos: DatosClase, consultor: Consultor, ignorarId?: number) {
  const resultado = await consultor.query<FilaClase>(
    `${SELECT_CLASE}
     where c.instructor_id = $1 and c.fecha = $2 and c.estado = 'PROGRAMADA'
       and c.hora_inicio < $4::time and $3::time < c.hora_fin
       and ($5::bigint is null or c.id <> $5)
     order by c.hora_inicio
     limit 1`,
    [datos.instructorId, datos.fecha, datos.horaInicio, datos.horaFin, ignorarId ?? null]
  );
  const fila = resultado.rows[0];
  return fila ? aClase(fila) : null;
}

/**
 * Ejecuta en una transacción que bloquea al instructor: dos coordinadores no
 * pueden programar a la vez clases que se crucen para la misma persona.
 */
export async function conInstructorBloqueado<T>(instructorId: number, trabajo: (consultor: PoolClient) => Promise<T>) {
  const cliente = await pool.connect();

  try {
    await cliente.query("begin");
    await cliente.query("select 1 from users where id = $1 for update", [instructorId]);
    const resultado = await trabajo(cliente);
    await cliente.query("commit");
    return resultado;
  } catch (error) {
    await cliente.query("rollback");
    throw error;
  } finally {
    cliente.release();
  }
}

export async function insertarClase(datos: DatosClase, consultor: Consultor) {
  const resultado = await consultor.query<{ id: string }>(
    `insert into classes (nombre, instructor_id, fecha, hora_inicio, hora_fin, lugar)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [datos.nombre, datos.instructorId, datos.fecha, datos.horaInicio, datos.horaFin, datos.lugar]
  );
  return Number(resultado.rows[0]!.id);
}

/** Solo actualiza clases programadas; devuelve false si no había ninguna. */
export async function actualizarClase(id: number, datos: DatosClase, consultor: Consultor) {
  const resultado = await consultor.query(
    `update classes
     set nombre = $2, instructor_id = $3, fecha = $4, hora_inicio = $5, hora_fin = $6, lugar = $7, updated_at = now()
     where id = $1 and estado = 'PROGRAMADA'`,
    [id, datos.nombre, datos.instructorId, datos.fecha, datos.horaInicio, datos.horaFin, datos.lugar]
  );
  return resultado.rowCount === 1;
}

/** Cambia PROGRAMADA → CANCELADA; devuelve false si no estaba programada. */
export async function cancelarClase(id: number) {
  const resultado = await pool.query(
    `update classes set estado = 'CANCELADA', updated_at = now() where id = $1 and estado = 'PROGRAMADA'`,
    [id]
  );
  return resultado.rowCount === 1;
}

export async function listarInscritos(claseId: number) {
  const resultado = await pool.query<{ id: string; nombre: string; email: string }>(
    `select u.id::text as id, u.name as nombre, u.email
     from enrollments e
     join users u on u.id = e.user_id
     where e.class_id = $1
     order by u.name`,
    [claseId]
  );
  return resultado.rows;
}

export async function buscarParticipante(email: string) {
  const resultado = await pool.query<{ id: string; nombre: string; email: string }>(
    `select id::text as id, name as nombre, email
     from users
     where email = $1 and role = 'participante' and active`,
    [email.toLowerCase()]
  );
  return resultado.rows[0] ?? null;
}

/** Inserta solo si la clase sigue programada; devuelve false si ya estaba inscrito. */
export async function inscribir(claseId: number, participanteId: string) {
  const resultado = await pool.query(
    `insert into enrollments (class_id, user_id)
     select $1, $2 from classes where id = $1 and estado = 'PROGRAMADA'
     on conflict do nothing`,
    [claseId, participanteId]
  );
  return resultado.rowCount === 1;
}

/** Inscripción existente; `inscritoEn` en ISO 8601 con la hora de Lima (UTC−5, sin horario de verano). */
export async function buscarInscripcion(claseId: number, participanteId: string) {
  const resultado = await pool.query<{ inscrito_en: string }>(
    `select to_char(created_at at time zone 'America/Lima', 'YYYY-MM-DD"T"HH24:MI:SS"-05:00"') as inscrito_en
     from enrollments
     where class_id = $1 and user_id = $2`,
    [claseId, participanteId]
  );
  return resultado.rows[0]?.inscrito_en ?? null;
}
