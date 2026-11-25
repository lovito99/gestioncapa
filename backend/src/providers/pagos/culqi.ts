import { z } from 'zod';
import { ErrorPago } from '../../shared/errorPago.js';
import { solicitarProveedor } from './proveedorHttp.js';

const esquemaCargo=z.object({
  object:z.literal('charge'),id:z.string(),amount:z.number().int().positive().max(999999999999),
  currency_code:z.string().regex(/^[A-Z]{3}$/).optional(),currency:z.string().regex(/^[A-Z]{3}$/).optional(),
  amount_refunded:z.number().default(0),current_amount:z.number().optional(),
  paid:z.boolean().optional(),capture:z.boolean().optional(),response_code:z.literal('venta_exitosa'),
  metadata:z.object({ operacionId:z.string(),pagoId:z.string() }),
});
// Solo se usa sobre una respuesta de la API autenticada, nunca sobre el webhook.
// https://docs.culqi.com/es/documentacion/pagos-online/cargo-unico/cargos/
export function verificarCargoCulqi(entrada: unknown, op: { id:string; pagoId:string }, entorno:'sandbox'|'produccion') {
  const valido=esquemaCargo.safeParse(entrada);
  if (!valido.success) throw new ErrorPago(409,'PAGO_NO_CONFIRMADO','Culqi no acredita un cargo exitoso.');
  const cargo=valido.data;
  const prefijo=entorno === 'sandbox' ? 'chr_test_' : 'chr_live_';
  const moneda=cargo.currency_code ?? cargo.currency;
  if (!cargo.id.startsWith(prefijo) || !moneda || cargo.paid===false || cargo.capture===false || cargo.amount_refunded!==0 ||
    (cargo.current_amount!==undefined && cargo.current_amount!==cargo.amount) || cargo.metadata.operacionId!==op.id || cargo.metadata.pagoId!==op.pagoId) throw new ErrorPago(422,'CORRELACION_INVALIDA','El cargo no corresponde al pago esperado o requiere conciliación.');
  return { referencia:cargo.id,importeCentimos:cargo.amount,moneda };
}

export async function consultarCargoCulqi(id:string,claveSecreta:string,solicitar:typeof fetch=fetch) {
  if (!/^chr_(test|live)_[A-Za-z0-9]+$/.test(id)) throw new ErrorPago(422,'CARGO_INVALIDO','Selecciona una referencia de cargo válida.');
  return solicitarProveedor(`https://api.culqi.com/v2/charges/${id}`,{headers:{Authorization:`Bearer ${claveSecreta}`}},solicitar);
}
export async function crearCargoCulqi(op:{id:string;pagoId:string},pago:{importeCentimos:number},token:string,email:string,claveSecreta:string,solicitar:typeof fetch=fetch) {
  if (pago.importeCentimos<100 || pago.importeCentimos>9999900) throw new ErrorPago(422,'IMPORTE_NO_ADMITIDO','Culqi admite este cobro solo dentro de los límites de su producto.');
  const respuesta=await solicitarProveedor('https://api.culqi.com/v2/charges',{method:'POST',
    headers:{Authorization:`Bearer ${claveSecreta}`,'Content-Type':'application/json'},
    body:JSON.stringify({amount:pago.importeCentimos,currency_code:'PEN',email,source_id:token,capture:true,installments:0,
      metadata:{operacionId:op.id,pagoId:op.pagoId}})},solicitar);
  const id=z.object({id:z.string().regex(/^chr_(test|live)_[A-Za-z0-9]+$/)}).safeParse(respuesta);
  if (!id.success) throw new ErrorPago(503,'CARGO_NO_VERIFICADO','El resultado requiere conciliación con Culqi.');
  return id.data.id;
}
