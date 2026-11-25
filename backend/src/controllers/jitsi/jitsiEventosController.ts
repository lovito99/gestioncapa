import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { esquemaEventoOcupante } from "../../dto/jitsi/eventoOcupanteDto.js";
import type { EventosJitsiService } from "../../services/jitsi/eventosJitsiService.js";

/** Webhook de Prosody: las rutas son su contrato externo. */
const rutaBase = "/api/jitsi/events";

export function jitsiEventosController(servicio: EventosJitsiService): FastifyPluginAsync {
  return async (app) => {
    const verificar = async (solicitud: FastifyRequest) => {
      if (!servicio.configurado()) throw app.httpErrors.serviceUnavailable();
      if (!servicio.autorizado(solicitud.headers.authorization)) throw app.httpErrors.unauthorized();
    };
    const opciones = { bodyLimit: 16 * 1024, preHandler: verificar };

    // Se aceptan para que Prosody no reintente; la asistencia solo usa entradas y salidas.
    for (const evento of ["room/created", "room/destroyed"]) app.post(`${rutaBase}/${evento}`, opciones, async () => ({}));

    app.post(`${rutaBase}/occupant/joined`, opciones, async (solicitud) => {
      await servicio.ocupanteEntro(esquemaEventoOcupante.parse(solicitud.body));
      return {};
    });

    app.post(`${rutaBase}/occupant/left`, opciones, async (solicitud) => {
      await servicio.ocupanteSalio(esquemaEventoOcupante.parse(solicitud.body));
      return {};
    });
  };
}
