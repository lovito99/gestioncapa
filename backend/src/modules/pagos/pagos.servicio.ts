import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { pool } from '../../shared/database.js';
import { ErrorPago, type EntradaIntento, type OperacionPago, type Pago } from './pagos.modelo.js';
import { iniciarOperacion, cambiarEstadoOperacion } from './pagos.repositorio.js';
import { aceptarCotizacion, cotizarOpcion } from './pagos.cotizacion.js';
import { pasarelas } from './pagos.pasarelas.js';

export function mediosDisponibles() {
  return { izipay: pasarelas.porMedio('IZIPAY')?.altas() ?? false, culqi: false,
    efectivo: true, transferencia: env.transferenciaHabilitada, entorno: env.pagosEntorno };
}

export function opcionesEnLinea(pago: Pago) {
  return pasarelas.altas().flatMap(pasarela => pasarela.opciones?.(pago) ?? [])
    .map(opcion => cotizarOpcion(pago, opcion));
}

function respuestaSesion(operacion: OperacionPago, datos: unknown) {
  return datos ? {
    sesion: { medio: operacion.medio, datos },
    ...(operacion.medio === 'IZIPAY' && { izipay: datos }),
  } : {};
}

export async function recuperarPagoEnLinea(operacion: OperacionPago) {
  const pasarela = pasarelas.porMedio(operacion.medio);
  const datos = pasarela?.altas() ? await pasarela.recuperar?.(operacion.id) : undefined;
  return { operacionId: operacion.id, estado: operacion.estado, ...respuestaSesion(operacion, datos) };
}

export async function iniciarPago(pago: Pago, usuarioId: number, entrada: EntradaIntento) {
  const pasarela = pasarelas.porMedio(entrada.medio);
  if (!pasarela?.altas() || !pasarela.abrir) {
    const mensaje = entrada.medio === 'CULQI'
      ? 'Culqi se conserva para la conciliación de pagos anteriores.'
      : 'Esta pasarela todavía no está disponible.';
    throw new ErrorPago(503, entrada.medio === 'CULQI' ? 'PASARELA_NO_SELECCIONADA' : 'PASARELA_NO_CONFIGURADA', mensaje);
  }
  if (entrada.token) throw new ErrorPago(422, 'TOKEN_NO_ADMITIDO', 'Completa el pago en el formulario de la pasarela.');
  if (!(await pool.query('select id from "intentosInscripcion" where id=$1', [pago.intentoId])).rowCount) {
    throw new ErrorPago(409, 'CONDICIONES_PENDIENTES', 'Las condiciones de esta inscripción requieren revisión administrativa.');
  }
  const carga = entrada.instrumento || entrada.cotizacion
    ? { medio: entrada.medio, instrumento: entrada.instrumento, cotizacion: entrada.cotizacion }
    : { medio: entrada.medio, token: null };
  const operacion = await iniciarOperacion(pago.id, usuarioId, {
    medio: entrada.medio, clave: entrada.clave, entorno: env.pagosEntorno,
    cargaHash: createHash('sha256').update(JSON.stringify(carga)).digest('hex'),
    cotizar: vigente => aceptarCotizacion(vigente, entrada, pasarela.opciones?.(vigente) ?? []),
  });
  if (!operacion.nueva) return { ...await recuperarPagoEnLinea(operacion), repetida: true };
  try {
    const datos = await pasarela.abrir(operacion, pago);
    return { operacionId: operacion.id, estado: operacion.estado, ...respuestaSesion(operacion, datos) };
  } catch (error) {
    await cambiarEstadoOperacion(operacion.id, 'INCIERTO');
    throw error;
  }
}
