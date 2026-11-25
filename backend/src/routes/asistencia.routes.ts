import { env } from "../config/env.js";
import { pool } from "../shared/database.js";
import { reloj, verificarTokenQr } from "../services/qr/qrToken.js";
import { asistenciaController } from "../controllers/asistencia/asistenciaController.js";
import { crearAsistenciaRepository } from "../repositories/asistencia/asistenciaRepository.js";
import { crearAsistenciaService } from "../services/asistencia/asistenciaService.js";
import { credencialAsistenciaController } from "../controllers/asistencia/credencialAsistenciaController.js";
import { credencialDe } from "../repositories/asistencia/credencialAsistenciaRepository.js";
import { crearCredencialAsistenciaService } from "../services/asistencia/credencialAsistenciaService.js";
import { asistenciaPuertaController } from "../controllers/asistencia/asistenciaPuertaController.js";
import { crearAsistenciaPuertaService } from "../services/asistencia/asistenciaPuertaService.js";
import { asistenciaPuertaRepository } from "../repositories/asistencia/asistenciaPuertaRepository.js";
import { crearCredencialPdf } from "../providers/asistencia/credencialPdf.js";
import { limitarBusquedaDni } from "../repositories/auth/seguridadAccesoRepository.js";

/** Raíz de composición: el único lugar del módulo que conoce el pool, el secreto del QR y el reloj. */
export const asistenciaRoutes = asistenciaController(crearAsistenciaService({
  repositorio: crearAsistenciaRepository(pool),
  // reloj.ahora se lee en cada llamada: las pruebas lo sustituyen para simular el vencimiento.
  verificarQr: (token) => verificarTokenQr(token, reloj.ahora(), env.QR_SECRET)
}));

export const credencialAsistenciaRoutes = credencialAsistenciaController(
  crearCredencialAsistenciaService(credencialDe, env.QR_SECRET),
  crearCredencialPdf
);

export const asistenciaPuertaRoutes = asistenciaPuertaController(
  crearAsistenciaPuertaService(asistenciaPuertaRepository, env.QR_SECRET),
  (usuarioId) => limitarBusquedaDni(env.DB_NAME, usuarioId)
);
