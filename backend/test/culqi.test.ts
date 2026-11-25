import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verificarCargoCulqi } from '../src/providers/pagos/culqi.js';
const op = { id:'c2c03121-d0a7-42bc-8448-f08fd88c3451',pagoId:'123' };
const cargo = { object:'charge',id:'chr_test_prueba',amount:15050,amount_refunded:0,current_amount:15050,currency_code:'PEN',paid:true,capture:true,
  response_code:'venta_exitosa',metadata:{operacionId:op.id,pagoId:op.pagoId} };
test('HU53-05: cargo Culqi requiere recurso exitoso y correlación del comercio consultado', () => {
  assert.equal(verificarCargoCulqi(cargo,op,'sandbox').importeCentimos,15050);
  for (const cambio of [{ id:'tkn_test_noEsCargo' },{id:'chr_live_otroEntorno'},{response_code:'venta_denegada'},{capture:false},{paid:false},{amount_refunded:1},{metadata:{operacionId:'otro',pagoId:op.pagoId}}]) {
    assert.throws(()=>verificarCargoCulqi({...cargo,...cambio},op,'sandbox'));
  }
});
