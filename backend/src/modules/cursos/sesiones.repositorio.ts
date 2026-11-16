import { pool } from '../../shared/database.js';
import { buscarConflicto, conInstructorBloqueado, obtenerClase } from '../clases/clases.repositorio.js';
import type { DatosClase } from '../clases/clases.validacion.js';
import { recalcularModalidadCurso, type ModalidadSesion } from './modalidadCurso.js';
import { sincronizarSalaSesion } from '../reuniones/reuniones.repositorio.js';

export type SesionCurso = {
  id: string; cursoId: string; nombre: string; fecha: string; horaInicio: string;
  horaFin: string; lugar: string; estado: 'PROGRAMADA' | 'CANCELADA'; modalidad: ModalidadSesion;
  /** Sala de HU-26; solo para quien gestiona el curso o tiene acceso a él. */
  reunion: { identificador: string; estado: string } | null;
};

export async function listarSesiones(cursoId: string, usuarioId?: number) {
  // El acceso a la sala se decide una vez por curso: gestión, instructor asignado o acceso vigente al curso.
  return (await pool.query<SesionCurso>(`with acceso as (select exists(select 1 from cursos c join users v on v.id=$2
      where c.id=$1 and v.active and (v.role='admin' or v.id=c.instructor_id or "tieneAccesoCurso"(c.id,v.id))) as permitido)
    select s.id::text,s.curso_id::text as "cursoId",s.nombre,
    to_char(s.fecha,'YYYY-MM-DD') as fecha,to_char(s.hora_inicio,'HH24:MI') as "horaInicio",
    to_char(s.hora_fin,'HH24:MI') as "horaFin",s.lugar,s.estado,s.modalidad,
    case when acceso.permitido then (select jsonb_build_object('identificador',r.identificador,'estado',r.estado) from reuniones r
      where r."claseIdentificador"=s.id and r.estado in ('programada','iniciada') order by r."fechaCreacion" desc limit 1) end as reunion
    from classes s cross join acceso
    where s.curso_id=$1 order by s.fecha,s.hora_inicio,s.id`, [cursoId, usuarioId ?? null])).rows;
}

export async function programarSesion(cursoId: string, datos: DatosClase, actorId: number) {
  return conInstructorBloqueado(datos.instructorId, async cliente => {
    const curso = await cliente.query(`select c.id from cursos c join users u on u.id=c.instructor_id
      where c.id=$1 and c.estado<>'CERRADO' and c.instructor_id=$2
      and u.active and u.role='instructor' for share of c`, [cursoId, datos.instructorId]);
    if (!curso.rowCount) return { noDisponible: true } as const;
    const conflicto = await buscarConflicto(datos, cliente);
    if (conflicto) return { conflicto } as const;
    const id = (await cliente.query<{ id: string }>(`insert into classes
      (curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar,modalidad)
      values($1,$2,$3,$4,$5,$6,$7,$8) returning id::text`,
    [cursoId, datos.nombre, datos.instructorId, datos.fecha, datos.horaInicio, datos.horaFin, datos.lugar, datos.modalidad])).rows[0]!.id;
    await cliente.query(`insert into enrollments(class_id,user_id) select $1,usuario_id from inscripciones_curso
      where curso_id=$2 and estado='EN_CURSO' and "tieneAccesoCurso"(curso_id,usuario_id) on conflict do nothing`,[id,cursoId]);
    // HU-36: el curso se reclasifica y la sesión virtual obtiene su sala (con los inscritos ya matriculados).
    await recalcularModalidadCurso(cliente, cursoId);
    await sincronizarSalaSesion(cliente, id, actorId);
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
