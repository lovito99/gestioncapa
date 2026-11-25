import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { esIdHistorial } from "../../dto/historial/historialDto.js";
import type { HistorialService } from "../../services/historial/historialService.js";
import { pdfHistorial } from "../../services/historial/historialPdf.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";

type ConUsuario = FastifyRequest<{ Params: { usuarioId: string; certificadoId?: string } }>;
const noExiste = (mensaje: string) => new ErrorAplicacion(404, "HISTORIAL_NO_EXISTE", mensaje);

export function historialController(servicio: HistorialService): FastifyPluginAsync {
  return async (app) => {
    app.addHook("onRequest", async (solicitud, reply) => { reply.header("Cache-Control", "private, no-store"); });

    app.get("/api/colegiados", async (request, reply) => {
      reply.header("Cache-Control", "private, no-store");
      return servicio.listarColegiados(request.usuario!);
    });

    for (const pdf of [false, true]) {
      app.get(`/api/colegiados/:usuarioId/historial${pdf ? "/pdf" : ""}`, async (request: ConUsuario, reply) => {
        if (!esIdHistorial(request.params.usuarioId)) throw noExiste("El colegiado no existe.");
        const historial = await servicio.obtener(request.usuario!, request.params.usuarioId);
        reply.header("Cache-Control", "private, no-store");
        if (!pdf) return historial;
        return reply.header("Content-Disposition", 'attachment; filename="historial-capacitacion.pdf"').type("application/pdf").send(pdfHistorial(historial));
      });
    }

    app.get("/api/colegiados/:usuarioId/certificados/:certificadoId/archivo", async (request: ConUsuario, reply) => {
      const { usuarioId, certificadoId } = request.params;
      if (!esIdHistorial(usuarioId) || !esIdHistorial(certificadoId)) throw noExiste("El certificado no existe.");
      const archivo = await servicio.archivoCertificado(request.usuario!, usuarioId, certificadoId);
      return reply.header("Cache-Control", "private, no-store").header("Content-Disposition", 'attachment; filename="certificado.pdf"').type("application/pdf").send(archivo);
    });
  };
}
