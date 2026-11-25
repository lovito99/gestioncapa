import type { FastifyPluginAsync } from "fastify";
import { esquemaBuscarDni, esquemaRegistroPuerta, idMarcaPuerta, rutaPuerta } from "../../dto/asistencia/asistenciaPuertaDto.js";
import { leerIdClase } from "../../dto/clases/claseDto.js";
import type { crearAsistenciaPuertaService } from "../../services/asistencia/asistenciaPuertaService.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";

export function asistenciaPuertaController(
  servicio: ReturnType<typeof crearAsistenciaPuertaService>,
  limitarBusqueda: (actorId: number) => Promise<number>
): FastifyPluginAsync {
  return async (app) => {
    app.addHook("onRequest", async (_request, reply) => {
      reply.header("Cache-Control", "private, no-store");
    });
    app.get("/api/instructor/clases/puerta", (request) => servicio.delegadas(request.usuario!.id));
    app.get<{ Params: { id: string } }>(rutaPuerta, (request) =>
      servicio.contexto(leerIdClase(request.params.id), request.usuario!));
    app.post<{ Params: { id: string } }>(`${rutaPuerta}/buscar-dni`, { bodyLimit: 512 }, async (request, reply) => {
      const espera = await limitarBusqueda(request.usuario!.id);
      if (espera) {
        reply.header("Retry-After", String(espera));
        throw new ErrorAplicacion(429, "LIMITE_PETICIONES", "Has realizado muchas búsquedas. Espera un momento y vuelve a intentar.");
      }
      const datos = esquemaBuscarDni.safeParse(request.body);
      if (!datos.success) throw new ErrorAplicacion(422, "DNI_INVALIDO", "Ingresa los ocho dígitos del DNI.");
      return servicio.buscarDni(leerIdClase(request.params.id), request.usuario!, datos.data.dni);
    });
    app.post<{ Params: { id: string } }>(rutaPuerta, { bodyLimit: 512 }, async (request, reply) => {
      const datos = esquemaRegistroPuerta.safeParse(request.body);
      if (!datos.success) throw new ErrorAplicacion(422, "VALIDACION", "Envía un código QR personal o selecciona un inscrito.");
      const claseId = leerIdClase(request.params.id);
      const marca = await servicio.registrar(claseId, request.usuario!, datos.data);
      request.log.info({ claseId, marcaId: marca.marcaId, actorId: request.usuario!.id, metodo: marca.metodo }, "Asistencia registrada en puerta");
      return reply.code(201).send(marca);
    });
    app.delete<{ Params: { id: string; marcaId: string } }>(`${rutaPuerta}/:marcaId`, async (request, reply) => {
      const marca = idMarcaPuerta.safeParse(request.params.marcaId);
      if (!marca.success) throw new ErrorAplicacion(404, "MARCA_NO_EXISTE", "La marca no existe.");
      const claseId = leerIdClase(request.params.id);
      await servicio.deshacer(claseId, request.usuario!, marca.data);
      request.log.info({ claseId, marcaId: marca.data, actorId: request.usuario!.id }, "Asistencia rectificada en puerta");
      return reply.code(204).send();
    });
  };
}
