import { env } from '../../src/config/env.js';
import { emitirTokenQr, reloj } from '../../src/modules/qr/qr.token.js';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { redis } from '../../src/shared/redis.js';
let app: FastifyInstance;
const org = String(Date.now());
const usuarios = new Map<string, { id: string; token: string }>();
let curso: string; let codigo: string; let reemplazo: string;
const pedir = (persona: string | null, method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url, ...(persona ? { headers: { authorization: `Bearer ${usuarios.get(persona)!.token}` } } : {}), ...(payload ? { payload } : {}) });
before(async () => {
  await migrar(pool); app = await buildApp();

  for (const [nombre, rol] of [['admin','admin'],['docente','instructor'],['ochenta','agremiado'],['setenta','agremiado'],['ajeno','agremiado']]) {
    const id = (await pool.query<{ id: string }>("insert into users(name,email,password_hash,role,dni) values($1,$2,'sin-clave',$3,$4) returning id::text", [nombre, `${randomUUID()}@hu20.local`, rol, nombre==='ochenta' ? '34561234' : null])).rows[0]!.id;
    usuarios.set(nombre!, { id, token: app.jwt.sign({ sub: id }) });
  }
  curso = (await pool.query<{ id: string }>("insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado,estado)\n    values($1,$2,'HU20 presencial',24,'PRESENCIAL',0,10,'PARTICIPACION','PUBLICADO') returning id::text", [usuarios.get('admin')!.id, usuarios.get('docente')!.id])).rows[0]!.id;
  for (const nombre of ['ochenta','setenta']) await pool.query('insert into inscripciones_curso(curso_id,usuario_id) values($1,$2)', [curso,usuarios.get(nombre)!.id]);
  for (let indice=0;indice<10;indice++) {
    const id = (await pool.query<{ id: string }>("insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)\n      values($1,$2,$3,(now() at time zone 'America/Lima')::date-1,($4::text||':00')::time,($5::text||':00')::time,'Sala') returning id::text", [curso, `Sesión ${indice}`, usuarios.get('docente')!.id, indice+7, indice+8])).rows[0]!.id;
    for (const [nombre, cantidad] of [['ochenta',8],['setenta',7]] as const) {
      await pool.query("insert into enrollments(class_id,user_id) values($1,$2)", [id, usuarios.get(nombre)!.id]);
      if (indice<cantidad) await pool.query("insert into attendances(class_id,user_id,created_by) values($1,$2,$3)", [id, usuarios.get(nombre)!.id, usuarios.get('admin')!.id]);
    }
  }
});
after(async () => {
  try {
    await pool.query('delete from "auditoriaCertificados" where "cursoId"=$1', [curso]);
    await pool.query('delete from classes where instructor_id=any($1::bigint[])', [[...usuarios.values()].map(p => p.id)]);
    await pool.query('delete from cursos where creador_id=any($1::bigint[])', [[...usuarios.values()].map(p => p.id)]);
    await pool.query('delete from users where id=any($1::bigint[])', [[...usuarios.values()].map(p => p.id)]);

  } finally { await app?.close(); await pool.end(); redis.disconnect(); }
});
test('HU-20: vista previa calcula 80 y 70; no permite excepción sin motivo ni a otros roles', async () => {
  const vista = await pedir('admin','GET',`/api/cursos/${curso}/cierre`);
  assert.equal(vista.statusCode,200,vista.body);
  assert.deepEqual(vista.json().filas.map((f: { porcentaje: number })=>f.porcentaje).sort(),[70,80]);
  assert.equal((await pedir('admin','POST',`/api/cursos/${curso}/cerrar`,{excepciones:[{agremiadoId:usuarios.get('setenta')!.id,motivo:''}]})).statusCode,422);
  assert.equal((await pedir('docente','POST',`/api/cursos/${curso}/cerrar`,{excepciones:[]})).statusCode,403);
});
test('HU-20: cerrar emite solo 80 %, es idempotente y deja razón de asistencia al 70 %', async () => {
  const respuesta = await pedir('admin','POST',`/api/cursos/${curso}/cerrar`,{excepciones:[]});
  assert.equal(respuesta.statusCode,200,respuesta.body); assert.equal(respuesta.json().emitidos,1);
  const filas = (await pedir('admin','GET',`/api/cursos/${curso}/certificados`)).json().filas;
  codigo = filas.find((f: {agremiado:{id:string}})=>f.agremiado.id===usuarios.get('ochenta')!.id).certificado.codigo;
  assert.match(codigo,/^CPPP-[A-F0-9]{32}$/);
  assert.equal(filas.find((f: {agremiado:{id:string}})=>f.agremiado.id===usuarios.get('setenta')!.id).certificado,null);
  assert.equal((await pedir('admin','POST',`/api/cursos/${curso}/cerrar`,{excepciones:[]})).statusCode,200);
  assert.equal((await pool.query('select count(*)::int as total from certificados_curso where curso_id=$1',[curso])).rows[0].total,1);
});
test('HU-20: verificación pública mínima; PDF privado idéntico en dos descargas', async () => {
  const publico = await pedir(null,'GET',`/api/certificados/${codigo.toLowerCase()}`);
  assert.equal(publico.statusCode,200,publico.body); assert.equal(publico.json().estado,'VALIDO');
  assert.ok(!Object.keys(publico.json()).some(k=>/dni|nota|motivo|usuario|archivo/i.test(k)));
  assert.equal((await pedir(null,'GET',`/api/certificados/${codigo}/archivo`)).statusCode,401);
  assert.equal((await pedir('ajeno','GET',`/api/certificados/${codigo}/archivo`)).statusCode,403);
  const primero = await pedir('ochenta','GET',`/api/certificados/${codigo}/archivo`);
  assert.equal(primero.statusCode,200,primero.body); assert.equal(primero.rawPayload.subarray(0,5).toString(),'%PDF-');
  await writeFile('/tmp/constanciaHu20.pdf',primero.rawPayload);
  assert.deepEqual(primero.rawPayload,(await pedir('ochenta','GET',`/api/certificados/${codigo}/archivo`)).rawPayload);
});
test('HU-20: excepción auditada; corrección reemplaza y anulación conserva verificación', async () => {
  assert.equal((await pedir('admin','POST',`/api/cursos/${curso}/excepciones`,{agremiadoId:usuarios.get('setenta')!.id,motivo:''})).statusCode,422);
  assert.equal((await pedir('admin','POST',`/api/cursos/${curso}/excepciones`,{agremiadoId:usuarios.get('setenta')!.id,motivo:'Justificación de prueba'})).statusCode,201);
  const corregido = await pedir('admin','POST',`/api/certificados/${codigo}/corregir`,{nombre:'Nombre corregido',motivo:'Corrección de datos'});
  assert.equal(corregido.statusCode,201,corregido.body); reemplazo=corregido.json().codigo;
  const anterior=(await pedir(null,'GET',`/api/certificados/${codigo}`)).json(); assert.equal(anterior.estado,'REEMPLAZADO'); assert.equal(anterior.reemplazadoPor,reemplazo);
  assert.equal((await pedir('ochenta','GET',`/api/certificados/${codigo}/archivo`)).statusCode,409);
  assert.equal((await pedir('admin','POST',`/api/certificados/${reemplazo}/anular`,{motivo:''})).statusCode,422);
  assert.equal((await pedir('admin','POST',`/api/certificados/${reemplazo}/anular`,{motivo:'Anulación de prueba'})).statusCode,204);
  assert.equal((await pedir(null,'GET',`/api/certificados/${reemplazo}`)).json().estado,'ANULADO');
  assert.equal((await pedir('ochenta','GET',`/api/certificados/${reemplazo}/archivo`)).statusCode,409);
  assert.ok((await pool.query('select count(*)::int as total from "auditoriaCertificados" where "cursoId"=$1',[curso])).rows[0].total>=5);
});


test('HU-20: no certifica modalidades/exámenes/pagos futuros ni cierra antes de acabar o fuera de siete días', async () => {
  for (const [modalidad,tipo,costo,dias,esperado] of [['VIRTUAL','PARTICIPACION',0,-1,'CERTIFICACION_FUERA_ALCANCE'],['PRESENCIAL','APROBACION',0,-1,'CERTIFICACION_FUERA_ALCANCE'],['PRESENCIAL','PARTICIPACION',20,-1,'CERTIFICACION_FUERA_ALCANCE'],['PRESENCIAL','PARTICIPACION',0,1,'SESIONES_PENDIENTES'],['PRESENCIAL','PARTICIPACION',0,-9,'CIERRE_FUERA_PLAZO']] as const) {
    const id=(await pool.query<{id:string}>("insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado,estado)\n      values($1,$2,'Alcance HU20',8,$3,$4,5,$5,'PUBLICADO') returning id::text",[usuarios.get('admin')!.id, usuarios.get('docente')!.id, modalidad, costo, tipo])).rows[0]!.id;
    await pool.query("insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar) values($1,'Sesión límite',$2,(now() at time zone 'America/Lima')::date+$3::int,'01:00','02:00','Sala')",[id, usuarios.get('docente')!.id, dias]);
    const resultado=await pedir('admin','POST',`/api/cursos/${id}/cerrar`,{excepciones:[]});
    assert.equal(resultado.statusCode,409,resultado.body); assert.equal(resultado.json().code,esperado);
  }
});


test('HU-20: un curso cerrado no admite nuevas sesiones, QR o asistencias tardías', async () => {
  const sesion=(await pool.query<{id:string}>('select id::text from classes where curso_id=$1 order by id desc limit 1',[curso])).rows[0]!;
  assert.equal((await pedir('admin','POST',`/api/cursos/${curso}/publicar`)).statusCode,409);
  assert.equal((await pedir('admin','POST',`/api/cursos/${curso}/sesiones`,{})).statusCode,409);
  assert.equal((await pedir('docente','GET',`/api/clases/${sesion.id}/qr`)).statusCode,409);
  const anterior=reloj.ahora; const ahora=Math.floor(Date.now()/30000)*30000+1000;
  reloj.ahora=()=>ahora;
  try {
    const token=emitirTokenQr(sesion.id,ahora,env.QR_SECRET).token;
    const respuesta=await pedir('setenta','POST','/api/asistencia/marcar',{token});
    assert.equal(respuesta.statusCode,409,respuesta.body); assert.equal(respuesta.json().code,'CURSO_CERRADO');
  } finally {reloj.ahora=anterior}
});

test('HU-20: un fallo de auditoría revierte curso, inscripción y archivo emitido', async () => {
  const nuevo=(await pool.query<{id:string}>("insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado,estado)\n    values($1,$2,'Cierre atómico',8,'PRESENCIAL',0,5,'PARTICIPACION','PUBLICADO') returning id::text",[usuarios.get('admin')!.id, usuarios.get('docente')!.id])).rows[0]!.id;
  const persona=usuarios.get('ochenta')!.id;
  await pool.query('insert into inscripciones_curso(curso_id,usuario_id) values($1,$2)',[nuevo,persona]);
  const sesion=(await pool.query<{id:string}>("insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)\n    values($1,'Sesión atómica',$2,(now() at time zone 'America/Lima')::date-1,'20:00','21:00','Sala') returning id::text",[nuevo, usuarios.get('docente')!.id])).rows[0]!.id;
  await pool.query("insert into enrollments(class_id,user_id) values($1,$2)",[sesion, persona]);
  await pool.query("insert into attendances(class_id,user_id,created_by) values($1,$2,$3)",[sesion, persona, usuarios.get('admin')!.id]);
  await pool.query(`alter table "auditoriaCertificados" add constraint "falloAuditoriaPrueba" check(accion<>'CERRAR') not valid`);
  try {
    assert.equal((await pedir('admin','POST',`/api/cursos/${nuevo}/cerrar`,{excepciones:[]})).statusCode,500);
    assert.equal((await pool.query('select estado from cursos where id=$1',[nuevo])).rows[0].estado,'PUBLICADO');
    assert.equal((await pool.query('select estado from inscripciones_curso where curso_id=$1',[nuevo])).rows[0].estado,'EN_CURSO');
    assert.equal((await pool.query('select count(*)::int as total from certificados_curso where curso_id=$1',[nuevo])).rows[0].total,0);
    assert.equal((await pool.query('select count(*)::int as total from "auditoriaCertificados" where "cursoId"=$1',[nuevo])).rows[0].total,0);
  } finally {await pool.query('alter table "auditoriaCertificados" drop constraint "falloAuditoriaPrueba"')}
});
