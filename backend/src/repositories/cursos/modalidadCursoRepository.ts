import type { Consultor } from "../../shared/database.js";
import { modalidadDerivada, type ModalidadCurso, type ModalidadSesion } from "../../entities/cursos/modalidad.js";

/** Recalcula y guarda la modalidad del curso; se llama en la transacción que cambia sesiones. */
export async function recalcularModalidadCurso(consultor: Consultor, cursoId: string) {
  const curso = (await consultor.query<{ planificada: ModalidadCurso; sesiones: ModalidadSesion[] }>(`select c."modalidadPlanificada" as planificada,
      coalesce(array_agg(s.modalidad) filter (where s.id is not null), '{}') as sesiones
    from cursos c left join classes s on s.curso_id = c.id and s.estado = 'PROGRAMADA'
    where c.id = $1 group by c.id`, [cursoId])).rows[0];
  if (!curso) return;
  await consultor.query("update cursos set modalidad = $2 where id = $1 and modalidad <> $2", [cursoId, modalidadDerivada(curso.sesiones, curso.planificada)]);
}
