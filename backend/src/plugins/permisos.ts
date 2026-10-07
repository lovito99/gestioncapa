import type { Rol } from "./autorizacion.js";

export type Metodo = "GET" | "POST" | "PUT" | "DELETE";

export type Permiso = {
  metodo: Metodo;
  ruta: string;
  acceso: "publico" | "autenticado" | Rol[];
  /** Acción que crea, modifica o registra datos de negocio. */
  critica?: boolean;
};

const COORDINADOR: Rol[] = ["COORDINADOR"];

/**
 * Única fuente de verdad de quién puede llamar a cada ruta (docs/API.md y
 * `exigirRol` de la simulación MSW). Toda ruta registrada debe figurar aquí:
 * de lo contrario el servidor no arranca.
 */
export const permisos: Permiso[] = [
  { metodo: "GET", ruta: "/health", acceso: "publico" },
  { metodo: "GET", ruta: "/api/health", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/login", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/logout", acceso: "autenticado" },
  { metodo: "GET", ruta: "/api/auth/me", acceso: "autenticado" },

  { metodo: "GET", ruta: "/api/instructores", acceso: COORDINADOR },
  { metodo: "GET", ruta: "/api/clases", acceso: COORDINADOR },
  { metodo: "GET", ruta: "/api/clases/:id", acceso: ["COORDINADOR", "INSTRUCTOR"] },
  { metodo: "POST", ruta: "/api/clases", acceso: COORDINADOR, critica: true },
  { metodo: "PUT", ruta: "/api/clases/:id", acceso: COORDINADOR, critica: true },
  { metodo: "POST", ruta: "/api/clases/:id/cancelar", acceso: COORDINADOR, critica: true },
  { metodo: "GET", ruta: "/api/clases/:id/inscritos", acceso: COORDINADOR },
  { metodo: "POST", ruta: "/api/clases/:id/inscritos", acceso: COORDINADOR, critica: true },
  { metodo: "GET", ruta: "/api/clases/:id/asistencia", acceso: COORDINADOR },

  { metodo: "GET", ruta: "/api/instructor/clases", acceso: ["INSTRUCTOR"] },
  { metodo: "GET", ruta: "/api/clases/:id/qr", acceso: ["INSTRUCTOR"], critica: true },

  { metodo: "GET", ruta: "/api/participante/clases", acceso: ["PARTICIPANTE"] },
  { metodo: "POST", ruta: "/api/asistencia/marcar", acceso: ["PARTICIPANTE"], critica: true }
];

export function buscarPermiso(metodo: string, ruta: string) {
  // Fastify crea HEAD automáticamente para cada GET: hereda su permiso.
  const equivalente = metodo === "HEAD" ? "GET" : metodo;
  return permisos.find((permiso) => permiso.metodo === equivalente && permiso.ruta === ruta);
}
