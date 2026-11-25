/**
 * Rechazo esperado de una regla de negocio. Los servicios lo lanzan y el manejador
 * de plugins/errores.ts responde `{ code, message, ...extra }` con este estado, sin alterarlo.
 * `extra` lleva datos del contrato como `fields` o `details`.
 */
export class ErrorAplicacion extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly extra: Record<string, unknown> = {}) {
    super(message);
    this.name = "ErrorAplicacion";
  }
}

/**
 * Error con un estado HTTP sin mensaje propio: el manejador responde el contrato uniforme
 * de ese estado (por ejemplo, 409 ESTADO_NO_PERMITIDO). Equivale a los httpErrors de Fastify
 * sin que el servicio dependa de la instancia de la aplicación.
 */
export function errorDeEstado(statusCode: 403 | 404 | 409 | 503) {
  return Object.assign(new Error(`Estado HTTP ${statusCode}`), { statusCode });
}
