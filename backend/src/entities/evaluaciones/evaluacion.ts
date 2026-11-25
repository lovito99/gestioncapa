import type { ModalidadCurso } from '../cursos/modalidad.js';

export type PoliticaEvaluacion = { notaMinima: number; intentosMaximos: number };

export type CursoEvaluacion = PoliticaEvaluacion & {
  id: string;
  titulo: string;
  instructorId: string;
  modalidad: ModalidadCurso;
  estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO';
};

export type PreguntaBorrador = { enunciado: string; opciones: string[]; correcta: number };
export type BorradorEvaluacion = {
  titulo: string;
  oficial: boolean;
  preguntas: PreguntaBorrador[];
  leccionesIds: string[];
};

export type PreguntaEvaluacion = {
  id: string;
  enunciado: string;
  opciones: { id: string; texto: string }[];
  correcta: number;
};
export type LeccionEvaluacion = { id: string; titulo: string; modulo: string; url: string };
export type Evaluacion = Omit<BorradorEvaluacion, 'preguntas'> & {
  id: string;
  publicadaEn: Date | null;
  notaMinima: number | null;
  intentosMaximos: number | null;
  preguntas: PreguntaEvaluacion[];
  lecciones: LeccionEvaluacion[];
};

export type EvaluacionPublicada = Evaluacion & PoliticaEvaluacion & { publicadaEn: Date };
export type EncabezadoEvaluacion = Omit<EvaluacionPublicada, 'preguntas' | 'leccionesIds'>;
export type ResumenIntentos = { mejorNota: number | null; intentosUsados: number };
export type RespuestaEvaluacion = { preguntaId: string; opcionId: string };
export type EntregaEvaluacion = { operacionId: string; respuestas: RespuestaEvaluacion[] };

export function calificarRespuestas(preguntas: PreguntaEvaluacion[], respuestas: RespuestaEvaluacion[]) {
  if (respuestas.length !== preguntas.length || preguntas.length === 0) return null;
  const porPregunta = new Map(respuestas.map(({ preguntaId, opcionId }) => [preguntaId, opcionId]));
  let aciertos = 0;
  for (const pregunta of preguntas) {
    const opcionId = porPregunta.get(pregunta.id);
    if (!pregunta.opciones.some(opcion => opcion.id === opcionId)) return null;
    if (pregunta.opciones[pregunta.correcta]?.id === opcionId) aciertos++;
  }
  return Math.round(aciertos * 2000 / preguntas.length) / 100;
}

export function estadoEvaluacion(
  evaluacion: PoliticaEvaluacion, finalizado: boolean,
  { mejorNota, intentosUsados }: ResumenIntentos = { mejorNota: null, intentosUsados: 0 }
) {
  return {
    mejorNota, intentosUsados, finalizado,
    aprobado: mejorNota !== null && mejorNota >= evaluacion.notaMinima,
    intentosRestantes: finalizado ? 0 : Math.max(0, evaluacion.intentosMaximos - intentosUsados)
  };
}

export function resumenEvaluacion(
  evaluacion: EncabezadoEvaluacion, modalidad: ModalidadCurso, completadas: Set<string>,
  finalizado: boolean, intentos: ResumenIntentos | undefined
) {
  const { id, titulo, oficial, notaMinima, intentosMaximos, lecciones } = evaluacion;
  return {
    id, titulo, oficial, notaMinima, intentosMaximos,
    bloqueada: oficial && modalidad === 'GRABADO' &&
      (lecciones.length === 0 || lecciones.some(leccion => !completadas.has(leccion.id))),
    estado: estadoEvaluacion(evaluacion, finalizado, intentos)
  };
}
