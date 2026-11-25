import { LogController, type FastifyReply, type FastifyRequest } from "fastify";

export const esRutaGoogle = (url: string) => /^\/api\/auth\/google(?:[/?]|$)/.test(url);
export const rutaParaLog = (url: string) => esRutaGoogle(url) ? url.split("?", 1)[0]! : url;

/** Resume una petición en una línea: método, ruta, estado y duración. */
export function lineaPeticion(metodo: string, ruta: string, estado: number, milisegundos: number) {
  return `${metodo} ${ruta} → ${estado} (${Math.round(milisegundos)} ms)`;
}

/**
 * Registro de desarrollo: sustituye «incoming request» y «request completed»,
 * con sus objetos req/res en varias líneas, por una sola línea por petición.
 * Los demás avisos de Fastify y los errores del manejador se conservan.
 */
export class RegistroCompacto extends LogController {
  override incomingRequest() {}

  override requestCompleted(error: Error | null | undefined, request: FastifyRequest, reply: FastifyReply) {
    const linea = lineaPeticion(request.method, rutaParaLog(request.url), reply.statusCode, reply.elapsedTime);
    if (error) reply.log.error(esRutaGoogle(request.url) ? {} : { err: error }, linea);
    else if (reply.statusCode >= 500) reply.log.error(linea);
    else if (reply.statusCode >= 400) reply.log.warn(linea);
    else reply.log.info(linea);
  }
}
