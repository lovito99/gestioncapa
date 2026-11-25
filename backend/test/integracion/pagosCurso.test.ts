import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { crearObligacion, iniciarOperacion, confirmarOperacion, cambiarEstadoOperacion, registrarEfectivo, obtenerPago } from '../../src/repositories/pagos/pagosRepository.js';

let cursoId: string;
let usuarioId: number;
let adminId: number;
before(async () => {
  await migrar(pool);
  const personas = (await pool.query<{ id: string }>(`insert into users(name,email,password_hash,role) values
    ('Admin',$1,'sin-acceso','admin'),('Alumno',$2,'sin-acceso','agremiado') returning id::text`, [`pago-admin-${Date.now()}@prueba.local`,`pago-alumno-${Date.now()}@prueba.local`])).rows;
  adminId = Number(personas[0]!.id); usuarioId = Number(personas[1]!.id);
  cursoId = (await pool.query<{ id: string }>(`insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado) values($1,$1,'Pago HU53',24,'PRESENCIAL',150.50,10,'PARTICIPACION') returning id::text`, [adminId])).rows[0]!.id;
});
after(async () => {
  for (const tabla of ['incidenciasPago','auditoriaPagos','hechosPago','operacionesPago','obligacionesPago']) {
    const existe = (await pool.query('select to_regclass($1) as tabla', [`"${tabla}"`])).rows[0].tabla;
    if (existe) await pool.query(`delete from "${tabla}" where ${tabla === 'obligacionesPago' ? '"cursoId"' : '"pagoId"'} in (${tabla === 'obligacionesPago' ? '$1' : 'select id from "obligacionesPago" where "cursoId"=$1'})`, [cursoId]);
  }
  await pool.query('delete from cursos where id=$1', [cursoId]);
  await pool.query('delete from users where id=any($1::bigint[])', [[usuarioId,adminId]]);
  await pool.end();
});
const obligacion = () => crearObligacion(pool, { cursoId, usuarioId, intentoId: randomUUID(), concepto: 'CURSO', importeCentimos: 15050, moneda: 'PEN' });

test('HU53-08: mantiene los identificadores de propietario como texto sin redondearlos', async () => {
  const pago=await obligacion();
  assert.equal(pago.usuarioId,String(usuarioId));
});

test('HU53-07: reserva un único intento y exige misma carga para idempotencia', async () => {
  const pago = await obligacion(); const clave = randomUUID();
  const entrada = { medio: 'CULQI' as const, clave, cargaHash: 'a'.repeat(64) };
  const primera = await iniciarOperacion(pago.id, usuarioId, entrada);
  const repetida = await iniciarOperacion(pago.id, usuarioId, entrada);
  assert.equal(primera.id, repetida.id);
  await assert.rejects(iniciarOperacion(pago.id, usuarioId, { ...entrada, cargaHash: 'b'.repeat(64) }), /clave/);
  const carreras = await Promise.allSettled([iniciarOperacion(pago.id, usuarioId, { ...entrada, clave: randomUUID() }), registrarEfectivo(pago.id, adminId, 'CAJA-1')]);
  assert.ok(carreras.every(r => r.status === 'rejected'));
  assert.equal((await obtenerPago(pago.id))?.estado, 'PENDIENTE');
});

test('HU53-06: efectivo exige administrador activo y conserva auditoría', async () => {
  const pago = await obligacion();
  await assert.rejects(registrarEfectivo(pago.id, usuarioId, 'CAJA-2'), /permiso/);
  await registrarEfectivo(pago.id, adminId, 'CAJA-2');
  const leido = await obtenerPago(pago.id);
  assert.equal(leido?.estado, 'PAGADO'); assert.equal(leido?.medio, 'EFECTIVO');
  const auditoria = await pool.query('select 1 from "auditoriaPagos" where "pagoId"=$1 and "actorId"=$2', [pago.id, adminId]);
  assert.ok(auditoria.rowCount);
  await assert.rejects(registrarEfectivo((await obligacion()).id, adminId, 'CAJA-2'), /referencia/);
});

test('HU53-07: confirma una vez, valida importe y conserva duplicados financieros', async () => {
  const pago = await obligacion();
  const op = await iniciarOperacion(pago.id, usuarioId, { medio: 'IZIPAY', clave: randomUUID(), cargaHash: 'a'.repeat(64) });
  const referenciaIncorrecta = randomUUID();
  await confirmarOperacion(op.id, { referencia: referenciaIncorrecta, importeCentimos: 1, moneda: 'PEN' });
  assert.equal((await obtenerPago(pago.id))?.estado, 'PENDIENTE');
  assert.equal((await pool.query('select motivo from "incidenciasPago" where referencia=$1',[referenciaIncorrecta])).rows[0]?.motivo, 'IMPORTE');
  const hecho = { referencia: randomUUID(), importeCentimos: 15050, moneda: 'PEN' };
  await confirmarOperacion(op.id, hecho); await confirmarOperacion(op.id, hecho);
  assert.equal((await obtenerPago(pago.id))?.estado, 'PAGADO');
  assert.equal((await pool.query('select count(*)::int as total from "hechosPago" where "pagoId"=$1',[pago.id])).rows[0].total, 1);
  await confirmarOperacion(op.id, { ...hecho, referencia: randomUUID() });
  assert.equal((await pool.query('select count(*)::int as total from "hechosPago" where "pagoId"=$1',[pago.id])).rows[0].total, 2);
});

test('HU53-07: referencia de otra obligación deja incidencia y no confirma dos deudas', async () => {
  const pagos = await Promise.all([obligacion(),obligacion()]);
  const operaciones = await Promise.all(pagos.map(p => iniciarOperacion(p.id,usuarioId,{ medio:'CULQI',clave:randomUUID(),cargaHash:'a'.repeat(64) })));
  const referencia = randomUUID();
  await Promise.all(operaciones.map(op => confirmarOperacion(op.id,{ referencia,importeCentimos:15050,moneda:'PEN' })));
  const estados = await Promise.all(pagos.map(p=>obtenerPago(p.id)));
  assert.equal(estados.filter(p=>p?.estado==='PAGADO').length,1);
  assert.equal((await pool.query('select count(*)::int as total from "incidenciasPago" where referencia=$1',[referencia])).rows[0].total,1);
});

test('HU53-19: un curso con historial financiero no puede borrarse en cascada', async () => {
  await assert.rejects(pool.query('delete from cursos where id=$1',[cursoId]));
  assert.equal((await pool.query('select 1 from cursos where id=$1',[cursoId])).rowCount,1);
});

test('HU53-07: discrepancia tardía de un intento rechazado se conserva aun con otro activo', async () => {
  const pago = await obligacion();
  const anterior = await iniciarOperacion(pago.id,usuarioId,{ medio:'CULQI',clave:randomUUID(),cargaHash:'a'.repeat(64) });
  await cambiarEstadoOperacion(anterior.id,'RECHAZADO');
  await iniciarOperacion(pago.id,usuarioId,{ medio:'CULQI',clave:randomUUID(),cargaHash:'b'.repeat(64) });
  const referencia = randomUUID();
  await confirmarOperacion(anterior.id,{ referencia,importeCentimos:1,moneda:'PEN' });
  assert.equal((await pool.query('select 1 from "incidenciasPago" where referencia=$1',[referencia])).rowCount,1);
  assert.equal((await obtenerPago(pago.id))?.estado,'PENDIENTE');
});

test('HU53-07: una referencia discrepante no se reasigna a otra deuda', async () => {
  const pago = await obligacion();
  const op = await iniciarOperacion(pago.id,usuarioId,{ medio:'CULQI',clave:randomUUID(),cargaHash:'a'.repeat(64) });
  const referencia = randomUUID();
  await confirmarOperacion(op.id,{ referencia,importeCentimos:100,moneda:'PEN' });
  await confirmarOperacion(op.id,{ referencia,importeCentimos:200,moneda:'PEN' });
  assert.equal((await pool.query('select count(*)::int as total from "incidenciasPago" where "operacionId"=$1 and referencia=$2',[op.id,referencia])).rows[0].total,2);
  const otro = await crearObligacion(pool,{ cursoId,usuarioId,intentoId:randomUUID(),concepto:'CURSO',importeCentimos:100,moneda:'PEN' });
  const otraOp = await iniciarOperacion(otro.id,usuarioId,{ medio:'CULQI',clave:randomUUID(),cargaHash:'b'.repeat(64) });
  await confirmarOperacion(otraOp.id,{ referencia,importeCentimos:100,moneda:'PEN' });
  assert.equal((await obtenerPago(otro.id))?.estado,'PENDIENTE');
});

test('HU53-07: una incidencia financiera bloquea efectivo aunque el intento previo esté rechazado', async () => {
  const pago=await obligacion();
  const op=await iniciarOperacion(pago.id,usuarioId,{medio:'CULQI',clave:randomUUID(),cargaHash:'a'.repeat(64)});
  await cambiarEstadoOperacion(op.id,'RECHAZADO');
  await confirmarOperacion(op.id,{referencia:randomUUID(),importeCentimos:1,moneda:'PEN'});
  await assert.rejects(registrarEfectivo(pago.id,adminId,`CAJA-INCIDENCIA-${pago.id}`),/incidencia/);
  assert.equal((await obtenerPago(pago.id))?.estado,'PENDIENTE');
});
