import type { FastifyPluginAsync } from 'fastify';
import { idCurso } from '../../dto/cursos/cursoDto.js';
import { entradaEstado, entradaLeccion, entradaOrden, entradaPdf } from '../../dto/lecciones/leccionDto.js';
import type { LeccionesService } from '../../services/lecciones/leccionesService.js';

type Curso = { Params: { id: string } };
type Leccion = { Params: { id: string; leccionId: string } };

export function leccionesController(servicio: LeccionesService): FastifyPluginAsync {
  return async app => {
    app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'private, no-store'); });
    app.get<Curso>('/api/cursos/:id/lecciones', request =>
      servicio.listar(idCurso.parse(request.params.id), request.usuario!));
    app.post<Curso>('/api/cursos/:id/lecciones', { bodyLimit: 4096 }, async (request, reply) =>
      reply.code(201).send(await servicio.crear(idCurso.parse(request.params.id), request.usuario!, entradaLeccion.parse(request.body))));
    app.put<Curso>('/api/cursos/:id/lecciones/orden', { bodyLimit: 8192 }, request => {
      const { ids, revision } = entradaOrden.parse(request.body);
      return servicio.guardarOrden(idCurso.parse(request.params.id), request.usuario!, revision, ids);
    });
    app.put<Leccion>('/api/cursos/:id/lecciones/:leccionId/pdf', { bodyLimit: 8 * 1024 * 1024 }, request =>
      servicio.adjuntar(idCurso.parse(request.params.id), idCurso.parse(request.params.leccionId),
        request.usuario!, entradaPdf.parse(request.body).contenidoBase64));
    app.get<Leccion>('/api/cursos/:id/lecciones/:leccionId/pdf', async (request, reply) => {
      const pdf = await servicio.descargar(idCurso.parse(request.params.id), idCurso.parse(request.params.leccionId), request.usuario!);
      return reply.header('Content-Disposition', 'attachment; filename="material.pdf"')
        .header('X-Content-Type-Options', 'nosniff').type('application/pdf').send(pdf);
    });
    app.put<Leccion>('/api/cursos/:id/lecciones/:leccionId/estado', { bodyLimit: 1024 }, request =>
      servicio.guardarEstado(idCurso.parse(request.params.id), idCurso.parse(request.params.leccionId),
        request.usuario!, entradaEstado.parse(request.body).estado));
  };
}
