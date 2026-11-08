import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { redis } from '../../src/shared/redis.js';

let app: FastifyInstance;
let usuarioId: string;
const email = `acceso-${Date.now()}@prueba.local`;
const password = 'ClaveDePruebaSegura42';
const prefijo = `gestioncapa:${env.DB_NAME}:acceso:`;
const huella = (valor: string) => createHash('sha256').update(valor).digest('hex');
const baseLogin = `${prefijo}login:${huella(email)}`;
const tokens: string[] = [];
const login = (clave = password) => app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: clave } });
const autenticar = async () => {
  const respuesta = await login();
  assert.equal(respuesta.statusCode, 200, respuesta.body);
  tokens.push(respuesta.json().token);
  return respuesta.json().token as string;
};
const consultar = (token: string) => app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${token}` } });

before(async () => {
  await migrar(pool); app = await buildApp();
  usuarioId = (await pool.query<{ id: string }>(`insert into users(name,email,password_hash,role) values('Agremiado de prueba',$1,$2,'agremiado') returning id::text`, [email, await bcrypt.hash(password, 4)])).rows[0]!.id;
});
after(async () => {
  await redis.del(`${baseLogin}:fallos`, `${baseLogin}:bloqueo`, `${prefijo}usuario:${usuarioId}`, ...tokens.map(token => `${prefijo}token:${huella(token)}`));
  await pool.query('delete from users where id=$1', [usuarioId]);
  await app?.close(); await pool.end(); redis.disconnect();
});

test('RNF-11: logout revoca únicamente el token utilizado y cada login tiene una sesión distinta', async () => {
  const primero = await autenticar(); const segundo = await autenticar();
  assert.notEqual(primero, segundo);
  assert.equal((await consultar(primero)).json().usuario.cargo, 'Agremiado');
  const salida = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { authorization: `Bearer ${primero}` } });
  assert.equal(salida.statusCode, 204);
  assert.equal((await consultar(primero)).statusCode, 401);
  assert.equal((await consultar(segundo)).statusCode, 200);
  const expirado = app.jwt.sign({ sub: usuarioId }, { expiresIn: -1 });
  assert.equal((await consultar(expirado)).statusCode, 401);
});

test('RNF-13: quinto fallo bloquea por 15 minutos incluso con la contraseña correcta', async () => {
  for (let intento = 1; intento < 5; intento++) assert.equal((await login('incorrecta')).statusCode, 401);
  const bloqueo = await login('incorrecta');
  assert.equal(bloqueo.statusCode, 423);
  assert.equal(bloqueo.headers['retry-after'], '900');
  await redis.expire(`${baseLogin}:bloqueo`, 20);
  const correctoBloqueado = await login();
  assert.equal(correctoBloqueado.statusCode, 423);
  assert.ok(Number(correctoBloqueado.headers['retry-after']) <= 20);
  assert.ok(await redis.ttl(`${baseLogin}:bloqueo`) <= 20, 'Los intentos no renuevan el bloqueo');
  await redis.del(`${baseLogin}:bloqueo`);
  await autenticar();
  assert.equal(await redis.exists(`${baseLogin}:fallos`), 0);
  assert.equal((await login('incorrecta')).statusCode, 401);
});

test('RNF-13: límite por usuario compartido entre sus sesiones y respuesta recuperable', async () => {
  const primero = await autenticar(); const segundo = await autenticar();
  const limiteAnterior = env.limitePeticiones;
  await redis.del(`${prefijo}usuario:${usuarioId}`);
  env.limitePeticiones = 2;
  try {
    assert.equal((await consultar(primero)).statusCode, 200);
    assert.equal((await consultar(segundo)).statusCode, 200);
    const respuesta = await consultar(primero);
    assert.equal(respuesta.statusCode, 429);
    assert.equal(respuesta.json().code, 'LIMITE_PETICIONES');
    assert.ok(Number(respuesta.headers['retry-after']) > 0);
    await redis.del(`${prefijo}usuario:${usuarioId}`);
    assert.equal((await consultar(primero)).statusCode, 200);
  } finally { env.limitePeticiones = limiteAnterior; }
});

test('RNF-14: CORS anuncia únicamente el frontend configurado', async () => {
  const respuesta = await app.inject({ url: '/api/health', headers: { origin: 'https://ajeno.invalid' } });
  assert.equal(respuesta.headers['access-control-allow-origin'], env.FRONTEND_URL);
  assert.notEqual(respuesta.headers['access-control-allow-origin'], '*');
});
