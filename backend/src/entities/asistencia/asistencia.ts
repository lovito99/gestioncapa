import type { ModalidadSesion } from "../cursos/modalidad.js";

export type Participante = { id: string; nombre: string; email: string };
export type EstadoAsistencia = "PRESENTE" | "AUSENTE";

/** Inscrito de una clase con la hora de su asistencia, o null si no asistió. */
export type InscritoConAsistencia = Participante & { hora: string | null };

export type RegistroAsistencia = { participante: Participante; estado: EstadoAsistencia; horaRegistro: string | null };
export type ResumenAsistencia = { inscritos: number; presentes: number; ausentes: number; registros: RegistroAsistencia[] };
export type AsistenciaMarcada = { clase: { id: string; nombre: string }; horaRegistro: string };

/** Clase vista por el participante: sin el número de inscritos ni datos de otras personas. */
export type ClaseDeParticipante = {
  id: string;
  nombre: string;
  instructor: { id: string; nombre: string };
  fecha: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  estado: string;
  miAsistencia: string | null;
  modalidad?: ModalidadSesion;
  qrRotatorio?: boolean;
};
