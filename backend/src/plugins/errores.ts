import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { camposDeError } from "../shared/validacion.js";

export function registrarErrores(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(422).send({
        code: "VALIDACION",
        message: "Revisa los campos indicados e intenta de nuevo.",
        fields: camposDeError(error)
      });
    }

    const fallo = error as { statusCode?: number; code?: string };
    const status = fallo.statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: error }, "No se pudo completar la solicitud");
      return reply.code(500).send({
        code: "ERROR_INTERNO",
        message: "No pudimos completar la solicitud. Vuelve a intentar."
      });
    }

    const mensajes: Record<number, { code: string; message: string }> = {
      400: { code: "SOLICITUD_INVALIDA", message: "Revisa los datos de la solicitud." },
      401: { code: "NO_AUTENTICADO", message: "Tu sesión expiró. Vuelve a iniciar sesión." },
      403: { code: "SIN_PERMISO", message: "No tienes permiso para realizar esta acción." },
      404: { code: "RUTA_NO_EXISTE", message: "La ruta solicitada no existe." },
      413: { code: "SOLICITUD_MUY_GRANDE", message: "Los datos enviados superan el tamaño permitido." },
      415: { code: "FORMATO_NO_ADMITIDO", message: "Envía los datos en formato JSON." },
      429: { code: "DEMASIADAS_SOLICITUDES", message: "Espera un momento y vuelve a intentar." }
    };
    const cuerpo = mensajes[status] ?? mensajes[400]!;
    const jsonInvalido = fallo.code?.includes("JSON") || fallo.code === "FST_ERR_CTP_EMPTY_JSON_BODY";
    return reply.code(status).send({
      ...cuerpo,
      ...(jsonInvalido ? { message: "El cuerpo de la solicitud debe ser un JSON válido." } : {})
    });
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({ code: "RUTA_NO_EXISTE", message: "La ruta solicitada no existe." })
  );
}
