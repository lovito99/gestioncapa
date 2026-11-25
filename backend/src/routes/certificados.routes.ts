import { env } from '../config/env.js';
import { certificadosController } from '../controllers/certificados/certificadosController.js';
import { crearConstancia } from '../providers/certificados/constanciaPdf.js';
import * as certificados from '../repositories/certificados/certificadosRepository.js';
import { obtenerCurso } from '../repositories/cursos/cursosRepository.js';
import { crearCertificadosService } from '../services/certificados/certificadosService.js';

const servicio = crearCertificadosService({
  repositorio: certificados,
  // El enlace de verificación usa el origen vigente del frontend en cada emisión.
  crearConstancia: (datos, codigo, emitidoEn) => crearConstancia(datos, codigo, emitidoEn, env.FRONTEND_URL),
  obtenerCurso: (id) => obtenerCurso(id)
});

export const registrarCertificados = certificadosController(servicio);

/** Proceso periódico: emite las constancias cuyo pago ya se confirmó. */
export const { liberarRetenidas } = servicio;
