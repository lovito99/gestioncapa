import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify";
import { buscarPermiso } from "./permisos.js";

export type Rol = "ADMIN" | "COORDINADOR" | "INSTRUCTOR" | "PARTICIPANTE";

export type UsuarioAutenticado = {
  id: number;
  name: string;
  email: string;
  role: string;
};

/** Debe devolver null si el usuario no existe o está inactivo. */
export type BuscarUsuario = (id: number) => Promise<UsuarioAutenticado | null>;

declare module "fastify" {
  interface FastifyRequest {
    usuario?: UsuarioAutenticado;
  }
}

const noAutenticado = (reply: FastifyReply) =>
  reply.code(401).send({
    code: "NO_AUTENTICADO",
    message: "Tu sesión expiró. Vuelve a iniciar sesión."
  });

/**
 * Crea el guard de roles: sin sesión válida → 401, rol incorrecto → 403.
 * El usuario se lee de la base en cada request para que desactivarlo surta efecto
 * aunque su JWT siga vigente. Sin roles, basta con estar autenticado.
 */
export function crearGuard(buscarUsuario: BuscarUsuario) {
  return (...roles: Rol[]): preHandlerAsyncHookHandler =>
    async function guard(request: FastifyRequest, reply: FastifyReply) {
      let id: number;

      try {
        // Rechaza token ausente, expirado o con otra firma.
        const payload = await request.jwtVerify<{ sub: string }>();
        id = Number(payload.sub);
      } catch {
        return noAutenticado(reply);
      }

      const usuario = Number.isInteger(id) ? await buscarUsuario(id) : null;

      if (!usuario) {
        return noAutenticado(reply);
      }

      if (roles.length > 0 && !roles.includes(usuario.role.toUpperCase() as Rol)) {
        return reply.code(403).send({
          code: "SIN_PERMISO",
          message: "No tienes permiso para realizar esta acción."
        });
      }

      request.usuario = usuario;
    };
}

/**
 * Aplica el guard de la matriz de permisos a cada ruta que se registre después.
 * Una ruta que no figura en la matriz detiene el arranque: no hay rutas abiertas
 * por omisión. El guard corre antes del handler, así que un 401/403 no modifica datos.
 */
export function registrarAutorizacion(app: FastifyInstance, buscarUsuario: BuscarUsuario) {
  const requerirRol = crearGuard(buscarUsuario);

  app.addHook("onRoute", (opciones) => {
    const metodos = [opciones.method].flat();

    // Las preflight de CORS nunca llevan credenciales.
    if (metodos.every((metodo) => metodo === "OPTIONS")) {
      return;
    }

    for (const metodo of metodos) {
      const permiso = buscarPermiso(metodo, opciones.url);

      if (!permiso) {
        throw new Error(
          `Ruta sin permiso declarado: ${metodo} ${opciones.url}. Agrégala a backend/src/plugins/permisos.ts.`
        );
      }

      if (permiso.acceso === "publico") {
        continue;
      }

      const guard = permiso.acceso === "autenticado" ? requerirRol() : requerirRol(...permiso.acceso);
      opciones.preHandler = [guard, ...[opciones.preHandler ?? []].flat()];
      return;
    }
  });
}
