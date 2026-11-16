import type { Consultor } from "../clases/clases.repositorio.js";

export const modalidadesSesion = ["PRESENCIAL", "VIRTUAL", "AMBAS"] as const;
export type ModalidadSesion = typeof modalidadesSesion[number];
export const modalidadesCurso = ["PRESENCIAL", "VIRTUAL", "HIBRIDA", "GRABADO"] as const;
export type ModalidadCurso = typeof modalidadesCurso[number];

/**
 * HU-36: el curso se clasifica por sus sesiones programadas; sin sesiones conserva la
 * modalidad planificada por el administrador (incluido el curso grabado).
 */
export function modalidadDerivada(sesiones: readonly ModalidadSesion[], planificada: ModalidadCurso): ModalidadCurso {
  if (sesiones.length === 0) return planificada;
  if (sesiones.every(modalidad => modalidad === "PRESENCIAL")) return "PRESENCIAL";
  if (sesiones.every(modalidad => modalidad === "VIRTUAL")) return "VIRTUAL";
  return "HIBRIDA";
}

/** Recalcula y guarda la modalidad del curso; se llama en la transacción que cambia sesiones. */
export async function recalcularModalidadCurso(consultor: Consultor, cursoId: string) {
  const curso = (await consultor.query<{ planificada: ModalidadCurso; sesiones: ModalidadSesion[] }>(`select c."modalidadPlanificada" as planificada,
      coalesce(array_agg(s.modalidad) filter (where s.id is not null), '{}') as sesiones
    from cursos c left join classes s on s.curso_id = c.id and s.estado = 'PROGRAMADA'
    where c.id = $1 group by c.id`, [cursoId])).rows[0];
  if (!curso) return;
  await consultor.query("update cursos set modalidad = $2 where id = $1 and modalidad <> $2", [cursoId, modalidadDerivada(curso.sesiones, curso.planificada)]);
}
