import type { Rol } from "./autorizacion.js";

export type Metodo = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type Permiso = {
  metodo: Metodo;
  ruta: string;
  acceso: "publico" | "autenticado" | "revocarSesion" | Rol[];
  /** Acción que crea, modifica o registra datos de negocio. */
  critica?: boolean;
};

const rolesGestionClases: Rol[] = ["ADMIN"];

/**
 * Única fuente de verdad de quién puede llamar a cada ruta (docs/API.md y
 * `exigirRol` de la simulación MSW). Toda ruta registrada debe figurar aquí:
 * de lo contrario el servidor no arranca.
 */
export const permisos: Permiso[] = [
  { metodo: 'GET', ruta: '/api/cursos/:id/lecciones', acceso: ['INSTRUCTOR', 'AGREMIADO'] },
  { metodo: 'POST', ruta: '/api/cursos/:id/lecciones', acceso: ['INSTRUCTOR'], critica: true },
  { metodo: 'PUT', ruta: '/api/cursos/:id/lecciones/orden', acceso: ['INSTRUCTOR'], critica: true },
  { metodo: 'PUT', ruta: '/api/cursos/:id/lecciones/:leccionId/pdf', acceso: ['INSTRUCTOR'], critica: true },
  { metodo: 'GET', ruta: '/api/cursos/:id/lecciones/:leccionId/pdf', acceso: ['INSTRUCTOR', 'AGREMIADO'] },
  { metodo: 'PUT', ruta: '/api/cursos/:id/lecciones/:leccionId/estado', acceso: ['AGREMIADO'], critica: true },
  { metodo: 'GET', ruta: '/api/cursos/:id/avance/:usuarioId', acceso: ['AGREMIADO'] },
  { metodo: 'GET', ruta: '/api/cursos/:id/avance/gestion', acceso: ['ADMIN', 'INSTRUCTOR'] },
  { metodo: 'GET', ruta: '/api/cursos/:id/avance/materiales/:materialId', acceso: ['AGREMIADO'] },
  { metodo: 'POST', ruta: '/api/cursos/:id/avance/materiales/:materialId/visto', acceso: ['AGREMIADO'], critica: true },
  { metodo: 'PUT', ruta: '/api/cursos/:id/avance/materiales/:materialId', acceso: ['INSTRUCTOR'], critica: true },
  { metodo: 'POST', ruta: '/api/cursos/:id/avance/activar', acceso: ['ADMIN'], critica: true },
  { metodo: 'POST', ruta: '/api/cursos/:id/avance/materiales/:materialId/reproducir', acceso: ['AGREMIADO'], critica: true },
  { metodo: 'POST', ruta: '/api/cursos/:id/avance/materiales/:materialId/progreso', acceso: ['AGREMIADO'], critica: true },
  { metodo: 'GET', ruta: '/api/cursos/:id/politica-evaluacion', acceso: ['ADMIN'] },
  { metodo: 'PATCH', ruta: '/api/cursos/:id/politica-evaluacion', acceso: ['ADMIN'], critica: true },
  { metodo: 'GET', ruta: '/api/cursos/:id/evaluaciones/gestion', acceso: ['INSTRUCTOR'] },
  { metodo: 'POST', ruta: '/api/cursos/:id/evaluaciones/gestion', acceso: ['INSTRUCTOR'], critica: true },
  { metodo: 'PUT', ruta: '/api/cursos/:id/evaluaciones/:evaluacionId', acceso: ['INSTRUCTOR'], critica: true },
  { metodo: 'POST', ruta: '/api/cursos/:id/evaluaciones/:evaluacionId/publicar', acceso: ['INSTRUCTOR'], critica: true },
  { metodo: 'GET', ruta: '/api/cursos/:id/evaluaciones', acceso: ['AGREMIADO'] },
  { metodo: 'GET', ruta: '/api/cursos/:id/evaluaciones/:evaluacionId', acceso: ['AGREMIADO'] },
  { metodo: 'POST', ruta: '/api/cursos/:id/evaluaciones/lecciones/:leccionId/completar', acceso: ['AGREMIADO'], critica: true },
  { metodo: 'POST', ruta: '/api/cursos/:id/evaluaciones/:evaluacionId/intentos', acceso: ['AGREMIADO'], critica: true },
  { metodo:'GET',ruta:'/api/pagos/:id',acceso:['ADMIN','AGREMIADO'] },
  { metodo:'POST',ruta:'/api/pagos/:id/intentos',acceso:['AGREMIADO'],critica:true },
  { metodo:'POST',ruta:'/api/pagos/:id/intentos/:operacionId/sesion',acceso:['AGREMIADO'],critica:true },
  { metodo:'GET',ruta:'/api/pagos/:id/comprobante',acceso:['ADMIN','AGREMIADO'] },
  { metodo:'POST',ruta:'/api/pagos/:id/efectivo',acceso:['ADMIN'],critica:true },
  { metodo:'POST',ruta:'/api/pagos/:id/transferencias',acceso:['AGREMIADO'],critica:true },
  { metodo:'GET',ruta:'/api/pagos/:id/transferencias/:operacionId/voucher',acceso:['ADMIN','AGREMIADO'] },
  { metodo:'PUT',ruta:'/api/pagos/:id/transferencias/:operacionId/voucher',acceso:['AGREMIADO'],critica:true },
  { metodo:'POST',ruta:'/api/pagos/:id/transferencias/:operacionId/revision',acceso:['ADMIN'],critica:true },
  { metodo:'POST',ruta:'/api/pagos/:id/conciliar',acceso:['ADMIN'],critica:true },
  { metodo:'POST',ruta:'/api/pagos/notificaciones/:proveedor',acceso:'publico',critica:true },
  { metodo:'GET',ruta:'/api/admin/notificaciones/correo',acceso:['ADMIN'] },
  { metodo: 'GET', ruta: '/api/usuarios', acceso: ['ADMIN'] },
  { metodo: 'POST', ruta: '/api/usuarios', acceso: ['ADMIN'], critica: true },
  { metodo: 'PUT', ruta: '/api/usuarios/:id', acceso: ['ADMIN'], critica: true },
  { metodo: 'GET', ruta: '/api/certificados/:codigo', acceso: 'publico' },
  ...['archivo','documento'].map(accion => ({ metodo: 'GET' as const, ruta: `/api/certificados/:codigo/${accion}`, acceso: ['ADMIN','AGREMIADO'] as Rol[] })),
  ...['anular','corregir'].map(accion => ({ metodo: 'POST' as const, ruta: `/api/certificados/:codigo/${accion}`, acceso: ['ADMIN'] as Rol[], critica: true })),
  ...['cierre','certificados'].map(accion => ({ metodo: 'GET' as const, ruta: `/api/cursos/:id/${accion}`, acceso: ['ADMIN'] as Rol[] })),
  ...['cerrar','excepciones','evaluar-inscripcion'].map(accion => ({ metodo: 'POST' as const, ruta: `/api/cursos/:id/${accion}`, acceso: ['ADMIN'] as Rol[], critica: true })),
  { metodo: "POST", ruta: "/api/auth/registro", acceso: "publico" },
  { metodo: "GET", ruta: "/api/publico/cursos", acceso: "publico" },
  { metodo: "GET", ruta: "/api/publico/cursos/:id", acceso: "publico" },
  { metodo: "GET", ruta: "/api/publico/cursos/:id/compartir", acceso: "publico" },
  { metodo: "GET", ruta: "/api/publico/cursos/:id/portada/:version/:variante", acceso: "publico" },
  { metodo: "GET", ruta: "/api/catalogo/cursos/pagina", acceso: "autenticado" },
  { metodo: "POST", ruta: "/api/cursos/:id/inscribirme", acceso: ["AGREMIADO"], critica: true },
  { metodo: "POST", ruta: "/api/cursos/:id/sesiones", acceso: ["ADMIN"], critica: true },
  { metodo: "GET", ruta: "/api/cursos/:id/mi-asistencia", acceso: ["AGREMIADO"] },
  { metodo: "GET", ruta: "/api/colegiados", acceso: ["ADMIN"] },
  { metodo: "GET", ruta: "/api/colegiados/:usuarioId/historial", acceso: ["ADMIN", "AGREMIADO"] },
  { metodo: "GET", ruta: "/api/colegiados/:usuarioId/historial/pdf", acceso: ["ADMIN", "AGREMIADO"] },
  { metodo: "GET", ruta: "/api/colegiados/:usuarioId/certificados/:certificadoId/archivo", acceso: ["ADMIN", "AGREMIADO"] },
  { metodo: "GET", ruta: "/api/cursos", acceso: ["ADMIN", "INSTRUCTOR"] },
  { metodo: "GET", ruta: "/api/cursos/instructores", acceso: ["ADMIN"] },
  { metodo: "POST", ruta: "/api/cursos", acceso: ["ADMIN"], critica: true },
  { metodo: 'PATCH', ruta: '/api/cursos/:id/cobro', acceso: ['ADMIN'], critica: true },
  { metodo: "GET", ruta: "/api/catalogo/cursos", acceso: "autenticado" },
  { metodo: "GET", ruta: "/api/cursos/:id", acceso: "autenticado" },
  { metodo: "GET", ruta: "/api/cursos/:id/portada", acceso: "autenticado" },
  { metodo: "PUT", ruta: "/api/cursos/:id/portada", acceso: ["ADMIN"], critica: true },
  { metodo: "DELETE", ruta: "/api/cursos/:id/portada", acceso: ["ADMIN"], critica: true },
  { metodo: "POST", ruta: "/api/cursos/:id/publicar", acceso: ["ADMIN"], critica: true },
  { metodo: "POST", ruta: "/api/cursos/:id/modulos/:moduloId/materiales", acceso: ["INSTRUCTOR"], critica: true },
  { metodo: "GET", ruta: "/api/cursos/:id/modulos/:moduloId/materiales/:materialId/archivo", acceso: "autenticado" },
  { metodo: "GET", ruta: "/api/reuniones", acceso: "autenticado" },
  // HU-26: el instructor crea la reunión de las sesiones que dicta; la ruta comprueba la asignación.
  { metodo: "POST", ruta: "/api/reuniones", acceso: ["ADMIN", "INSTRUCTOR"], critica: true },
  { metodo: "GET", ruta: "/api/reuniones/:identificador/asistencia", acceso: ["ADMIN", "INSTRUCTOR"] },
  // Webhook de Prosody: sin sesión de usuario, autenticado con jitsiEventosSecreto en la ruta.
  ...["occupant/joined", "occupant/left", "room/created", "room/destroyed"].map(evento => ({ metodo: "POST" as const, ruta: `/api/jitsi/events/${evento}`, acceso: "publico" as const, critica: true })),
  { metodo: "GET", ruta: "/api/reuniones/:identificador", acceso: "autenticado" },
  { metodo: "PATCH", ruta: "/api/reuniones/:identificador", acceso: ["ADMIN", "INSTRUCTOR"], critica: true },
  ...["iniciar", "cancelar", "finalizar", "credencial"].map(accion => ({ metodo: "POST" as const, ruta: `/api/reuniones/:identificador/${accion}`, acceso: (accion === "credencial" ? "autenticado" : ["ADMIN", "INSTRUCTOR"]) as Permiso["acceso"], critica: true })),
  { metodo: "PATCH", ruta: "/api/reuniones/:identificador/politicas", acceso: ["ADMIN", "INSTRUCTOR"], critica: true },
  { metodo: "GET", ruta: "/api/reuniones/:identificador/participantes", acceso: "autenticado" },
  { metodo: "POST", ruta: "/api/reuniones/:identificador/participantes/:usuarioIdentificador/retirar", acceso: ["ADMIN", "INSTRUCTOR"], critica: true },

  { metodo: "GET", ruta: "/health", acceso: "publico" },
  { metodo: "GET", ruta: "/api/health", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/login", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/logout", acceso: "revocarSesion" },
  { metodo: "GET", ruta: "/api/auth/google/estado", acceso: "publico" },
  { metodo: "GET", ruta: "/api/auth/google/callback", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/google/iniciar", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/google/continuar", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/google/vincular", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/google/registrar", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/google/enviar-codigo", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/google/verificar-correo", acceso: "publico" },
  { metodo: "POST", ruta: "/api/auth/google/cancelar", acceso: "publico" },
  { metodo: "GET", ruta: "/api/auth/me", acceso: "autenticado" },

  { metodo: "GET", ruta: "/api/instructores", acceso: rolesGestionClases },
  { metodo: "GET", ruta: "/api/clases", acceso: rolesGestionClases },
  { metodo: "GET", ruta: "/api/clases/:id", acceso: ["ADMIN", "INSTRUCTOR"] },
  { metodo: "POST", ruta: "/api/clases", acceso: rolesGestionClases, critica: true },
  { metodo: "PUT", ruta: "/api/clases/:id", acceso: rolesGestionClases, critica: true },
  { metodo: "POST", ruta: "/api/clases/:id/cancelar", acceso: rolesGestionClases, critica: true },
  { metodo: "GET", ruta: "/api/clases/:id/inscritos", acceso: rolesGestionClases },
  { metodo: "POST", ruta: "/api/clases/:id/inscritos", acceso: rolesGestionClases, critica: true },
  { metodo: "GET", ruta: "/api/clases/:id/asistencia", acceso: ["ADMIN", "INSTRUCTOR"] },

  { metodo: "GET", ruta: "/api/instructor/clases", acceso: ["INSTRUCTOR"] },
  { metodo: "GET", ruta: "/api/clases/:id/qr", acceso: ["ADMIN", "INSTRUCTOR"], critica: true },

  { metodo: "GET", ruta: "/api/participante/clases", acceso: ["AGREMIADO"] },
  { metodo: "GET", ruta: "/api/instructor/clases/puerta", acceso: ["INSTRUCTOR"] },
  { metodo: "GET", ruta: "/api/clases/:id/asistencia/puerta", acceso: ["ADMIN", "INSTRUCTOR"] },
  { metodo: "POST", ruta: "/api/clases/:id/asistencia/puerta/buscar-dni", acceso: ["ADMIN", "INSTRUCTOR"] },
  { metodo: "POST", ruta: "/api/clases/:id/asistencia/puerta", acceso: ["ADMIN", "INSTRUCTOR"], critica: true },
  { metodo: "DELETE", ruta: "/api/clases/:id/asistencia/puerta/:marcaId", acceso: ["ADMIN", "INSTRUCTOR"], critica: true },
  { metodo: "GET", ruta: "/api/participante/mi-qr", acceso: ["AGREMIADO"] },
  { metodo: "GET", ruta: "/api/participante/mi-qr/pdf", acceso: ["AGREMIADO"] },
  { metodo: "POST", ruta: "/api/asistencia/marcar", acceso: ["AGREMIADO"], critica: true }
];

export function buscarPermiso(metodo: string, ruta: string) {
  // Fastify crea HEAD automáticamente para cada GET: hereda su permiso.
  const equivalente = metodo === "HEAD" ? "GET" : metodo;
  return permisos.find((permiso) => permiso.metodo === equivalente && permiso.ruta === ruta);
}
