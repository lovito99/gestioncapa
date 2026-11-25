import type { FastifyPluginAsync } from "fastify";
import { esquemaMarcar } from "../../dto/asistencia/asistenciaDto.js";
import { leerIdClase } from "../../dto/clases/claseDto.js";
import { errorQrInvalido, type AsistenciaService } from "../../services/asistencia/asistenciaService.js";

// El acceso por rol de cada ruta lo aplica la matriz de backend/src/plugins/permisos.ts.
export function asistenciaController(servicio: AsistenciaService): FastifyPluginAsync {
  return async (app) => {
    app.post("/api/asistencia/marcar", async (request, reply) => {
      // Un cuerpo inválido se informa como QR inválido, no como error de validación genérico.
      const cuerpo = esquemaMarcar.safeParse(request.body);
      if (!cuerpo.success) throw errorQrInvalido();
      return reply.code(201).send(await servicio.marcar(cuerpo.data, request.usuario!.id));
    });

    app.get<{ Params: { id: string } }>("/api/clases/:id/asistencia", async (request) =>
      servicio.listaDeClase(leerIdClase(request.params.id), request.usuario!));

    app.get("/api/participante/clases", async (request) => servicio.clasesDeParticipante(request.usuario!.id));
  };
}
