import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { crearObligacion, obtenerPago, registrarEfectivo, confirmarOperacion, iniciarOperacion } from '../../src/repositories/pagos/pagosRepository.js';
import { ofrecerTransferencia, declararTransferencia, revisarTransferencia, listarTransferencias } from '../../src/routes/pagos.routes.js';

let cursoId:string;
let alumno:number;
let otro:number;
let admin:number;
const destino={banco:'BANCO DE PRUEBA',titular:'Entidad de prueba',cuenta:'1234567890123',cci:'00212345678901234567'};
const fechaOperacion='2026-01-01';
before(async()=>{
  await migrar(pool);
  const personas=(await pool.query(`insert into users(name,email,password_hash,role) values
    ('Admin',$1,'sin-acceso','admin'),('Alumno',$2,'sin-acceso','agremiado'),('Otro',$3,'sin-acceso','agremiado') returning id`,
  [0,1,2].map(indice=>`transferencia-${randomUUID()}-${indice}@prueba.local`))).rows;
  [admin,alumno,otro]=personas.map(persona=>Number(persona.id)) as [number,number,number];
  cursoId=(await pool.query(`insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado)
    values($1,$1,'Transferencias de prueba',24,'PRESENCIAL',150.50,10,'PARTICIPACION') returning id::text`,[admin])).rows[0].id;
});
after(async()=>{
  if(cursoId) {
    for(const tabla of ['transferenciasPago','destinosTransferencia','incidenciasPago','auditoriaPagos','hechosPago','operacionesPago','obligacionesPago']) {
      const filtro=tabla==='transferenciasPago'?'"operacionId" in (select id from "operacionesPago" where "pagoId" in (select id from "obligacionesPago" where "cursoId"=$1))':
        tabla==='obligacionesPago'?'"cursoId"=$1':'"pagoId" in (select id from "obligacionesPago" where "cursoId"=$1)';
      await pool.query(`delete from "${tabla}" where ${filtro}`,[cursoId]);
    }
    await pool.query('delete from cursos where id=$1',[cursoId]);
    await pool.query('delete from users where id=any($1::bigint[])',[[admin,alumno,otro]]);
  }
  await pool.end();
});
async function preparar(referencia:string=randomUUID()) {
  const pago=await crearObligacion(pool,{cursoId,usuarioId:alumno,intentoId:randomUUID(),concepto:'CURSO',importeCentimos:15050,moneda:'PEN'});
  const ofrecido=await ofrecerTransferencia(pago.id,destino);
  const entrada={destinoId:ofrecido.id,clave:randomUUID(),referencia,fechaOperacion};
  return {pago,entrada};
}
const confirmar=(referencia:string)=>({decision:'CONFIRMAR' as const,referencia,fechaOperacion,importeCentimos:15050,moneda:'PEN' as const,verificado:true as const});

test('T25-I03/04: declaración privada, idempotente y sin confirmar; bloquea efectivo',async()=>{
  const {pago,entrada}=await preparar();
  await assert.rejects(declararTransferencia(pago.id,otro,entrada),/permiso/);
  const op=await declararTransferencia(pago.id,alumno,entrada);
  assert.equal((await declararTransferencia(pago.id,alumno,entrada)).id,op.id);
  await assert.rejects(declararTransferencia(pago.id,alumno,{...entrada,referencia:'OTRA-REFERENCIA'}),/clave/);
  assert.equal((await obtenerPago(pago.id))?.estado,'PENDIENTE');
  assert.equal((await listarTransferencias(pago.id))[0]?.cci,destino.cci);
  await assert.rejects(registrarEfectivo(pago.id,admin,'CAJA-TRANSFERENCIA'),/proceso/);
  await assert.rejects(confirmarOperacion(op.id,{referencia:'PUBLICO',importeCentimos:15050,moneda:'PEN'}),/administrativ/);
});

test('T25-I05/06: solo ADMIN confirma el importe completo una vez y audita',async()=>{
  const {pago,entrada}=await preparar(); const op=await declararTransferencia(pago.id,alumno,entrada);
  await assert.rejects(revisarTransferencia(pago.id,op.id,alumno,confirmar(entrada.referencia)),/permiso/);
  await assert.rejects(revisarTransferencia(pago.id,op.id,admin,{...confirmar(entrada.referencia),importeCentimos:1}),/importe/);
  await assert.rejects(revisarTransferencia(pago.id,op.id,admin,confirmar('OTRA-REFERENCIA')),/referencia/);
  const resultados=await Promise.all([0,1].map(()=>revisarTransferencia(pago.id,op.id,admin,confirmar(entrada.referencia))));
  assert.deepEqual(resultados,['CONFIRMADO','CONFIRMADO']);
  assert.equal((await obtenerPago(pago.id))?.medio,'TRANSFERENCIA');
  assert.equal((await pool.query('select count(*)::int as total from "hechosPago" where "pagoId"=$1',[pago.id])).rows[0].total,1);
  assert.equal((await pool.query(`select count(*)::int as total from "auditoriaPagos" where "pagoId"=$1 and "actorId"=$2 and accion='CONFIRMAR'`,[pago.id,admin])).rows[0].total,1);
  await assert.rejects(revisarTransferencia(pago.id,op.id,admin,{decision:'RECHAZAR',motivo:'Cambio posterior inválido'}),/revisada/);
});

test('T25-I05: un abono no paga dos deudas y el original sigue siendo idempotente',async()=>{
  const referencia=`BANCO-${randomUUID()}`;
  const casos=await Promise.all([preparar(referencia),preparar(referencia)]);
  const resultados=await Promise.allSettled(casos.map(({pago,entrada})=>declararTransferencia(pago.id,alumno,entrada)));
  assert.equal(resultados.filter(resultado=>resultado.status==='fulfilled').length,1);
  const rechazado=resultados.find(resultado=>resultado.status==='rejected');
  assert.ok(rechazado?.status==='rejected');assert.equal(rechazado.reason.code,'OPERACION_BANCARIA_REPETIDA');
  const ganador=resultados.findIndex(resultado=>resultado.status==='fulfilled');
  const operacion=resultados[ganador]!;assert.ok(operacion.status==='fulfilled');
  assert.equal(await revisarTransferencia(casos[ganador]!.pago.id,operacion.value.id,admin,confirmar(referencia)),'CONFIRMADO');
  assert.equal(await revisarTransferencia(casos[ganador]!.pago.id,operacion.value.id,admin,confirmar(referencia)),'CONFIRMADO');
});

test('T25-I06: rechazo conserva motivo y destino original; no se confirma después',async()=>{
  const {pago,entrada}=await preparar();
  const recargado=await ofrecerTransferencia(pago.id,{...destino,cuenta:'2222222222222',cci:'00222222222222222222'});
  assert.equal(recargado.id,entrada.destinoId);
  const ajeno=await preparar();
  await assert.rejects(declararTransferencia(pago.id,alumno,{...entrada,destinoId:ajeno.entrada.destinoId}),/destino/);
  const op=await declararTransferencia(pago.id,alumno,entrada);
  const rechazo={decision:'RECHAZAR' as const,motivo:'El banco no registra el abono.'};
  assert.equal(await revisarTransferencia(pago.id,op.id,admin,rechazo),'RECHAZADO');
  assert.equal(await revisarTransferencia(pago.id,op.id,admin,rechazo),'RECHAZADO');
  const registro=(await listarTransferencias(pago.id))[0]!;
  assert.equal(registro.motivoRechazo,rechazo.motivo);assert.equal(registro.cci,destino.cci);
  await assert.rejects(revisarTransferencia(pago.id,op.id,admin,confirmar(entrada.referencia)),/revisada/);
  await declararTransferencia(pago.id,alumno,{...entrada,clave:randomUUID(),referencia:`NUEVA-${randomUUID()}`});
});

test('T25-I06: conserva abono adicional si otro medio se confirmó antes de declarar',async()=>{
  const {pago,entrada}=await preparar();
  await registrarEfectivo(pago.id,admin,`CAJA-ANTERIOR-${pago.id}`);
  const op=await declararTransferencia(pago.id,alumno,entrada);
  await revisarTransferencia(pago.id,op.id,admin,confirmar(entrada.referencia));
  const hechos=(await pool.query('select medio,"requiereConciliacion" from "hechosPago" where "pagoId"=$1',[pago.id])).rows;
  assert.equal(hechos.length,2);
  assert.equal(hechos.find(hecho=>hecho.medio==='TRANSFERENCIA').requiereConciliacion,true);
  assert.equal((await obtenerPago(pago.id))?.medio,'EFECTIVO');
  assert.equal((await pool.query(`select 1 from "incidenciasPago" where "pagoId"=$1`,[pago.id])).rowCount,1);
});

test('T25-I04: declara abono ya realizado durante otra operación, sin permitir más cobros',async()=>{
  const {pago,entrada}=await preparar();
  await iniciarOperacion(pago.id,alumno,{medio:'IZIPAY',clave:randomUUID(),cargaHash:'a'.repeat(64)});
  const op=await declararTransferencia(pago.id,alumno,entrada);
  assert.equal(op.estado,'DECLARADO');
  await assert.rejects(iniciarOperacion(pago.id,alumno,{medio:'IZIPAY',clave:randomUUID(),cargaHash:'b'.repeat(64)}),{code:'PAGO_EN_PROCESO',statusCode:409});
  await assert.rejects(declararTransferencia(pago.id,alumno,{...entrada,clave:randomUUID()}),{code:'PAGO_EN_PROCESO',statusCode:409});
  assert.equal((await listarTransferencias(pago.id)).length,1);
});

test('T25-I06: el callback posterior a la transferencia también hace visible el doble ingreso',async()=>{
  const {pago,entrada}=await preparar();
  const online=await iniciarOperacion(pago.id,alumno,{medio:'IZIPAY',clave:randomUUID(),cargaHash:'a'.repeat(64)});
  const transferencia=await declararTransferencia(pago.id,alumno,entrada);
  await revisarTransferencia(pago.id,transferencia.id,admin,confirmar(entrada.referencia));
  await confirmarOperacion(online.id,{referencia:`IZIPAY-${randomUUID()}`,importeCentimos:15050,moneda:'PEN'});
  assert.equal((await pool.query('select 1 from "incidenciasPago" where "pagoId"=$1',[pago.id])).rowCount,1);
  assert.equal((await obtenerPago(pago.id))?.medio,'TRANSFERENCIA');
});
