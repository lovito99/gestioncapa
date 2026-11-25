import { env } from "../config/env.js";
import { jitsiEventosController } from "../controllers/jitsi/jitsiEventosController.js";
import { crearConexionesRepository } from "../repositories/jitsi/conexionesRepository.js";
import { crearEventosJitsiService } from "../services/jitsi/eventosJitsiService.js";
import { pool } from "../shared/database.js";

/** Se pasa el objeto env, no una copia: el secreto se lee en cada solicitud. */
export const registrarEventosJitsi = jitsiEventosController(crearEventosJitsiService({
  repositorio: crearConexionesRepository(pool),
  configuracion: env
}));
