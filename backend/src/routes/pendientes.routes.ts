import { permisos } from "../plugins/permisos.js";
import { pendientesController } from "../controllers/pendientes/pendientesController.js";

/** Las rutas del contrato salen de la matriz de permisos, la misma que aplica el guard. */
export const rutasPendientes = pendientesController(permisos);
