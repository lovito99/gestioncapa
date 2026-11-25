import assert from 'node:assert/strict';
import { test } from 'node:test';
import { solicitarProveedor } from '../src/providers/pagos/proveedorHttp.js';

test('HU53-07: distingue rechazo definitivo de tarjeta y resultado de red incierto', async () => {
  const rechazo=(async()=>new Response(JSON.stringify({object:'error',type:'card_error',code:'card_declined'}),{status:402})) as typeof fetch;
  await assert.rejects(solicitarProveedor('https://api.culqi.com/v2/charges',{method:'POST'},rechazo),error=>(error as {code?:string}).code==='PAGO_RECHAZADO');
  const fallo=(async()=>{throw new Error('datos que no deben salir del proveedor')}) as typeof fetch;
  await assert.rejects(solicitarProveedor('https://api.culqi.com/v2/charges',{},fallo),error=>{
    assert.equal((error as {statusCode?:number}).statusCode,503);
    assert.ok(!(error as Error).message.includes('datos que')); return true;
  });
});
