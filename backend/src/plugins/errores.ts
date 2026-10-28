import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { camposDeError } from "../shared/validacion.js";

export function registrarErrores(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      request.log.warn({ err: error, tipo: "validacion" }, "Solicitud rechazada por datos inválidos");
      return reply.code(422).send({
        code: "VALIDACION",
        message: "Revisa los campos indicados e intenta de nuevo.",
        fields: camposDeError(error)
      });
    }

    const fallo = error as { statusCode?: number; code?: string };
    const status = fallo.statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: error, tipo: "servidor", statusCode: status }, "No se pudo completar la solicitud");
      return reply.code(status === 503 ? 503 : 500).send({
        code: status === 503 ? "SERVICIO_NO_DISPONIBLE" : "ERROR_INTERNO",
        message: status === 503 ? "El servicio todavía no está disponible. Revisa su configuración." : "No pudimos completar la solicitud. Vuelve a intentar."
      });
    }

    const mensajes: Record<number, { code: string; message: string }> = {
      400: { code: "SOLICITUD_INVALIDA", message: "Revisa los datos de la solicitud." },
      401: { code: "NO_AUTENTICADO", message: "Tu sesión expiró. Vuelve a iniciar sesión." },
      403: { code: "SIN_PERMISO", message: "No tienes permiso para realizar esta acción." },
      404: { code: "RUTA_NO_EXISTE", message: "La ruta solicitada no existe." },
      409: { code: "ESTADO_NO_PERMITIDO", message: "El estado actual no permite realizar esta operación." },
      413: { code: "SOLICITUD_MUY_GRANDE", message: "Los datos enviados superan el tamaño permitido." },
      415: { code: "FORMATO_NO_ADMITIDO", message: "Envía los datos en formato JSON." },
      429: { code: "DEMASIADAS_SOLICITUDES", message: "Espera un momento y vuelve a intentar." }
    };
    const cuerpo = mensajes[status] ?? mensajes[400]!;
    const jsonInvalido = fallo.code?.includes("JSON") || fallo.code === "FST_ERR_CTP_EMPTY_JSON_BODY";
    request.log.warn(
      { tipo: "cliente", statusCode: status, codigo: fallo.code, jsonInvalido },
      "Solicitud rechazada"
    );
    return reply.code(status).send({
      ...cuerpo,
      ...(jsonInvalido ? { message: "El cuerpo de la solicitud debe ser un JSON válido." } : {})
    });
  });

  app.setNotFoundHandler((request, reply) => {
    request.log.warn(
      { tipo: "cliente", statusCode: 404, metodo: request.method, ruta: request.url },
      "Ruta no encontrada"
    );
    return reply.code(404).send({ code: "RUTA_NO_EXISTE", message: "La ruta solicitada no existe." });
  });
}
