import type { IncomingHttpHeaders } from 'node:http';
import { env } from '../../config/env.js';
import { cotizarImporte, ErrorPago, type InstrumentoPago, type OperacionPago, type Pago } from './pagos.modelo.js';
import { crearRegistroPasarelas } from './pasarelas.registro.js';
import { conciliarCulqi, conciliarIzipay, recibirCulqi, recibirIzipay } from './pagos.notificaciones.js';
import { crearSesionIzipay, datosIzipay, limiteCentimosIzipay } from './izipay.js';
import { guardarSesionIzipay, recuperarSesionIzipay } from './pagos.sesion.js';
import type { OpcionPasarela } from './pagos.cotizacion.js';

type AdaptadorPasarela = {
  medio: string;
  ruta: string;
  altas: () => boolean;
  conciliacion: () => boolean;
  requiereReferencia?: boolean;
  notificar: (entrada: unknown, cabeceras: IncomingHttpHeaders) => Promise<string>;
  conciliar: (operacion: OperacionPago, referencia?: string) => Promise<string>;
  opciones?: (pago: Pago) => OpcionPasarela[];
  abrir?: (operacion: OperacionPago, pago: Pago) => Promise<unknown>;
  recuperar?: (id: string) => Promise<unknown>;
};

async function abrirIzipay(operacion: OperacionPago, pago: Pago) {
  const datos = datosIzipay(operacion, pago, env);
  const token = await crearSesionIzipay(datos, env);
  const sesion = {
    token, keyRSA: env.izipayRsaPublica!, comercio: datos.comercio, orden: datos.orden,
    transaccionId: datos.transaccionId, importe: (datos.importeCentimos / 100).toFixed(2),
    urlIPN: new URL('/api/pagos/notificaciones/izipay', env.pagosUrlPublica).href, entorno: operacion.entorno,
    ...(operacion.instrumento && { instrumento: operacion.instrumento }),
  };
  await guardarSesionIzipay(operacion.id, sesion);
  return env.izipayHabilitado ? recuperarSesionIzipay(operacion.id) : undefined;
}

export const pasarelas = crearRegistroPasarelas<AdaptadorPasarela>([
  {
    medio: 'IZIPAY', ruta: 'izipay',
    altas: () => env.izipayHabilitado,
    conciliacion: () => env.izipayHabilitado || env.izipayConciliacionHabilitada,
    notificar: (entrada, cabeceras) => {
      const transaccion = cabeceras.transactionid;
      return recibirIzipay(entrada, typeof transaccion === 'string' ? transaccion : undefined);
    },
    conciliar: conciliarIzipay, abrir: abrirIzipay, recuperar: recuperarSesionIzipay,
    opciones: pago => {
      const comercio = env.izipayCodigoComercio;
      if (!comercio) return [];
      const tarifas: [InstrumentoPago, number | undefined][] = [
        ['TARJETA', env.izipayComisionTarjeta], ['YAPE', env.izipayComisionYape],
      ];
      return tarifas.flatMap(([instrumento, puntosBase]) => {
        if (puntosBase === undefined || cotizarImporte(pago.importeCentimos, puntosBase).totalCentimos > limiteCentimosIzipay) return [];
        return [{ medio: 'IZIPAY', nombre: 'Izipay', comercio, instrumento, puntosBase }];
      });
    },
  },
  {
    medio: 'CULQI', ruta: 'culqi', altas: () => false, conciliacion: () => env.culqiHabilitado,
    requiereReferencia: true, notificar: recibirCulqi, conciliar: conciliarCulqi,
  },
]);

export function conciliarOperacion(operacion: OperacionPago, referencia?: string) {
  const pasarela = pasarelas.porMedio(operacion.medio);
  if (!pasarela?.conciliacion()) {
    throw new ErrorPago(503, 'PASARELA_NO_CONFIGURADA', 'La pasarela no está disponible para conciliar esta operación.');
  }
  return pasarela.conciliar(operacion, referencia);
}
