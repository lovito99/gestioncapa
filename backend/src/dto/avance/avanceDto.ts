import { z } from 'zod';

export const idAvance = z.string().regex(/^[1-9]\d{0,14}$/);
export const duracionMaximaMs = 86400000;

export const entradaUnidad = z.object({
  obligatorio: z.boolean(),
  duracionMs: z.int().min(1).max(duracionMaximaMs).nullable()
}).strict();

const tiempoMedio = z.int().min(0).max(duracionMaximaMs);

export const entradaReproduccion = z.object({
  sesionId: z.uuid(),
  secuencia: z.int().min(1).max(2147483647),
  desdeMs: tiempoMedio,
  hastaMs: tiempoMedio,
  posicionMs: tiempoMedio
}).strict().refine(datos => datos.desdeMs <= datos.hastaMs && datos.hastaMs - datos.desdeMs <= 10000, {
  path: ['hastaMs'], message: 'El tramo debe ser consecutivo y de hasta diez segundos.'
});
