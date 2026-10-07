import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { obtenerClase } from "../clases/clases.repositorio.js";
import { clasesDeParticipante, listaDeAsistencia } from "./asistencia.repositorio.js";
import { marcarAsistencia } from "./asistencia.service.js";

// El acceso por rol de cada ruta lo aplica la matriz de backend/src/plugins/permisos.ts.

const cuerpoMarcar = z.object({
  token: z.string().trim().min(1),
  claseId: z.string().regex(/^\d{1,15}$/).optional()
});

const enviarError = (reply: FastifyReply, status: number, code: string, message: string) =>
  reply.code(status).send({ code, message });

const qrInvalido = (reply: FastifyReply) =>
  enviarError(reply, 422, "QR_INVALIDO", "Este código QR no es válido. Escanea el código que muestra tu instructor en la sala.");

function leerId(request: FastifyRequest<{ Params: { id: string } }>) {
  const id = Number(request.params.id);
  return /^\d{1,15}$/.test(request.params.id) && id > 0 ? id : null;
}

export async function asistenciaRoutes(app: FastifyInstance) {
  // HU-08: las validaciones siguen el orden del contrato (docs/esp/asistencia.md).
  app.post("/api/asistencia/marcar", async (request, reply) => {
    const cuerpo = cuerpoMarcar.safeParse(request.body);
    if (!cuerpo.success) return qrInvalido(reply);

    const resultado = await marcarAsistencia(cuerpo.data, request.usuario!.id);
    // El servicio ya confirmó la transacción antes de responder al participante.
    return reply.code(resultado.status).send(resultado.cuerpo);
  });

  // HU-09: lista de asistencia del coordinador.
  app.get("/api/clases/:id/asistencia", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = leerId(request);
    if (!id || !(await obtenerClase(id))) return enviarError(reply, 404, "CLASE_NO_EXISTE", "La clase no existe.");
    return listaDeAsistencia(id);
  });

  app.get("/api/participante/clases", async (request) => clasesDeParticipante(request.usuario!.id));
}
