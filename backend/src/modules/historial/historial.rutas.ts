import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ErrorHistorial, descargarCertificado, listarColegiados, obtenerHistorial } from './historial.repositorio.js';
import { pdfHistorial } from './historial.pdf.js';

type ConUsuario = FastifyRequest<{ Params: { usuarioId: string; certificadoId?: string } }>;
const idValido = (id: string | undefined) => !!id && /^[1-9]\d{0,14}$/.test(id);
export async function registrarHistorial(app: FastifyInstance) {
  app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'private, no-store'); });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ErrorHistorial) return reply.code(error.status).send({ code: error.status === 403 ? 'SIN_PERMISO' : 'HISTORIAL_NO_EXISTE', message: error.message });
    throw error; // Delega los otros errores al manejador uniforme del padre.
  });
  app.get('/api/colegiados', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    return listarColegiados(request.usuario!);
  });
  for (const pdf of [false, true]) {
    app.get(`/api/colegiados/:usuarioId/historial${pdf ? '/pdf' : ''}`, async (request: ConUsuario, reply) => {
      if (!idValido(request.params.usuarioId)) throw new ErrorHistorial(404, 'El colegiado no existe.');
      const historial = await obtenerHistorial(request.usuario!, request.params.usuarioId);
      reply.header('Cache-Control', 'private, no-store');
      if (!pdf) return historial;
      return reply.header('Content-Disposition', 'attachment; filename="historial-capacitacion.pdf"').type('application/pdf').send(pdfHistorial(historial));
    });
  }
  app.get('/api/colegiados/:usuarioId/certificados/:certificadoId/archivo', async (request: ConUsuario, reply) => {
    if (!idValido(request.params.usuarioId) || !idValido(request.params.certificadoId)) throw new ErrorHistorial(404, 'El certificado no existe.');
    const archivo = await descargarCertificado(request.usuario!, request.params.usuarioId, request.params.certificadoId!);
    return reply.header('Cache-Control', 'private, no-store').header('Content-Disposition', 'attachment; filename="certificado.pdf"').type('application/pdf').send(archivo);
  });
}
