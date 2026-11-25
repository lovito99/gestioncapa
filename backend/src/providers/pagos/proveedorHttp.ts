import { ErrorPago } from '../../shared/errorPago.js';

export async function solicitarProveedor(url: string, opciones: RequestInit = {}, solicitar: typeof fetch = fetch): Promise<unknown> {
  try {
    const respuesta = await solicitar(url,{ ...opciones,redirect:'error',signal:AbortSignal.timeout(10000) });
    const lector=respuesta.body?.getReader();
    if (!lector) throw new Error('sin cuerpo');
    const bloques:Uint8Array[]=[]; let total=0;
    for (;;) {
      const { done,value }=await lector.read(); if (done) break;
      total+=value.byteLength;
      if (total>262144) { await lector.cancel(); throw new Error('respuesta excedida'); }
      bloques.push(value);
    }
    const datos:unknown=JSON.parse(Buffer.concat(bloques).toString('utf8'));
    if (!respuesta.ok) {
      const tipo=datos!==null && typeof datos==='object' ? (datos as {type?:string}).type : undefined;
      if (url==='https://api.culqi.com/v2/charges' && opciones.method==='POST' && respuesta.status===402 && tipo==='card_error') throw new ErrorPago(422,'PAGO_RECHAZADO','El banco rechazó el pago. Puedes volver a intentarlo.');
      throw new Error('respuesta no exitosa');
    }
    return datos;
  } catch(error) {
    if (error instanceof ErrorPago && error.code==='PAGO_RECHAZADO') throw error;
    // Los mensajes/payloads del proveedor pueden contener datos de tarjeta o claves.
    throw new ErrorPago(503,'PASARELA_NO_DISPONIBLE','La operación requiere verificación. Consulta su estado antes de reintentar.');
  }
}
