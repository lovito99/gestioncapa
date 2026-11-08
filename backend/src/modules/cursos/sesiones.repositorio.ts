import { pool } from '../../shared/database.js';
import { buscarConflicto, conInstructorBloqueado, obtenerClase } from '../clases/clases.repositorio.js';
import type { DatosClase } from '../clases/clases.validacion.js';

export type SesionCurso = {
  id: string; cursoId: string; nombre: string; fecha: string; horaInicio: string;
  horaFin: string; lugar: string; estado: 'PROGRAMADA' | 'CANCELADA';
};

export async function listarSesiones(cursoId: string) {
  return (await pool.query<SesionCurso>(`select id::text,curso_id::text as "cursoId",nombre,
    to_char(fecha,'YYYY-MM-DD') as fecha,to_char(hora_inicio,'HH24:MI') as "horaInicio",
    to_char(hora_fin,'HH24:MI') as "horaFin",lugar,estado from classes
    where curso_id=$1 order by fecha,hora_inicio,id`, [cursoId])).rows;
}

export async function programarSesion(cursoId: string, datos: DatosClase) {
  return conInstructorBloqueado(datos.instructorId, async cliente => {
    const curso = await cliente.query(`select c.id from cursos c join users u on u.id=c.instructor_id
      where c.id=$1 and c.estado<>'CERRADO' and c.instructor_id=$2
      and c.modalidad in ('PRESENCIAL','HIBRIDA') and u.active and u.role='instructor' for share of c`, [cursoId, datos.instructorId]);
    if (!curso.rowCount) return { noDisponible: true } as const;
    const conflicto = await buscarConflicto(datos, cliente);
    if (conflicto) return { conflicto } as const;
    const id = (await cliente.query<{ id: string }>(`insert into classes
      (curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)
      values($1,$2,$3,$4,$5,$6,$7) returning id::text`,
    [cursoId, datos.nombre, datos.instructorId, datos.fecha, datos.horaInicio, datos.horaFin, datos.lugar])).rows[0]!.id;
    return { sesion: { ...await obtenerClase(Number(id), cliente), cursoId } } as const;
  });
}

/** Cuenta sesiones, no horas ni inscripciones. HU-20 debe comprobar además la nota. */
export async function asistenciaCurso(cursoId: string, usuarioId: number) {
  const fila = (await pool.query<{ totalSesiones: number; presentes: number }>(`select count(*)::int as "totalSesiones",
    count(a.id)::int as presentes from classes c
    left join attendances a on a.class_id=c.id and a.user_id=$2
    where c.curso_id=$1 and c.estado='PROGRAMADA'`, [cursoId, usuarioId])).rows[0]!;
  return { ...fila, porcentaje: fila.totalSesiones ? fila.presentes * 100 / fila.totalSesiones : 0,
    requisitoAsistencia: 80, cumpleAsistencia: fila.totalSesiones > 0 && fila.presentes * 100 >= fila.totalSesiones * 80 };
}
