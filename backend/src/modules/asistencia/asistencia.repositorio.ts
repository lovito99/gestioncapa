import { pool } from "../../shared/database.js";

// timestamp_lima es hora local de Lima sin zona; Perú no tiene horario de verano.
const ISO_LIMA = `'YYYY-MM-DD"T"HH24:MI:SS"-05:00"'`;

export async function estaInscrito(claseId: number, usuarioId: number) {
  const resultado = await pool.query("select 1 from enrollments where class_id = $1 and user_id = $2", [claseId, usuarioId]);
  return resultado.rowCount === 1;
}

/**
 * Inserta la asistencia de forma atómica: la restricción UNIQUE (class_id, user_id)
 * decide entre escaneos simultáneos. Devuelve la hora registrada, o null si ya existía.
 */
export async function registrarAsistencia(claseId: number, usuarioId: number, registradoPor: number) {
  const resultado = await pool.query<{ hora: string }>(
    `insert into attendances (class_id, user_id, created_by)
     values ($1, $2, $3)
     on conflict (class_id, user_id) do nothing
     returning to_char(timestamp_lima, ${ISO_LIMA}) as hora`,
    [claseId, usuarioId, registradoPor]
  );
  return resultado.rows[0]?.hora ?? null;
}

export async function horaDeAsistencia(claseId: number, usuarioId: number) {
  const resultado = await pool.query<{ hora: string }>(
    `select to_char(timestamp_lima, ${ISO_LIMA}) as hora from attendances where class_id = $1 and user_id = $2`,
    [claseId, usuarioId]
  );
  return resultado.rows[0]?.hora ?? null;
}

/** Todos los inscritos de la clase, presentes o ausentes, ordenados por nombre. */
export async function listaDeAsistencia(claseId: number) {
  const resultado = await pool.query<{ id: string; nombre: string; email: string; hora: string | null }>(
    `select u.id::text as id, u.name as nombre, u.email, to_char(a.timestamp_lima, ${ISO_LIMA}) as hora
     from enrollments e
     join users u on u.id = e.user_id
     left join attendances a on a.class_id = e.class_id and a.user_id = e.user_id
     where e.class_id = $1
     order by u.name, u.id`,
    [claseId]
  );

  const registros = resultado.rows.map(({ id, nombre, email, hora }) => ({
    participante: { id, nombre, email },
    estado: hora ? ("PRESENTE" as const) : ("AUSENTE" as const),
    horaRegistro: hora
  }));
  const presentes = registros.filter((r) => r.estado === "PRESENTE").length;
  return { inscritos: registros.length, presentes, ausentes: registros.length - presentes, registros };
}

/** Clases del participante: sin el número de inscritos ni datos de otras personas. */
export async function clasesDeParticipante(usuarioId: number) {
  const resultado = await pool.query(
    `select c.id::text as id, c.nombre,
            json_build_object('id', i.id::text, 'nombre', i.name) as instructor,
            to_char(c.fecha, 'YYYY-MM-DD') as fecha,
            to_char(c.hora_inicio, 'HH24:MI') as "horaInicio",
            to_char(c.hora_fin, 'HH24:MI') as "horaFin",
            c.lugar, c.estado,
            to_char(a.timestamp_lima, ${ISO_LIMA}) as "miAsistencia"
     from enrollments e
     join classes c on c.id = e.class_id
     join users i on i.id = c.instructor_id
     left join attendances a on a.class_id = e.class_id and a.user_id = e.user_id
     where e.user_id = $1
     order by c.fecha, c.hora_inicio, c.id`,
    [usuarioId]
  );
  return resultado.rows;
}
