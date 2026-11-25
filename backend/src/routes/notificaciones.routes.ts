import { env } from "../config/env.js";
import { correoController } from "../controllers/notificaciones/correoController.js";
import { crearTransporteSmtp } from "../providers/notificaciones/smtpProvider.js";
import { colaCorreoRepository } from "../repositories/notificaciones/colaCorreoRepository.js";
import { consultaCorreoRepository } from "../repositories/notificaciones/consultaCorreoRepository.js";
import { crearColaCorreoService } from "../services/notificaciones/colaCorreoService.js";
import { crearConsultaCorreoService } from "../services/notificaciones/consultaCorreoService.js";

// Se pasa el objeto env, no una copia: la configuración de correo se lee en cada ciclo.
export const registrarCorreo = correoController(crearConsultaCorreoService({ repositorio: consultaCorreoRepository, configuracion: env }));

/** Cola de correo compuesta para los procesos periódicos y los avisos de pagos. */
export const { procesarColaCorreo } = crearColaCorreoService({
  repositorio: colaCorreoRepository,
  crearTransporte: () => crearTransporteSmtp(env),
  configuracion: env
});
