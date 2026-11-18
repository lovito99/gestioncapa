import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ErrorPago } from './pagos.modelo.js';
import { solicitarProveedor } from './proveedorHttp.js';
import type { Env } from '../../config/env.schema.js';
import type { InstrumentoPago, OperacionPago } from './pagos.modelo.js';

export type EsperadoIzipay = {
  transaccionId: string; orden: string; comercio: string; importeCentimos: number;
  instrumento?: InstrumentoPago | null;
};
export const instrumentosIzipay = { TARJETA: 'CARD', YAPE: 'YAPE_CODE' } as const;
export const limiteCentimosIzipay = 999999999999;
const importe = z.string().regex(/^\d{1,10}\.\d{2}$/);
const comercio = z.object({ merchantCode: z.string() });
const respuestaFirmada = z.object({
  code: z.literal('00'), transactionId: z.string().optional(),
  response: z.object({ merchant: comercio, payMethod: z.string().optional(),
    order: z.array(z.object({ orderNumber:z.string(), amount:importe, currency:z.string().regex(/^[A-Z]{3}$/),
      uniqueId:z.string().regex(/^[A-Za-z0-9-]{1,100}$/), payMethodAuthorization: z.string().optional(),
      codeAuth:z.string().min(1),stateMessage:z.literal('Autorizado') })).min(1).max(6) }),
});
// Códigos terminales del emisor documentados por Izipay. Los códigos de
// comunicación, esperas y aprobaciones parciales quedan para conciliación.
const rechazoFirmado = z.object({
  code: z.enum(['04', '05', '51', '54', '57', '59', '61', '62', '65', '70']),
  transactionId: z.string().optional(),
  response: z.object({ merchant: comercio, payMethod: z.string().optional(),
    order: z.tuple([z.object({
      orderNumber: z.string(), amount: importe, currency: z.literal('PEN'), payMethodAuthorization: z.string().optional(),
      stateMessage: z.string().refine(valor => valor.trim().toLowerCase() !== 'autorizado'),
    })]),
  }),
});
const rechazoYape = z.object({
  code: z.enum(['Y06', 'Y07', 'Y08', 'Y09']), transactionId: z.string().optional(),
  response: z.object({ merchantCode: z.string(), orderNumber: z.string(), amount: importe, currency: z.literal('PEN'),
    payMethod: z.enum(['Yape', 'YAPE_CODE']) }),
});
const cancelacionFirmada = z.object({
  code: z.literal('00'), transactionId: z.string().optional(),
  response: z.object({ merchant: comercio, payMethod: z.string().optional(), order: z.tuple([z.object({
    orderNumber: z.string(), amount: importe, currency: z.literal('PEN'), payMethodAuthorization: z.string().optional(),
    stateMessage: z.enum(['Cancelado', 'Anulado']),
  })]) }),
});
// Firma del payload original; nunca reconstruir JSON antes de verificarlo.
// https://developers.izipay.pe/web-core/Modalidades/firma-validation/
export function autenticarRespuestaIzipay(entrada: unknown, claveHash: string) {
  const envoltura = z.object({ payloadHttp:z.string().max(131072),signature:z.string().regex(/^[A-Za-z0-9+/]{43}=$/) }).safeParse(entrada);
  if (!envoltura.success || !claveHash) throw new ErrorPago(422,'FIRMA_INVALIDA','No se pudo verificar la notificación.');
  const { payloadHttp,signature } = envoltura.data;
  const firma = createHmac('sha256',claveHash).update(payloadHttp,'utf8').digest();
  if (!timingSafeEqual(firma,Buffer.from(signature,'base64'))) throw new ErrorPago(422,'FIRMA_INVALIDA','No se pudo verificar la notificación.');
  try { return JSON.parse(payloadHttp) as unknown; } catch { throw new ErrorPago(422,'RESPUESTA_INVALIDA','La respuesta firmada no es válida.'); }
}

function centimosDe(valor: string) {
  return Number(valor.replace('.', ''));
}
function comprobarCorrelacion(esperado: EsperadoIzipay, transaccionId: string | undefined, comercio: string, orden: string, metodo?: string) {
  if ((transaccionId !== undefined && transaccionId !== esperado.transaccionId)
    || comercio !== esperado.comercio || orden !== esperado.orden
    || (esperado.instrumento && metodo !== instrumentosIzipay[esperado.instrumento])) {
    throw new ErrorPago(422, 'CORRELACION_INVALIDA', 'La operación no corresponde al pago esperado.');
  }
}
export function interpretarRespuestaIzipay(contenido: unknown, esperado: EsperadoIzipay) {
  const yape = rechazoYape.safeParse(contenido);
  if (yape.success) {
    const { response, transactionId } = yape.data;
    comprobarCorrelacion(esperado, transactionId, response.merchantCode, response.orderNumber, 'YAPE_CODE');
    if (centimosDe(response.amount) !== esperado.importeCentimos) throw new ErrorPago(422, 'CORRELACION_INVALIDA', 'El importe no corresponde al pago esperado.');
    return { rechazado: true } as const;
  }
  const rechazo = rechazoFirmado.safeParse(contenido);
  const cancelacion = cancelacionFirmada.safeParse(contenido);
  const terminal = rechazo.success ? rechazo.data : cancelacion.data;
  if (terminal) {
    const [orden] = terminal.response.order;
    comprobarCorrelacion(esperado, terminal.transactionId, terminal.response.merchant.merchantCode, orden.orderNumber,
      orden.payMethodAuthorization ?? terminal.response.payMethod);
    if (centimosDe(orden.amount) !== esperado.importeCentimos) throw new ErrorPago(422, 'CORRELACION_INVALIDA', 'El importe no corresponde al pago esperado.');
    return rechazo.success ? { rechazado: true } as const : { cancelado: true } as const;
  }
  const validacion=respuestaFirmada.safeParse(contenido);
  if (!validacion.success) throw new ErrorPago(409,'PAGO_NO_CONFIRMADO','La pasarela no acredita un cobro exitoso.');
  const datos=validacion.data;
  const hechos = datos.response.order.map(item => {
    comprobarCorrelacion(esperado, datos.transactionId, datos.response.merchant.merchantCode, item.orderNumber,
      item.payMethodAuthorization ?? datos.response.payMethod);
    return { referencia: `${esperado.comercio}:${item.uniqueId}`, importeCentimos: centimosDe(item.amount), moneda: item.currency };
  });
  return { ...hechos[0]!, adicionales:hechos.slice(1) };
}

export function verificarRespuestaIzipay(entrada: unknown, esperado: EsperadoIzipay, claveHash: string) {
  return interpretarRespuestaIzipay(autenticarRespuestaIzipay(entrada, claveHash), esperado);
}

type ConfigIzipay=Pick<Env,'pagosEntorno'|'izipayCodigoComercio'|'izipayClavePublica'|'izipayClaveHash'|'izipayRsaPublica'|'pagosUrlPublica'>;
const origenIzipay=(config:ConfigIzipay)=>config.pagosEntorno==='sandbox' ? 'https://sandbox-api-pw.izipay.pe' : 'https://api-pw.izipay.pe';
export function datosIzipay(op: Pick<OperacionPago, 'id' | 'numero' | 'comercio' | 'instrumento' | 'totalCentimos' | 'ordenExterna'>,pago:{importeCentimos:number},config:ConfigIzipay):EsperadoIzipay {
  const orden=op.ordenExterna ?? op.numero.padStart(10,'0');
  const comercio = op.comercio ?? config.izipayCodigoComercio;
  const importeCentimos = op.totalCentimos ?? pago.importeCentimos;
  if (orden.length > 15 || !comercio || importeCentimos < 1 || importeCentimos > limiteCentimosIzipay) {
    throw new ErrorPago(422,'IMPORTE_NO_ADMITIDO','La operación no es compatible con Izipay.');
  }
  return { transaccionId:op.id, orden, comercio, importeCentimos, instrumento:op.instrumento };
}
// Contrato oficial: https://developers.izipay.pe/yaml/api-v1-esp.yaml
export async function crearSesionIzipay(datos:EsperadoIzipay,config:ConfigIzipay,solicitar:typeof fetch=fetch) {
  const respuesta=await solicitarProveedor(`${origenIzipay(config)}/security/v1/Token/Generate`,{method:'POST',
    headers:{'Content-Type':'application/json',transactionId:datos.transaccionId},
    body:JSON.stringify({requestSource:'ECOMMERCE',merchantCode:datos.comercio,orderNumber:datos.orden,publicKey:config.izipayClavePublica,amount:(datos.importeCentimos/100).toFixed(2)})},solicitar);
  const valido=z.object({code:z.literal('00'),response:z.object({token:z.string().min(1)})}).safeParse(respuesta);
  if (!valido.success) throw new ErrorPago(503,'SESION_NO_DISPONIBLE','Izipay no pudo iniciar la operación.');
  return valido.data.response.token;
}
export async function consultarIzipay(datos:EsperadoIzipay,config:ConfigIzipay,solicitar:typeof fetch=fetch) {
  const token=await crearSesionIzipay(datos,config,solicitar);
  const respuesta=await solicitarProveedor(`${origenIzipay(config)}/orderinfo/v1/Transaction/Search`,{method:'POST',
    headers:{'Content-Type':'application/json',transactionId:datos.transaccionId,Authorization:`Bearer ${token}`},
    body:JSON.stringify({merchantCode:datos.comercio,numberOrden:datos.orden,language:'ESP'})},solicitar);
  // La consulta responde por HTTPS desde el endpoint autenticado, incluso sin envoltura IPN.
  const envoltura = z.object({ payloadHttp: z.string(), signature: z.string() }).safeParse(respuesta);
  return envoltura.success
    ? verificarRespuestaIzipay(envoltura.data, datos, config.izipayClaveHash!)
    : interpretarRespuestaIzipay(respuesta, datos);
}
