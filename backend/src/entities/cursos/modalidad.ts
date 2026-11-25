export const modalidadesSesion = ["PRESENCIAL", "VIRTUAL", "AMBAS"] as const;
export type ModalidadSesion = typeof modalidadesSesion[number];
export const modalidadesCurso = ["PRESENCIAL", "VIRTUAL", "HIBRIDA", "GRABADO"] as const;
export type ModalidadCurso = typeof modalidadesCurso[number];

export const etiquetasModalidadCurso: Readonly<Record<ModalidadCurso, string>> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  HIBRIDA: 'Híbrida',
  GRABADO: 'Grabada'
};

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
