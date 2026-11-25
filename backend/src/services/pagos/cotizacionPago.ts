import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { EntradaIntento } from '../../dto/pagos/pagoDto.js';
import { cotizarImporte, type InstrumentoPago, type Pago } from '../../entities/pagos/pago.js';
import { ErrorPago } from '../../shared/errorPago.js';

export type OpcionPasarela = {
  medio: string; nombre: string; comercio: string; instrumento: InstrumentoPago; puntosBase: number;
};

/** Cotizaciones firmadas: el total mostrado al participante no puede alterarse antes de cobrar. */
export function crearCotizacionPago(configuracion: { JWT_SECRET: string; pagosEntorno: string }) {
  const env = configuracion;
  function firmar(pago: Pago, opcion: OpcionPasarela, vence: number) {
    return createHmac('sha256', env.JWT_SECRET).update(JSON.stringify([
      'gestioncapa/cotizacion/v1', pago.id, env.pagosEntorno, opcion.medio, opcion.comercio,
      opcion.instrumento, opcion.puntosBase, pago.importeCentimos, pago.moneda, vence,
    ])).digest();
  }

  function cotizarOpcion(pago: Pago, opcion: OpcionPasarela) {
    const vence = Math.floor(Date.now() / 60000) * 60000 + 300000;
    return {
      medio: opcion.medio, nombre: opcion.nombre, instrumento: opcion.instrumento,
      ...cotizarImporte(pago.importeCentimos, opcion.puntosBase),
      cotizacion: `${vence}.${firmar(pago, opcion, vence).toString('hex')}`,
    };
  }

  function aceptarCotizacion(pago: Pago, entrada: EntradaIntento, opciones: readonly OpcionPasarela[]) {
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

  return { cotizarOpcion, aceptarCotizacion };
}

export type CotizacionPago = ReturnType<typeof crearCotizacionPago>;
