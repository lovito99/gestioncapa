import type { FastifyPluginAsync } from "fastify";
import type { MiQr } from "../../entities/asistencia/asistenciaPuerta.js";
import type { crearCredencialAsistenciaService } from "../../services/asistencia/credencialAsistenciaService.js";

export function credencialAsistenciaController(
  miQr: ReturnType<typeof crearCredencialAsistenciaService>,
  crearPdf: (credencial: MiQr) => Promise<Buffer>
): FastifyPluginAsync {
  return async (app) => {
    app.addHook("onRequest", async (_request, reply) => {
      reply.header("Cache-Control", "private, no-store");
    });
    app.get("/api/participante/mi-qr", async (request) => miQr(request.usuario!.id));
    app.get("/api/participante/mi-qr/pdf", async (request, reply) => {
      const pdf = await crearPdf(await miQr(request.usuario!.id));
      return reply.type("application/pdf").header("Content-Disposition", 'attachment; filename="mi-qr-cppp.pdf"').send(pdf);
    });
  };
}
