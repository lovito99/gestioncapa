import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { migrar } from '../../src/shared/migraciones.js';
import { pool } from '../../src/shared/database.js';
import { redis } from '../../src/shared/redis.js';
const usuarios = new Map<string,{ id:number; token:string }>();
const creados: number[] = [];
let app: FastifyInstance;
const pedir = (actor:string,method:'GET'|'POST'|'PUT',url:string,payload?:object) => app.inject({method,url,headers:{authorization:`Bearer ${usuarios.get(actor)!.token}`},...(payload?{payload}:{})});
before(async () => {
  await migrar(pool);app=await buildApp();
  for(const rol of ['admin','instructor','agremiado']) {
    const id=(await pool.query<{id:number}>("insert into users(name,email,password_hash,role) values($1,$2,'sin-clave',$1) returning id",[rol,`${randomUUID()}@prueba.local`])).rows[0]!.id;
    creados.push(id);usuarios.set(rol,{id,token:app.jwt.sign({sub:String(id)})});
  }
});
after(async () => {try {await pool.query('delete from users where id=any($1::bigint[])',[creados]);} finally {await app?.close();await pool.end();redis.disconnect();}});
test('HU-35: solo el administrador puede listar, crear y editar usuarios',async () => {
  for(const actor of ['instructor','agremiado']) for(const [method,url] of [['GET','/api/usuarios'],['POST','/api/usuarios'],['PUT',`/api/usuarios/${usuarios.get('agremiado')!.id}`]] as const) assert.equal((await pedir(actor,method,url,method==='GET'?undefined:{})).statusCode,403);
  assert.equal((await pedir('admin','GET','/api/usuarios?tamanoPagina=51')).statusCode,422);
});
test('HU-35: alta con bcrypt, edición y desactivación auditadas; sesión antigua revocada por estado',async () => {
  const datos={nombre:'Docente de prueba',email:`${randomUUID()}@prueba.local`,rol:'agremiado',activo:true,password:'abcdefgh',motivo:'Alta para capacitación'};
  const respuesta=await pedir('admin','POST','/api/usuarios',datos);assert.equal(respuesta.statusCode,201,respuesta.body);
  const id=Number(respuesta.json().id);creados.push(id);
  const fila=(await pool.query('select password_hash from users where id=$1',[id])).rows[0]!;
  assert.equal(await bcrypt.compare(datos.password,fila.password_hash),true);
  assert.ok(!respuesta.body.includes('password'));
  const {password,...cambio}=datos;
  const actualizada=await pedir('admin','PUT',`/api/usuarios/${id}`,{...cambio,rol:'instructor',activo:false,motivo:'Cambio de funciones'});assert.equal(actualizada.statusCode,200,actualizada.body);
  assert.equal(actualizada.json().rol,'instructor');assert.equal(actualizada.json().activo,false);
  assert.equal((await app.inject({method:'GET',url:'/api/auth/me',headers:{authorization:`Bearer ${app.jwt.sign({sub:String(id)})}`}})).statusCode,401);
  const auditoria=(await pool.query('select "actorId",motivo,fecha from "auditoriaRoles" where "usuarioId"=$1 order by id',[id])).rows;
  assert.equal(auditoria.length,2);assert.equal(Number(auditoria[1]!.actorId),Number(usuarios.get('admin')!.id));assert.equal(auditoria[1]!.motivo,'Cambio de funciones');assert.ok(auditoria[1]!.fecha instanceof Date);
  assert.equal((await pedir('admin','POST','/api/usuarios',datos)).statusCode,409);
  assert.equal((await pedir('admin','PUT',`/api/usuarios/${usuarios.get('admin')!.id}`,{...cambio,rol:'agremiado'})).statusCode,409);
  assert.equal((await pedir('admin','POST','/api/usuarios',{...datos,email:`${randomUUID()}@prueba.local`,rol:'coordinador'})).statusCode,422);
});
