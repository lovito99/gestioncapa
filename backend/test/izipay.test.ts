import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { verificarRespuestaIzipay } from '../src/providers/pagos/izipay.js';
const claveHash = 'solo-clave-de-pruebas-sin-comercio-32';
const esperado = { transaccionId:'c2c03121-d0a7-42bc-8448-f08fd88c3451',orden:'0000000123',comercio:'COMERCIO-PRUEBA',importeCentimos:15050 };
const firmar = (cambio: object = {}) => {
  const payloadHttp = JSON.stringify({ code:'00',transactionId:esperado.transaccionId,response:{ merchant:{merchantCode:esperado.comercio},order:[{orderNumber:esperado.orden,amount:'150.50',currency:'PEN',uniqueId:'venta-prueba-1',codeAuth:'123456',stateMessage:'Autorizado'}] },...cambio });
  return { payloadHttp,signature:createHmac('sha256',claveHash).update(payloadHttp).digest('base64') };
};
test('HU53-04: verifica firma de bytes originales y datos del cobro Izipay', () => {
  const cobro=verificarRespuestaIzipay(firmar(),esperado,claveHash);
  assert.ok('referencia' in cobro);
  assert.equal(cobro.referencia,'COMERCIO-PRUEBA:venta-prueba-1');
  assert.throws(()=>verificarRespuestaIzipay({...firmar(),signature:'falsa'},esperado,claveHash));
  assert.throws(()=>verificarRespuestaIzipay(firmar({transactionId:'otra'}),esperado,claveHash));
  assert.throws(()=>verificarRespuestaIzipay(firmar({code:'05'}),esperado,claveHash));
  assert.throws(()=>verificarRespuestaIzipay(firmar(),{...esperado,comercio:'otro'},claveHash));
  // El importe verificado discrepante debe llegar al libro como incidencia, no confirmar la deuda.
  const discrepante=verificarRespuestaIzipay(firmar(),{...esperado,importeCentimos:1},claveHash);
  assert.ok('importeCentimos' in discrepante);
  assert.equal(discrepante.importeCentimos,15050);
});

test('HU53-07: conserva dos autorizaciones verificadas para conciliar un posible doble cargo', () => {
  const contenido=JSON.parse(firmar().payloadHttp);
  contenido.response.order.push({...contenido.response.order[0],uniqueId:'venta-prueba-2'});
  const payloadHttp=JSON.stringify(contenido);
  const respuesta=verificarRespuestaIzipay({payloadHttp,signature:createHmac('sha256',claveHash).update(payloadHttp).digest('base64')},esperado,claveHash);
  assert.ok('adicionales' in respuesta);
  assert.equal(respuesta.adicionales.length,1);
  assert.equal(respuesta.adicionales[0]?.referencia,'COMERCIO-PRUEBA:venta-prueba-2');
});

test('HU29: distingue un rechazo firmado y correlacionado de una respuesta incierta', () => {
  const response={merchant:{merchantCode:esperado.comercio},order:[
    {orderNumber:esperado.orden,amount:'150.50',currency:'PEN',stateMessage:'Denegado'},
  ]};
  assert.deepEqual(verificarRespuestaIzipay(firmar({code:'51',response}),esperado,claveHash),{rechazado:true});
  assert.throws(()=>verificarRespuestaIzipay(firmar({code:'21',response}),esperado,claveHash));
  assert.throws(()=>verificarRespuestaIzipay(firmar({code:'51',response}),{...esperado,importeCentimos:1},claveHash));
});
