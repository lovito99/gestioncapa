import { z } from 'zod';
import { idCurso, contenidoPdf } from '../cursos/cursoDto.js';
import { identificarVideoYoutube } from '../../entities/lecciones/youtube.js';

export const entradaLeccion = z.object({
  titulo: z.string().trim().min(1).max(160),
  moduloId: idCurso,
  operacionId: z.uuid(),
  url: z.string().trim().max(2048).transform((url, contexto) => {
    const id = identificarVideoYoutube(url);
    if (id) return id;
    contexto.addIssue({ code: 'custom', message: 'Ingresa el enlace HTTPS de un video individual de YouTube.' });
    return z.NEVER;
  }),
}).strict().transform(({ url, ...datos }) => ({ ...datos, youtubeId: url }));

export const entradaOrden = z.object({
  revision: z.int().min(0).max(2147483647),
  ids: z.array(idCurso).max(200),
}).strict().refine(datos => new Set(datos.ids).size === datos.ids.length, {
  path: ['ids'], message: 'Cada lección debe aparecer una sola vez.',
});

export const entradaPdf = z.object({ contenidoBase64: contenidoPdf }).strict();
export const entradaEstado = z.object({ estado: z.enum(['EN_CURSO', 'COMPLETADA']) }).strict();
