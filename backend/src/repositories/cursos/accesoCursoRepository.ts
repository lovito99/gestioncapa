import { pool, type Consultor } from "../../shared/database.js";

/** Administrador, instructor asignado o agremiado con acceso vigente al curso. */
export async function puedeAccederContenido(cursoId: string, usuario: { id: number | string }, cliente: Consultor = pool) {
  const fila = (await cliente.query<{ acceso: boolean }>(`select (u.role='admin' or (u.role='instructor' and c.instructor_id=u.id)
    or (u.role='agremiado' and "tieneAccesoCurso"(c.id,u.id))) as acceso from cursos c
    join users u on u.id=$2 and u.active where c.id=$1`, [cursoId, usuario.id])).rows[0];
  return fila?.acceso === true;
}

/** Curso al que pertenece una sesión; undefined si la sesión no es de un curso. */
export async function cursoDeSesion(claseId: string, usuarioId: number | string) {
  return (await pool.query<{ instructorId: string; estado: string }>(`select
        c.estado,c.instructor_id::text as "instructorId"
        from classes s join cursos c on c.id=s.curso_id
        join users u on u.id=$2 where s.id=$1`, [claseId, usuarioId])).rows[0];
}

export async function listarInstructoresActivos() {
  return (await pool.query(`select id::text,name as nombre from users where role='instructor' and active order by name`)).rows;
}

export async function dniDe(usuarioId: number | string) {
  return (await pool.query<{ dni: string | null }>("select dni from users where id=$1", [usuarioId])).rows[0]?.dni ?? null;
}
