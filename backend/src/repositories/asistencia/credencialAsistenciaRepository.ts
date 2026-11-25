import type { ProximaSesionQr } from "../../entities/asistencia/asistenciaPuerta.js";
import { pool } from "../../shared/database.js";
import { consultarAfiliacion } from "../cursos/inscripcionesRepository.js";

export async function credencialDe(usuarioId: number) {
  await pool.query(`insert into "credencialesAsistencia" ("usuarioId")
    select id from users where id=$1 and active and role='agremiado'
    on conflict ("usuarioId") do nothing`, [usuarioId]);
  const persona = (await pool.query<{ identificador: string; nombre: string; dni: string | null }>(
    `select q.identificador, u.name as nombre, u.dni
     from "credencialesAsistencia" q join users u on u.id=q."usuarioId"
     where u.id=$1 and u.active and u.role='agremiado'`, [usuarioId]
  )).rows[0];
  if (!persona) return null;

  const [afiliacion, proxima] = await Promise.all([
    persona.dni ? consultarAfiliacion(pool, persona.dni, usuarioId) : undefined,
    pool.query<ProximaSesionQr>(`select s.id::text, coalesce(c.titulo,s.nombre) as titulo,
      to_char(s.fecha,'YYYY-MM-DD') as fecha, to_char(s.hora_inicio,'HH24:MI') as "horaInicio",
      to_char(s.hora_fin,'HH24:MI') as "horaFin", s.lugar
      from enrollments e join classes s on s.id=e.class_id left join cursos c on c.id=s.curso_id
      where e.user_id=$1 and s.estado='PROGRAMADA' and s.modalidad in ('PRESENCIAL','AMBAS')
        and s.fecha+s.hora_inicio >= statement_timestamp() at time zone 'America/Lima'
        and (s.curso_id is null or (c.estado<>'CERRADO' and "tieneAccesoCurso"(s.curso_id,$1)))
      order by s.fecha,s.hora_inicio,s.id limit 1`, [usuarioId])
  ]);
  return {
    identificador: persona.identificador,
    nombre: persona.nombre,
    dniParcial: persona.dni ? `•••• ${persona.dni.slice(-4)}` : null,
    habilitado: Boolean(afiliacion?.habilitado && afiliacion.vinculado),
    proximaSesion: proxima.rows[0] ?? null
  };
}
