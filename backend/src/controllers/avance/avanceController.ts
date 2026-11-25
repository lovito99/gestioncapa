import type { FastifyPluginAsync } from 'fastify';
import { entradaReproduccion, entradaUnidad, idAvance } from '../../dto/avance/avanceDto.js';
import type { AvanceService } from '../../services/avance/avanceService.js';

type Curso = { Params: { id: string } };
type Titular = { Params: { id: string; usuarioId: string } };
type Unidad = { Params: { id: string; materialId: string } };

export function avanceController(servicio: AvanceService): FastifyPluginAsync {
  return async app => {
    app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'private, no-store'); });
    app.get<Titular>('/api/cursos/:id/avance/:usuarioId', request =>
      servicio.obtener(idAvance.parse(request.params.id), request.usuario!, idAvance.parse(request.params.usuarioId))
    );
    app.get<Curso>('/api/cursos/:id/avance/gestion', request =>
      servicio.gestion(idAvance.parse(request.params.id), request.usuario!)
    );
    app.post<Unidad>('/api/cursos/:id/avance/materiales/:materialId/visto', request =>
      servicio.marcarVisto(idAvance.parse(request.params.id), idAvance.parse(request.params.materialId), request.usuario!)
    );
    app.put<Unidad>('/api/cursos/:id/avance/materiales/:materialId', request =>
      servicio.configurar(idAvance.parse(request.params.id), idAvance.parse(request.params.materialId),
        request.usuario!, entradaUnidad.parse(request.body))
    );
    app.post<Curso>('/api/cursos/:id/avance/activar', request =>
      servicio.activar(idAvance.parse(request.params.id))
    );
    app.post<Unidad>('/api/cursos/:id/avance/materiales/:materialId/reproducir', request =>
      servicio.iniciar(idAvance.parse(request.params.id), idAvance.parse(request.params.materialId), request.usuario!)
    );
    app.post<Unidad>('/api/cursos/:id/avance/materiales/:materialId/progreso', { bodyLimit: 2048 }, request =>
      servicio.reportar(idAvance.parse(request.params.id), idAvance.parse(request.params.materialId),
        request.usuario!, entradaReproduccion.parse(request.body))
    );
  };
}
