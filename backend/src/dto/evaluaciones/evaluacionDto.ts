import { z } from 'zod';

export const idEvaluacion = z.string().regex(/^[1-9]\d{0,14}$/, 'Identificador no válido.');

export const entradaPolitica = z.object({
  notaMinima: z.number().min(0).max(20),
  intentosMaximos: z.int().min(1).max(2147483647)
}).strict();

const pregunta = z.object({
  enunciado: z.string().trim().min(1).max(1000),
  opciones: z.array(z.string().trim().min(1).max(400)).min(2).max(10)
    .refine(opciones => new Set(opciones).size === opciones.length, 'Ingresa opciones distintas.'),
  correcta: z.int().min(0)
}).strict().refine(valor => valor.correcta < valor.opciones.length, {
  path: ['correcta'], message: 'Selecciona la respuesta correcta.'
});

export const entradaBorrador = z.object({
  titulo: z.string().trim().min(1).max(160),
  oficial: z.boolean(),
  preguntas: z.array(pregunta).max(100),
  leccionesIds: z.array(idEvaluacion).max(200)
    .refine(ids => new Set(ids).size === ids.length, 'Selecciona cada lección una sola vez.')
}).strict();

const uuid = z.uuid().transform(id => id.toLowerCase());

export const entradaIntento = z.object({
  operacionId: uuid,
  respuestas: z.array(z.object({ preguntaId: uuid, opcionId: uuid }).strict()).min(1).max(100)
}).strict();
