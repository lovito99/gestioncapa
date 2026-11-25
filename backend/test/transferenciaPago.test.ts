import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import * as modelo from '../src/dto/pagos/pagoDto.js';

test('T25-I03: declaración normaliza referencia y exige fecha, clave y carga limitada', () => {
  const entrada = { destinoId:randomUUID(),clave:randomUUID(), referencia:'  ab-123  ', fechaOperacion:'2026-11-15' };
  assert.equal(modelo.entradaTransferencia.parse(entrada).referencia,'AB-123');
  for (const cambio of [{referencia:'<script>'},{fechaOperacion:'2026-02-30'},{clave:'sin-clave'},
    {importeCentimos:1},{referencia:'a'.repeat(101)}]) {
    assert.equal(modelo.entradaTransferencia.safeParse({...entrada,...cambio}).success,false);
  }
});

test('T25-I05: confirmar exige recepción verificada, importe entero exacto y soles; rechazar exige motivo', () => {
  const entrada = { decision:'CONFIRMAR',referencia:'ab-123',fechaOperacion:'2026-11-15',importeCentimos:15050,moneda:'PEN',verificado:true };
  assert.equal(modelo.entradaRevisionTransferencia.parse(entrada).decision,'CONFIRMAR');
  for (const cambio of [{verificado:false},{importeCentimos:0},{importeCentimos:1.5},{moneda:'USD'},{cuenta:'otra'}]) {
    assert.equal(modelo.entradaRevisionTransferencia.safeParse({...entrada,...cambio}).success,false);
  }
  assert.equal(modelo.entradaRevisionTransferencia.safeParse({decision:'RECHAZAR',motivo:'No se encuentra el abono.'}).success,true);
  assert.equal(modelo.entradaRevisionTransferencia.safeParse({decision:'RECHAZAR',motivo:' '}).success,false);
});
