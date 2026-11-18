import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { cotizarImporte, ErrorPago, type EntradaIntento, type InstrumentoPago, type Pago } from './pagos.modelo.js';

export type OpcionPasarela = {
  medio: string; nombre: string; comercio: string; instrumento: InstrumentoPago; puntosBase: number;
};

function firmar(pago: Pago, opcion: OpcionPasarela, vence: number) {
  return createHmac('sha256', env.JWT_SECRET).update(JSON.stringify([
    'gestioncapa/cotizacion/v1', pago.id, env.pagosEntorno, opcion.medio, opcion.comercio,
    opcion.instrumento, opcion.puntosBase, pago.importeCentimos, pago.moneda, vence,
  ])).digest();
}

export function cotizarOpcion(pago: Pago, opcion: OpcionPasarela) {
  const vence = Math.floor(Date.now() / 60000) * 60000 + 300000;
  return {
    medio: opcion.medio, nombre: opcion.nombre, instrumento: opcion.instrumento,
    ...cotizarImporte(pago.importeCentimos, opcion.puntosBase),
    cotizacion: `${vence}.${firmar(pago, opcion, vence).toString('hex')}`,
  };
}

export function aceptarCotizacion(pago: Pago, entrada: EntradaIntento, opciones: readonly OpcionPasarela[]) {
  const opcion = opciones.find(({ instrumento }) => instrumento === entrada.instrumento);
  const partes = entrada.cotizacion?.match(/^(\d{1,15})\.([a-f0-9]{64})$/);
  const vence = Number(partes?.[1]);
  if (!opcion || !partes || vence <= Date.now()
    || !timingSafeEqual(firmar(pago, opcion, vence), Buffer.from(partes[2]!, 'hex'))) {
    throw new ErrorPago(409, 'COTIZACION_CAMBIO', 'Revisa la opción y el total actualizado antes de confirmar.');
  }
  const { comisionCentimos, totalCentimos } = cotizarImporte(pago.importeCentimos, opcion.puntosBase);
  const ordenExterna = `GC${randomBytes(8).readBigUInt64BE().toString(36).toUpperCase().padStart(13, '0')}`;
  return { instrumento: opcion.instrumento, comercio: opcion.comercio, comisionCentimos, totalCentimos, ordenExterna };
}
