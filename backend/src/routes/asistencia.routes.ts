import { env } from "../config/env.js";
import { pool } from "../shared/database.js";
import { reloj, verificarTokenQr } from "../services/qr/qrToken.js";
import { asistenciaController } from "../controllers/asistencia/asistenciaController.js";
import { crearAsistenciaRepository } from "../repositories/asistencia/asistenciaRepository.js";
import { crearAsistenciaService } from "../services/asistencia/asistenciaService.js";

/** Raíz de composición: el único lugar del módulo que conoce el pool, el secreto del QR y el reloj. */
export const asistenciaRoutes = asistenciaController(crearAsistenciaService({
  repositorio: crearAsistenciaRepository(pool),
  // reloj.ahora se lee en cada llamada: las pruebas lo sustituyen para simular el vencimiento.
  verificarQr: (token) => verificarTokenQr(token, reloj.ahora(), env.QR_SECRET)
}));
