import type { Rol } from "./autorizacion.js";

export type Metodo = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type Permiso = {
  metodo: Metodo;
  ruta: string;
  acceso: "publico" | "autenticado" | Rol[];
  /** Acción que crea, modifica o registra datos de negocio. */
  critica?: boolean;
};

const rolesGestionClases: Rol[] = ["ADMIN", "COORDINADOR"];

/**
 * Única fuente de verdad de quién puede llamar a cada ruta (docs/API.md y
 * `exigirRol` de la simulación MSW). Toda ruta registrada debe figurar aquí:
 * de lo contrario el servidor no arranca.
 */
export const permisos: Permiso[] = [
  { metodo: "GET", ruta: "/api/catalogo/cursos/pagina", acceso: "autenticado" },
  { metodo: "POST", ruta: "/api/cursos/:id/inscribirme", acceso: ["PARTICIPANTE"], critica: true },
  { metodo: "GET", ruta: "/api/colegiados", acceso: ["ADMIN"] },
  { metodo: "GET", ruta: "/api/colegiados/:usuarioId/historial", acceso: ["ADMIN", "PARTICIPANTE"] },
  { metodo: "GET", ruta: "/api/colegiados/:usuarioId/historial/pdf", acceso: ["ADMIN", "PARTICIPANTE"] },
  { metodo: "GET", ruta: "/api/colegiados/:usuarioId/certificados/:certificadoId/archivo", acceso: ["ADMIN", "PARTICIPANTE"] },
  { metodo: "GET", ruta: "/api/cursos", acceso: ["ADMIN", "INSTRUCTOR"] },
  { metodo: "GET", ruta: "/api/cursos/instructores", acceso: ["ADMIN"] },
  { metodo: "POST", ruta: "/api/cursos", acceso: ["ADMIN"], critica: true },
  { metodo: "GET", ruta: "/api/catalogo/cursos", acceso: "autenticado" },
  { metodo: "GET", ruta: "/api/cursos/:id", acceso: "autenticado" },
  { metodo: "POST", ruta: "/api/cursos/:id/publicar", acceso: ["ADMIN"], critica: true },
  { metodo: "POST", ruta: "/api/cursos/:id/modulos/:moduloId/materiales", acceso: ["INSTRUCTOR"], critica: true },
  { metodo: "GET", ruta: "/api/cursos/:id/modulos/:moduloId/materiales/:materialId/archivo", acceso: "autenticado" },
  { metodo: "GET", ruta: "/api/reuniones", acceso: "autenticado" },
  { metodo: "POST", ruta: "/api/reuniones", acceso: rolesGestionClases, critica: true },
  { metodo: "GET", ruta: "/api/reuniones/:identificador", acceso: "autenticado" },
  { metodo: "PATCH", ruta: "/api/reuniones/:identificador", acceso: ["ADMIN", "COORDINADOR", "INSTRUCTOR"], critica: true },
  ...["iniciar", "cancelar", "finalizar", "credencial"].map(accion => ({ metodo: "POST" as const, ruta: `/api/reuniones/:identificador/${accion}`, acceso: (accion === "credencial" ? "autenticado" : ["ADMIN", "COORDINADOR", "INSTRUCTOR"]) as Permiso["acceso"], critica: true })),
  { metodo: "PATCH", ruta: "/api/reuniones/:identificador/politicas", acceso: ["ADMIN", "COORDINADOR", "INSTRUCTOR"], critica: true },
  { metodo: "GET", ruta: "/api/reuniones/:identificador/participantes", acceso: "autenticado" },
  { metodo: "POST", ruta: "/api/reuniones/:identificador/participantes/:usuarioIdentificador/retirar", acceso: ["ADMIN", "COORDINADOR", "INSTRUCTOR"], critica: true },

  { metodo: "GET", ruta: "/health", acceso: "publico" },
  { metodo: "GET", ruta: "/api/health", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/login", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/logout", acceso: "autenticado" },
  { metodo: "GET", ruta: "/api/auth/me", acceso: "autenticado" },

  { metodo: "GET", ruta: "/api/instructores", acceso: rolesGestionClases },
  { metodo: "GET", ruta: "/api/clases", acceso: rolesGestionClases },
  { metodo: "GET", ruta: "/api/clases/:id", acceso: ["ADMIN", "COORDINADOR", "INSTRUCTOR"] },
  { metodo: "POST", ruta: "/api/clases", acceso: rolesGestionClases, critica: true },
  { metodo: "PUT", ruta: "/api/clases/:id", acceso: rolesGestionClases, critica: true },
  { metodo: "POST", ruta: "/api/clases/:id/cancelar", acceso: rolesGestionClases, critica: true },
  { metodo: "GET", ruta: "/api/clases/:id/inscritos", acceso: rolesGestionClases },
  { metodo: "POST", ruta: "/api/clases/:id/inscritos", acceso: rolesGestionClases, critica: true },
  { metodo: "GET", ruta: "/api/clases/:id/asistencia", acceso: rolesGestionClases },

  { metodo: "GET", ruta: "/api/instructor/clases", acceso: ["INSTRUCTOR"] },
  { metodo: "GET", ruta: "/api/clases/:id/qr", acceso: ["ADMIN", "INSTRUCTOR"], critica: true },

  { metodo: "GET", ruta: "/api/participante/clases", acceso: ["PARTICIPANTE"] },
  { metodo: "POST", ruta: "/api/asistencia/marcar", acceso: ["PARTICIPANTE"], critica: true }
];

export function buscarPermiso(metodo: string, ruta: string) {
  // Fastify crea HEAD automáticamente para cada GET: hereda su permiso.
  const equivalente = metodo === "HEAD" ? "GET" : metodo;
  return permisos.find((permiso) => permiso.metodo === equivalente && permiso.ruta === ruta);
}
