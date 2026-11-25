import { env } from "../config/env.js";
import { reunionesController } from "../controllers/reuniones/reunionesController.js";
import { emitirCredencialJitsi } from "../providers/jitsi/credencialJitsi.js";
import { reunionesRepository } from "../repositories/reuniones/reunionesRepository.js";
import { crearReunionesService } from "../services/reuniones/reunionesService.js";

// Se pasa el objeto env, no una copia: la configuración de Jitsi se lee en cada solicitud.
export const registrarRutasReuniones = reunionesController(crearReunionesService({
  repositorio: reunionesRepository,
  emitirCredencial: emitirCredencialJitsi,
  configuracion: env
}));
