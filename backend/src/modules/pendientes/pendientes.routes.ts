import type { FastifyInstance } from "fastify";
import { permisos } from "../../plugins/permisos.js";

/**
 * Registra las rutas del contrato que aún no tienen implementación. Pasan por el
 * guard de la matriz (401/403) y después responden 501. Se registra al final:
 * una ruta ya implementada no se reemplaza.
 */
export async function rutasPendientes(app: FastifyInstance) {
  for (const { metodo, ruta } of permisos) {
    if (app.hasRoute({ method: metodo, url: ruta })) {
      continue;
    }

    app.route({
      method: metodo,
      url: ruta,
      handler: async (_request, reply) =>
        reply.code(501).send({
          code: "NO_IMPLEMENTADO",
          message: "Esta función aún no está disponible en el servidor."
        })
    });
  }
}
