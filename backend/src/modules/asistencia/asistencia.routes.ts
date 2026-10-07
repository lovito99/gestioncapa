import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { obtenerClase } from "../clases/clases.repositorio.js";
import { reloj, verificarTokenQr } from "../qr/qr.token.js";
import {
  clasesDeParticipante,
  estaInscrito,
  horaDeAsistencia,
  listaDeAsistencia,
  registrarAsistencia
} from "./asistencia.repositorio.js";

// El acceso por rol de cada ruta lo aplica la matriz de backend/src/plugins/permisos.ts.

const cuerpoMarcar = z.object({
  token: z.string().trim().min(1),
  claseId: z.string().regex(/^\d{1,15}$/).optional()
});

const enviarError = (reply: FastifyReply, status: number, code: string, message: string) =>
  reply.code(status).send({ code, message });

const qrInvalido = (reply: FastifyReply) =>
  enviarError(reply, 422, "QR_INVALIDO", "Este código QR no es válido. Escanea el código que muestra tu instructor en la sala.");

const yaRegistrada = (reply: FastifyReply, hora: string | null) =>
  enviarError(
    reply,
    409,
    "ASISTENCIA_YA_REGISTRADA",
    `Tu asistencia ya estaba registrada${hora ? ` a las ${hora.slice(11, 16)}` : ""}. No necesitas volver a escanear.`
  );

function leerId(request: FastifyRequest<{ Params: { id: string } }>) {
  const id = Number(request.params.id);
  return /^\d{1,15}$/.test(request.params.id) && id > 0 ? id : null;
}

export async function asistenciaRoutes(app: FastifyInstance) {
  // HU-08: las validaciones siguen el orden del contrato (docs/esp/asistencia.md).
  app.post("/api/asistencia/marcar", async (request, reply) => {
    const cuerpo = cuerpoMarcar.safeParse(request.body);
    if (!cuerpo.success) return qrInvalido(reply);

    const resultado = verificarTokenQr(cuerpo.data.token, reloj.ahora(), env.QR_SECRET);
    if (!resultado.ok && resultado.motivo === "INVALIDO") return qrInvalido(reply);
    if (!resultado.ok) {
      return enviarError(reply, 410, "QR_EXPIRADO", "El código QR expiró. Escanea el código nuevo que aparece en la pantalla del instructor.");
    }

    if (cuerpo.data.claseId && cuerpo.data.claseId !== resultado.claseId) {
      return enviarError(reply, 409, "QR_OTRA_CLASE", "Este código QR es de otra clase. Verifica que estés escaneando el código de tu clase.");
    }

    const claseId = Number(resultado.claseId);
    const clase = await obtenerClase(claseId);
    if (!clase) return enviarError(reply, 404, "CLASE_NO_EXISTE", "La clase no existe.");
    if (clase.estado === "CANCELADA") return enviarError(reply, 409, "CLASE_CANCELADA", "La clase está cancelada.");

    const usuarioId = request.usuario!.id;
    if (!(await estaInscrito(claseId, usuarioId))) {
      return enviarError(reply, 403, "NO_INSCRITO", "No estás inscrito(a) en esta clase. Pide al coordinador que te inscriba.");
    }

    const hora = await registrarAsistencia(claseId, usuarioId, usuarioId);
    if (!hora) return yaRegistrada(reply, await horaDeAsistencia(claseId, usuarioId));

    return reply.code(201).send({ clase: { id: clase.id, nombre: clase.nombre }, horaRegistro: hora });
  });

  // HU-09: lista de asistencia del coordinador.
  app.get("/api/clases/:id/asistencia", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const id = leerId(request);
    if (!id || !(await obtenerClase(id))) return enviarError(reply, 404, "CLASE_NO_EXISTE", "La clase no existe.");
    return listaDeAsistencia(id);
  });

  app.get("/api/participante/clases", async (request) => clasesDeParticipante(request.usuario!.id));
}
