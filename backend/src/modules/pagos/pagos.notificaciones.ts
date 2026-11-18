import { z } from 'zod';
import { env } from '../../config/env.js';
import { pool } from '../../shared/database.js';
import { ErrorPago, type OperacionPago } from './pagos.modelo.js';
import { buscarOperacion, cambiarEstadoOperacion, confirmarOperacion, obtenerPago, conservarRespuestaMultiple } from './pagos.repositorio.js';
import { datosIzipay, verificarRespuestaIzipay, consultarIzipay } from './izipay.js';
import { consultarCargoCulqi, verificarCargoCulqi } from './culqi.js';
import { solicitarProveedor } from './proveedorHttp.js';

function leerJson(texto:string):unknown {
  try { return JSON.parse(texto); } catch { throw new ErrorPago(422,'NOTIFICACION_INVALIDA','La notificación no es válida.'); }
}
function objeto(valor:unknown):Record<string,unknown> {
  return valor!==null && typeof valor==='object' && !Array.isArray(valor) ? valor as Record<string,unknown> : {};
}
function comprobarMedio(op:OperacionPago,medio:'IZIPAY'|'CULQI') {
  if (op.medio!==medio || op.entorno!==env.pagosEntorno) throw new ErrorPago(422,'ENTORNO_INVALIDO','La operación no corresponde a esta pasarela o entorno.');
}
export async function recibirIzipay(entrada:unknown) {
  if (!env.izipayHabilitado) throw new ErrorPago(503,'PASARELA_NO_CONFIGURADA','Izipay todavía no está disponible.');
  const raiz=objeto(entrada); const respuesta=objeto(raiz.response);
  const valido=z.object({payloadHttp:z.string().max(131072),signature:z.string().max(100)}).safeParse({
    payloadHttp:raiz.payloadHttp??respuesta.payloadHttp,signature:raiz.signature??respuesta.signature,
  });
  if (!valido.success) throw new ErrorPago(422,'NOTIFICACION_INVALIDA','Falta la respuesta firmada de Izipay.');
  const id=z.object({transactionId:z.uuid()}).safeParse(leerJson(valido.data.payloadHttp));
  if (!id.success) throw new ErrorPago(422,'CORRELACION_INVALIDA','La operación no es válida.');
  const op=await buscarOperacion(id.data.transactionId);
  if (!op) throw new ErrorPago(404,'OPERACION_NO_EXISTE','La operación no existe.');
  comprobarMedio(op,'IZIPAY');
  const pago=(await obtenerPago(op.pagoId))!;
  const hecho=verificarRespuestaIzipay(valido.data,datosIzipay(op,pago,env),env.izipayClaveHash!);
  return aplicarRespuestaIzipay(op.id,hecho);
}
async function aplicarRespuestaIzipay(id:string,hecho:Awaited<ReturnType<typeof consultarIzipay>>) {
  if ('rechazado' in hecho) return cambiarEstadoOperacion(id, 'RECHAZADO');
  if (hecho.adicionales.length) return conservarRespuestaMultiple(id,[hecho,...hecho.adicionales]);
  return confirmarOperacion(id,hecho);
}
export async function recibirCulqi(entrada:unknown) {
  if (!env.culqiHabilitado) throw new ErrorPago(503,'PASARELA_NO_CONFIGURADA','Culqi todavía no está disponible.');
  let fuente=objeto(entrada);
  if (typeof fuente.id==='string' && /^evt_(test|live)_[A-Za-z0-9]+$/.test(fuente.id)) {
    fuente=objeto(await solicitarProveedor(`https://api.culqi.com/v2/events/${fuente.id}`,{headers:{Authorization:`Bearer ${env.culqiClaveSecreta}`}}));
  }
  const data=typeof fuente.data==='string' ? objeto(leerJson(fuente.data)) : objeto(fuente.data);
  const referencia=z.string().regex(/^chr_(test|live)_[A-Za-z0-9]+$/).safeParse(data.id??fuente.id);
  if (!referencia.success) throw new ErrorPago(422,'CARGO_INVALIDO','La notificación no identifica un cargo.');
  const cargo=await consultarCargoCulqi(referencia.data,env.culqiClaveSecreta!);
  const meta=z.object({metadata:z.object({operacionId:z.uuid()})}).safeParse(cargo);
  if (!meta.success) throw new ErrorPago(422,'CORRELACION_INVALIDA','El cargo no pertenece a una operación registrada.');
  const op=await buscarOperacion(meta.data.metadata.operacionId);
  if (!op) throw new ErrorPago(404,'OPERACION_NO_EXISTE','La operación no existe.');
  comprobarMedio(op,'CULQI');
  const hecho=verificarCargoCulqi(cargo,op,env.pagosEntorno);
  await pool.query('update "operacionesPago" set "referenciaExterna"=coalesce("referenciaExterna",$2) where id=$1',[op.id,hecho.referencia]);
  return confirmarOperacion(op.id,hecho);
}
export async function conciliarOperacion(id:string,referencia?:string) {
  const op=await buscarOperacion(id);
  if (!op) throw new ErrorPago(404,'OPERACION_NO_EXISTE','La operación no existe.');
  const pago=(await obtenerPago(op.pagoId))!;
  if (op.medio==='IZIPAY' && env.izipayHabilitado) {
    comprobarMedio(op,'IZIPAY');
    return aplicarRespuestaIzipay(op.id,await consultarIzipay(datosIzipay(op,pago,env),env));
  }
  if (op.medio==='CULQI' && env.culqiHabilitado) {
    comprobarMedio(op,'CULQI');
    const idCargo=referencia??op.referenciaExterna;
    if (!idCargo) throw new ErrorPago(409,'REFERENCIA_PENDIENTE','Consulta el cargo en el panel de Culqi y aporta su referencia para verificarlo.');
    const cargo=await consultarCargoCulqi(idCargo,env.culqiClaveSecreta!);
    return confirmarOperacion(op.id,verificarCargoCulqi(cargo,op,env.pagosEntorno));
  }
  throw new ErrorPago(503,'PASARELA_NO_CONFIGURADA','La pasarela no está disponible para conciliar esta operación.');
}
