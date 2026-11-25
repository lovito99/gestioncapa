import type { FastifyPluginAsync } from "fastify";
import { esquemaConsultaCorreo } from "../../dto/notificaciones/correoDto.js";
import type { ConsultaCorreoService } from "../../services/notificaciones/consultaCorreoService.js";

export function correoController(servicio: ConsultaCorreoService): FastifyPluginAsync {
  return async (app) => {
    app.get("/api/admin/notificaciones/correo", async (request, reply) => {
      reply.header("Cache-Control", "private, no-store");
      return servicio.listar(esquemaConsultaCorreo.parse(request.query));
    });
  };
}
