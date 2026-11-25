import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { CursosService } from "../../services/cursos/cursosService.js";

type ConId = FastifyRequest<{ Params: { id: string; moduloId?: string; materialId?: string } }>;
type ConPortada = FastifyRequest<{ Params: { id: string; version: string; variante: string } }>;

/** `limiteCuerpoPortada` admite la portada en base64 dentro del JSON. */
export function cursosController(servicio: CursosService, opciones: { limiteCuerpoPortada: number }): FastifyPluginAsync {
  return async (app) => {
    app.put("/api/cursos/:id/portada", { bodyLimit: opciones.limiteCuerpoPortada }, async (request: ConId) => {
      const resultado = await servicio.guardarPortada(request.params.id, request.body);
      request.log.info({ cursoId: request.params.id, usuarioId: request.usuario!.id }, "Portada guardada");
      return resultado;
    });

    app.delete("/api/cursos/:id/portada", async (request: ConId, reply) => {
      await servicio.retirarPortada(request.params.id);
      request.log.info({ cursoId: request.params.id, usuarioId: request.usuario!.id }, "Portada retirada");
      return reply.code(204).send();
    });

    app.get("/api/cursos/:id/portada", async (request: ConId, reply) => {
      reply.header("Cache-Control", "private, no-store");
      const archivo = await servicio.portadaPrivada(request.params.id, request.usuario!);
      return reply.type("image/jpeg").header("X-Content-Type-Options", "nosniff").send(archivo);
    });

    app.get("/api/publico/cursos/:id/portada/:version/:variante", async (request: ConPortada, reply) => {
      const { id, version, variante } = request.params;
      const { archivo, tipo, etiqueta } = await servicio.portadaPublica(id, version, variante);
      // La URL cambia con cada versión; aun así se revalida para no servir un curso que dejó de estar publicado.
      reply.header("Cache-Control", "public, no-cache").header("ETag", etiqueta).header("X-Content-Type-Options", "nosniff");
      if (request.headers["if-none-match"] === etiqueta) return reply.code(304).send();
      return reply.type(tipo).send(archivo);
    });

    app.patch("/api/cursos/:id/cobro", async (request: ConId) => servicio.cambiarCobro(request.params.id, request.usuario!, request.body));

    app.get("/api/publico/cursos", async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      return servicio.catalogoPublico(request.query);
    });

    app.get("/api/publico/cursos/:id", async (request: ConId, reply) => {
      reply.header("Cache-Control", "no-store");
      return servicio.cursoPublico(request.params.id);
    });

    app.get("/api/publico/cursos/:id/compartir", async (request: ConId, reply) => {
      reply.header("Cache-Control", "no-store");
      return servicio.compartir(request.params.id);
    });

    app.get("/api/cursos/instructores", async () => servicio.instructores());
    app.get("/api/cursos", async (request) => servicio.listar(request.usuario!));
    app.get("/api/catalogo/cursos", async () => servicio.catalogo());

    app.get("/api/catalogo/cursos/pagina", async (request, reply) => {
      reply.header("Cache-Control", "private, no-store");
      return servicio.paginaCatalogo(request.usuario!, request.query);
    });

    app.post("/api/cursos/:id/inscribirme", async (request: ConId, reply) => {
      const resultado = await servicio.inscribirme(request.params.id, request.usuario!, request.body);
      reply.header("Cache-Control", "private, no-store");
      if ("impedimento" in resultado) {
        const { estado, codigo, mensaje } = resultado.impedimento;
        return reply.code(estado).send({ code: codigo, message: mensaje });
      }
      return reply.code(resultado.nueva ? 201 : 200).send(resultado.cuerpo);
    });

    app.post("/api/cursos", { bodyLimit: opciones.limiteCuerpoPortada }, async (request, reply) => {
      const { id, conPortada, curso } = await servicio.crear(request.body, request.usuario!.id);
      if (conPortada) request.log.info({ cursoId: id, usuarioId: request.usuario!.id }, "Curso creado con portada");
      return reply.code(201).send(curso);
    });

    app.get("/api/cursos/:id", async (request: ConId, reply) =>
      reply.header("Cache-Control", "private, no-store").send(await servicio.detalle(request.params.id, request.usuario!)));

    app.get("/api/cursos/:id/mi-asistencia", async (request: ConId, reply) =>
      reply.header("Cache-Control", "private, no-store").send(await servicio.miAsistencia(request.params.id, request.usuario!)));

    app.post("/api/cursos/:id/sesiones", async (request: ConId, reply) =>
      reply.code(201).send(await servicio.programarSesion(request.params.id, request.usuario!, request.body)));

    app.post("/api/cursos/:id/publicar", async (request: ConId) => servicio.publicar(request.params.id, request.usuario!));

    app.post("/api/cursos/:id/modulos/:moduloId/materiales", { bodyLimit: 8 * 1024 * 1024 }, async (request: ConId, reply) =>
      reply.code(201).send(await servicio.agregarMaterial(request.params.id, request.params.moduloId, request.usuario!, request.body)));

    app.get("/api/cursos/:id/modulos/:moduloId/materiales/:materialId/archivo", async (request: ConId, reply) => {
      const archivo = await servicio.archivoMaterial(request.params.id, request.params.moduloId, request.params.materialId, request.usuario!);
      return reply.header("Cache-Control", "private, no-store").header("Content-Disposition", 'attachment; filename="material.pdf"').type("application/pdf").send(archivo);
    });
  };
}
