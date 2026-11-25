import type { ModalidadSesion } from "../cursos/modalidad.js";

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
  modalidad: ModalidadSesion;
  inscritos: number;
  estado: EstadoClase;
};

export type DatosClase = {
  nombre: string;
  instructorId: number;
  /** YYYY-MM-DD, fecha local de Lima. */
  fecha: string;
  /** HH:mm, hora local de Lima. */
  horaInicio: string;
  horaFin: string;
  lugar: string;
  /** HU-36: dónde se dicta la sesión. */
  modalidad: ModalidadSesion;
};
