import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { redis } from '../../src/shared/redis.js';

let app: FastifyInstance;
const marca = `registro-${Date.now()}`;
const datos = (cambios: object = {}) => ({ dni: '00000071', nombres: 'Docente', apellidos: 'De prueba', email: `${marca}@prueba.local`, celular: '987654321', password: 'abcdefgh', aceptaPrivacidad: true, ...cambios });
const direccion = '198.51.100.50';
const claveLimite = `gestioncapa:${env.DB_NAME}:acceso:registro:${createHash('sha256').update(direccion).digest('hex')}`;
const registrar = (cambios: object = {}) => app.inject({ method: 'POST', url: '/api/auth/registro', remoteAddress: direccion, payload: datos(cambios) });
before(async () => { await migrar(pool); app = await buildApp(); await redis.del(claveLimite); });
after(async () => {
  try {
    await pool.query('delete from "auditoriaRegistro" where "usuarioId" in (select id from users where email like $1)', [`${marca}%`]);
    await pool.query('delete from users where email like $1', [`${marca}%`]);
    await redis.del(claveLimite);
  } finally { await app?.close(); await pool.end(); redis.disconnect(); }
});
test('HU-50: crea agremiado, guarda bcrypt y auditoría, e inicia sesión sin exigir símbolos', async () => {
  const respuesta = await registrar();
  assert.equal(respuesta.statusCode, 201, respuesta.body);
  const cuerpo = respuesta.json();
  assert.equal(cuerpo.usuario.rol, 'AGREMIADO'); assert.equal(cuerpo.usuario.cargo, 'Agremiado');
  assert.equal(cuerpo.usuario.nombre, 'Docente De prueba');
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { authorization: `Bearer ${cuerpo.token}` } })).statusCode, 200);
  const usuario = (await pool.query('select * from users where id=$1', [cuerpo.usuario.id])).rows[0];
  assert.equal(usuario.role, 'agremiado'); assert.ok(!('organization_id' in usuario));
  assert.equal(usuario.celular, '987654321'); assert.equal(usuario.dni, '00000071');
  assert.notEqual(usuario.password_hash, 'abcdefgh'); assert.equal(await bcrypt.compare('abcdefgh', usuario.password_hash), true);
  const auditoria = (await pool.query('select * from "auditoriaRegistro" where "usuarioId"=$1', [usuario.id])).rows;
  assert.equal(auditoria.length, 1); assert.ok(auditoria[0].fecha instanceof Date);
  assert.ok(!JSON.stringify(cuerpo).includes('password')); assert.ok(!JSON.stringify(cuerpo).includes('987654321'));
});
test('HU-50: DNI y correo duplicados responden 409 incluso con distinta capitalización', async () => {
  for (const cambios of [{ email: `${marca}-dni@prueba.local` }, { dni: '00000072', email: `${marca.toUpperCase()}@PRUEBA.LOCAL` }]) {
    const respuesta = await registrar(cambios); assert.equal(respuesta.statusCode, 409, respuesta.body);
    assert.equal(respuesta.json().code, 'CUENTA_YA_REGISTRADA'); assert.equal(respuesta.json().token, undefined);
  }
});
test('HU-50: valida todos los campos en servidor sin admitir roles o datos adicionales', async () => {
  for (const [campo, valor] of [['dni','123'],['nombres',''],['apellidos',''],['email','invalido'],['celular','123456789'],['password','1234567'],['aceptaPrivacidad',false]]) {
    const respuesta = await registrar({ [String(campo)]: valor }); assert.equal(respuesta.statusCode, 422, respuesta.body);
    assert.ok(respuesta.json().fields[String(campo)]);
  }
  assert.equal((await registrar({ rol: 'ADMIN' })).statusCode, 422);
  assert.equal((await registrar({ password: 'á'.repeat(37) })).statusCode, 422, 'No permitir truncado bcrypt a 72 bytes');
});
test('HU-50: altas concurrentes no duplican DNI/correo ni auditoría', async () => {
  const respuestas = await Promise.all([registrar({ dni: '00000073', email: `${marca}-concurrente@prueba.local` }), registrar({ dni: '00000073', email: `${marca}-concurrente@prueba.local` })]);
  assert.deepEqual(respuestas.map(r => r.statusCode).sort(), [201,409]);
});

test('HU-50: si falla la auditoría se revierte también la cuenta', async () => {
  await pool.query('alter table "auditoriaRegistro" add constraint "falloPruebaRegistro" check(false) not valid');
  try {
    const respuesta = await registrar({ dni: '00000074', email: `${marca}-rollback@prueba.local` });
    assert.equal(respuesta.statusCode, 500);
    assert.equal((await pool.query('select count(*)::int as total from users where email=$1', [`${marca}-rollback@prueba.local`])).rows[0].total, 0);
  } finally { await pool.query('alter table "auditoriaRegistro" drop constraint "falloPruebaRegistro"'); }
});

test('HU-50: limita las altas públicas por dirección antes de ejecutar bcrypt', async () => {
  await redis.del(claveLimite);
  const entrada = { dni: '00000075', email: `${marca}-limite@prueba.local` };
  assert.equal((await registrar(entrada)).statusCode, 201);
  for (let intento = 1; intento < 10; intento++) assert.equal((await registrar(entrada)).statusCode, 409);
  const respuesta = await registrar(entrada);
  assert.equal(respuesta.statusCode, 429);
  assert.equal(respuesta.json().code, 'LIMITE_REGISTROS');
  assert.ok(Number(respuesta.headers['retry-after']) > 0);
});
