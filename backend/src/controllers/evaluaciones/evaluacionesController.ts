import type { FastifyInstance } from 'fastify';
import { entradaBorrador, entradaIntento, entradaPolitica, idEvaluacion } from '../../dto/evaluaciones/evaluacionDto.js';
import type { EvaluacionesService } from '../../services/evaluaciones/evaluacionesService.js';

type RutaCurso = { Params: { id: string } };
type RutaEvaluacion = { Params: { id: string; evaluacionId: string } };
type RutaLeccion = { Params: { id: string; leccionId: string } };

export function evaluacionesController(servicio: EvaluacionesService) {
  return async function registrar(app: FastifyInstance) {
    app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });

    app.get<RutaCurso>('/api/cursos/:id/politica-evaluacion', request =>
      servicio.leerPolitica(idEvaluacion.parse(request.params.id))
    );

    app.patch<RutaCurso>('/api/cursos/:id/politica-evaluacion', request =>
      servicio.actualizarPolitica(idEvaluacion.parse(request.params.id), entradaPolitica.parse(request.body))
    );

    app.get<RutaCurso>('/api/cursos/:id/evaluaciones/gestion', request =>
      servicio.listarGestion(idEvaluacion.parse(request.params.id), request.usuario!.id)
    );

    app.post<RutaCurso>('/api/cursos/:id/evaluaciones/gestion', async (request, reply) => {
      const evaluacion = await servicio.guardarBorrador(
        idEvaluacion.parse(request.params.id), request.usuario!.id, entradaBorrador.parse(request.body)
      );
      return reply.code(201).send(evaluacion);
    });

    app.put<RutaEvaluacion>('/api/cursos/:id/evaluaciones/:evaluacionId', request =>
      servicio.guardarBorrador(idEvaluacion.parse(request.params.id), request.usuario!.id,
        entradaBorrador.parse(request.body), idEvaluacion.parse(request.params.evaluacionId))
    );

    app.post<RutaEvaluacion>('/api/cursos/:id/evaluaciones/:evaluacionId/publicar', request =>
      servicio.publicar(idEvaluacion.parse(request.params.id), request.usuario!.id,
        idEvaluacion.parse(request.params.evaluacionId))
    );

    app.get<RutaCurso>('/api/cursos/:id/evaluaciones', request =>
      servicio.aula(idEvaluacion.parse(request.params.id), request.usuario!.id)
    );

    app.get<RutaEvaluacion>('/api/cursos/:id/evaluaciones/:evaluacionId', request =>
      servicio.detalle(idEvaluacion.parse(request.params.id), request.usuario!.id, idEvaluacion.parse(request.params.evaluacionId))
    );

    app.post<RutaLeccion>('/api/cursos/:id/evaluaciones/lecciones/:leccionId/completar', request =>
      servicio.completarLeccion(idEvaluacion.parse(request.params.id), request.usuario!.id, idEvaluacion.parse(request.params.leccionId))
    );

    app.post<RutaEvaluacion>('/api/cursos/:id/evaluaciones/:evaluacionId/intentos', request =>
      servicio.rendir(idEvaluacion.parse(request.params.id), request.usuario!.id,
        idEvaluacion.parse(request.params.evaluacionId), entradaIntento.parse(request.body))
    );
  };
}
