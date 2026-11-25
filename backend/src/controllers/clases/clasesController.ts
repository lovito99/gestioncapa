import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { leerIdClase } from "../../dto/clases/claseDto.js";
import type { ClasesService } from "../../services/clases/clasesService.js";

// El acceso por rol de cada ruta lo aplica la matriz de backend/src/plugins/permisos.ts.

type ConId = FastifyRequest<{ Params: { id: string } }>;
const idDe = (request: ConId) => leerIdClase(request.params.id);

export function clasesController(servicio: ClasesService): FastifyPluginAsync {
  return async (app) => {
    app.get("/api/instructores", async () => servicio.listarInstructores());
    app.get("/api/clases", async () => servicio.listar());
    app.get("/api/clases/:id", async (request: ConId) => servicio.obtener(idDe(request), request.usuario!));

    app.post("/api/clases", async (request, reply) => reply.code(201).send(await servicio.crear(request.body, request.usuario!.id)));
    app.put("/api/clases/:id", async (request: ConId) => servicio.actualizar(idDe(request), request.body, request.usuario!.id));
    app.post("/api/clases/:id/cancelar", async (request: ConId) => servicio.cancelar(idDe(request), request.usuario!.id));

    app.get("/api/clases/:id/inscritos", async (request: ConId) => servicio.inscritos(idDe(request)));
    app.post("/api/clases/:id/inscritos", async (request: ConId, reply) => reply.code(201).send(await servicio.inscribir(idDe(request), request.body)));

    app.get("/api/instructor/clases", async (request) => servicio.clasesDeInstructor(request.usuario!.id));

    app.get("/api/clases/:id/qr", async (request: ConId, reply) =>
      reply.header("Cache-Control", "no-store").send(await servicio.qr(idDe(request), request.usuario!)));
  };
}
