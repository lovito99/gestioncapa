import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { esquemaAlta, esquemaConsulta, esquemaEdicion, esquemaIdUsuario } from "../../dto/usuarios/usuarioDto.js";
import type { UsuariosService } from "../../services/usuarios/usuariosService.js";

/**
 * findUserById devuelve el id bigint de pg como texto aunque su tipo diga number;
 * se normaliza aquí para que el servicio compare números (regla CUENTA_PROPIA).
 */
const actorDe = (request: FastifyRequest) => Number(request.usuario!.id);

// El acceso ADMIN de cada ruta lo aplica la matriz de backend/src/plugins/permisos.ts.
export function usuariosController(servicio: UsuariosService): FastifyPluginAsync {
  return async (app) => {
    app.addHook("onRequest", async (request, reply) => { reply.header("Cache-Control", "private, no-store"); });

    app.get("/api/usuarios", async (request) => servicio.listar(esquemaConsulta.parse(request.query)));

    app.post("/api/usuarios", async (request, reply) =>
      reply.code(201).send(await servicio.crear(esquemaAlta.parse(request.body), actorDe(request))));

    app.put("/api/usuarios/:id", async (request) => {
      const { id } = esquemaIdUsuario.parse(request.params);
      return servicio.actualizar(id, esquemaEdicion.parse(request.body), actorDe(request));
    });
  };
}
