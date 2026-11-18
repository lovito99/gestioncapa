import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ErrorPago } from './pagos.modelo.js';
import { solicitarProveedor } from './proveedorHttp.js';
import type { Env } from '../../config/env.schema.js';

export type EsperadoIzipay = { transaccionId: string; orden: string; comercio: string; importeCentimos: number };
const respuestaFirmada = z.object({
  code: z.literal('00'), transactionId: z.string(),
  response: z.object({ merchant: z.object({ merchantCode: z.string() }),
    order: z.array(z.object({ orderNumber:z.string(),amount:z.string().regex(/^\d{1,10}\.\d{2}$/),currency:z.string().regex(/^[A-Z]{3}$/),uniqueId:z.string().min(1).max(100),
      codeAuth:z.string().min(1),stateMessage:z.literal('Autorizado') })).min(1).max(6) }),
});
// Códigos terminales del emisor documentados por Izipay. Los códigos de
// comunicación, esperas y aprobaciones parciales quedan para conciliación.
const rechazoFirmado = z.object({
  code: z.enum(['04', '05', '51', '54', '57', '59', '61', '62', '65', '70']),
  transactionId: z.string(),
  response: z.object({ merchant: z.object({ merchantCode: z.string() }),
    order: z.tuple([z.object({
      orderNumber: z.string(), amount: z.string().regex(/^\d{1,10}\.\d{2}$/), currency: z.literal('PEN'),
      stateMessage: z.string().refine(valor => valor.trim().toLowerCase() !== 'autorizado'),
    })]),
  }),
});
// Firma del payload original; nunca reconstruir JSON antes de verificarlo.
// https://developers.izipay.pe/web-core/Modalidades/firma-validation/
export function verificarRespuestaIzipay(entrada: unknown, esperado: EsperadoIzipay, claveHash: string) {
  const envoltura = z.object({ payloadHttp:z.string().max(131072),signature:z.string().regex(/^[A-Za-z0-9+/]{43}=$/) }).safeParse(entrada);
  if (!envoltura.success || !claveHash) throw new ErrorPago(422,'FIRMA_INVALIDA','No se pudo verificar la notificación.');
  const { payloadHttp,signature } = envoltura.data;
  const firma = createHmac('sha256',claveHash).update(payloadHttp,'utf8').digest();
  if (!timingSafeEqual(firma,Buffer.from(signature,'base64'))) throw new ErrorPago(422,'FIRMA_INVALIDA','No se pudo verificar la notificación.');
  let contenido: unknown;
  try { contenido=JSON.parse(payloadHttp); } catch { throw new ErrorPago(422,'RESPUESTA_INVALIDA','La respuesta firmada no es válida.'); }
  const rechazo = rechazoFirmado.safeParse(contenido);
  if (rechazo.success) {
    const datos = rechazo.data;
    const [orden] = datos.response.order;
    if (datos.transactionId !== esperado.transaccionId || datos.response.merchant.merchantCode !== esperado.comercio
      || orden.orderNumber !== esperado.orden || Number(orden.amount.replace('.', '')) !== esperado.importeCentimos) {
      throw new ErrorPago(422,'CORRELACION_INVALIDA','La operación no corresponde al pago esperado.');
    }
    return { rechazado: true } as const;
  }
  const validacion=respuestaFirmada.safeParse(contenido);
  if (!validacion.success) throw new ErrorPago(409,'PAGO_NO_CONFIRMADO','La pasarela no acredita un cobro exitoso.');
  const datos=validacion.data;
  if (datos.transactionId !== esperado.transaccionId || datos.response.merchant.merchantCode !== esperado.comercio || datos.response.order.some(item=>item.orderNumber !== esperado.orden)) throw new ErrorPago(422,'CORRELACION_INVALIDA','La operación no corresponde al pago esperado.');
  const hechos=datos.response.order.map(item=>({ referencia:`${esperado.comercio}:${item.uniqueId}`,importeCentimos:Number(item.amount.replace('.','')),moneda:item.currency }));
  return { ...hechos[0]!, adicionales:hechos.slice(1) };
}

type ConfigIzipay=Pick<Env,'pagosEntorno'|'izipayCodigoComercio'|'izipayClavePublica'|'izipayClaveHash'|'izipayRsaPublica'|'pagosUrlPublica'>;
const origenIzipay=(config:ConfigIzipay)=>config.pagosEntorno==='sandbox' ? 'https://sandbox-api-pw.izipay.pe' : 'https://api-pw.izipay.pe';
export function datosIzipay(op:{id:string;numero:string},pago:{importeCentimos:number},config:ConfigIzipay):EsperadoIzipay {
  const orden=op.numero.padStart(10,'0');
  if (orden.length>15 || !config.izipayCodigoComercio || pago.importeCentimos<1) throw new ErrorPago(422,'IMPORTE_NO_ADMITIDO','La operación no es compatible con Izipay.');
  return { transaccionId:op.id,orden,comercio:config.izipayCodigoComercio,importeCentimos:pago.importeCentimos };
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
  return verificarRespuestaIzipay(respuesta,datos,config.izipayClaveHash!);
}
