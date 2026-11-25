import type { FastifyPluginAsync, HTTPMethods } from "fastify";

type RutaContrato = { metodo: HTTPMethods; ruta: string };

/**
 * Registra las rutas del contrato que aún no tienen implementación. Pasan por el
 * guard de la matriz (401/403) y después responden 501. Se registra al final:
 * una ruta ya implementada no se reemplaza.
 */
export function pendientesController(contrato: readonly RutaContrato[]): FastifyPluginAsync {
  return async (app) => {
    for (const { metodo, ruta } of contrato) {
      if (app.hasRoute({ method: metodo, url: ruta })) continue;
      app.route({
        method: metodo,
        url: ruta,
        handler: async (solicitud, reply) =>
          reply.code(501).send({ code: "NO_IMPLEMENTADO", message: "Esta función aún no está disponible en el servidor." })
      });
    }
  };
}
