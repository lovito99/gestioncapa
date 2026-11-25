import { env } from '../config/env.js';
import { pagosController } from '../controllers/pagos/pagosController.js';
import * as culqi from '../providers/pagos/culqi.js';
import * as izipay from '../providers/pagos/izipay.js';
import * as proveedorHttp from '../providers/pagos/proveedorHttp.js';
import * as sesion from '../providers/pagos/sesionCifrada.js';
import * as consultas from '../repositories/pagos/consultasPagoRepository.js';
import * as pagos from '../repositories/pagos/pagosRepository.js';
import * as transferencias from '../repositories/pagos/transferenciasRepository.js';
import * as vouchers from '../repositories/pagos/vouchersRepository.js';
import { crearCotizacionPago } from '../services/pagos/cotizacionPago.js';
import { crearPagosService } from '../services/pagos/pagosService.js';
import { crearPasarelasService } from '../services/pagos/pasarelasService.js';
import { procesarColaCorreo } from './notificaciones.routes.js';

// Se pasa el objeto env, no una copia: habilitaciones, credenciales y entorno se leen en cada uso.
const pasarelas = crearPasarelasService({ configuracion: env, pagos, consultas, izipay, culqi, proveedorHttp, sesion });
const servicio = crearPagosService({
  configuracion: env,
  pasarelas,
  cotizacion: crearCotizacionPago(env),
  pagos, consultas, transferencias, vouchers, procesarColaCorreo
});

export const registrarPagos = pagosController(servicio);

/** Piezas compuestas para los procesos periódicos, los scripts y las pruebas. */
export const { recuperarOperaciones, enviarNotificacionesPago, ofrecerTransferencia, declararTransferencia, revisarTransferencia,
  listarTransferencias, reponerVoucher } = servicio;
export const { conciliarOperacion } = pasarelas;
