import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { pool } from "../../src/shared/database.js";
import { redis } from "../../src/shared/redis.js";
import { migrar } from "../../src/shared/migraciones.js";
import { env } from "../../src/config/env.js";

let aplicacion: FastifyInstance;
let claseIdentificador: string;
let reunionIdentificador: string;
const organizacionAjena = Date.now();
const usuarios = new Map<string, { identificador: string; token: string }>();
const prefijo = `reuniones${Date.now()}`;
const configuracionAnterior = { habilitado: env.jitsiHabilitado, dominio: env.jitsiDominio, aplicacion: env.jitsiAplicacion, secreto: env.jitsiSecreto };
const llamar = (nombre: string, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) => aplicacion.inject({ method, url, headers: { authorization: `Bearer ${usuarios.get(nombre)!.token}` }, ...(payload ? { payload } : {}) });

before(async () => {
  await migrar(pool);
  aplicacion = await buildApp();
  env.jitsiHabilitado = true;
  env.jitsiDominio = 'meet.prueba.local';
  env.jitsiAplicacion = 'gestioncapa';
  env.jitsiSecreto = 'secretoDePruebaJitsiDistintoDelResto123';
  for (const [nombre, rol] of [['gestor','coordinador'],['docente','instructor'],['inscrito','participante'],['ajeno','participante']]) {
    const persona = (await pool.query('insert into users (name,email,password_hash,role) values ($1,$2,$3,$4) returning id', [nombre, `${prefijo}${nombre}@prueba.local`, 'sinAccesoPorClave', rol])).rows[0];
    usuarios.set(nombre!, { identificador: persona.id, token: aplicacion.jwt.sign({ sub: String(persona.id) }) });
  }
  await pool.query('insert into organizations(id,name) values ($1,$2)', [organizacionAjena, prefijo]);
  const administradorAjeno = (await pool.query('insert into users(name,email,password_hash,role,organization_id) values ($1,$2,$3,$4,$5) returning id',
    ['Administrador ajeno', `${prefijo}administradorAjeno@prueba.local`, 'sinAccesoPorClave', 'admin', organizacionAjena])).rows[0];
  usuarios.set('administradorAjeno', { identificador: administradorAjeno.id, token: aplicacion.jwt.sign({ sub: String(administradorAjeno.id) }) });
  claseIdentificador = (await pool.query(`insert into classes(nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar) values ($1,$2,'2032-01-01','10:00','11:00','Virtual') returning id`, [prefijo, usuarios.get('docente')!.identificador])).rows[0].id;
  await pool.query('insert into enrollments(class_id,user_id) values ($1,$2)', [claseIdentificador, usuarios.get('inscrito')!.identificador]);
});
after(async () => {
  if (reunionIdentificador) {
    await pool.query('delete from "notificacionesReunion" where "reunionIdentificador"=$1', [reunionIdentificador]);
    await pool.query('delete from "participantesReunion" where "reunionIdentificador"=$1', [reunionIdentificador]);
    await pool.query('delete from reuniones where identificador=$1', [reunionIdentificador]);
  }
  if (claseIdentificador) await pool.query('delete from classes where id=$1', [claseIdentificador]);
  await pool.query('delete from users where email like $1', [`${prefijo}%`]);
  await pool.query('delete from organizations where id=$1', [organizacionAjena]);
  env.jitsiHabilitado = configuracionAnterior.habilitado;
  env.jitsiDominio = configuracionAnterior.dominio;
  env.jitsiAplicacion = configuracionAnterior.aplicacion;
  env.jitsiSecreto = configuracionAnterior.secreto;
  await aplicacion?.close(); await pool.end(); redis.disconnect();
});

test('Flujo autorizado: crear, iniciar, emitir, retirar y finalizar', async () => {
  const datos = { claseIdentificador, titulo: 'Reunión protegida', inicioProgramado: new Date(Date.now() - 60000).toISOString(), finProgramado: new Date(Date.now() + 3600000).toISOString() };
  assert.equal((await llamar('inscrito','POST','/api/reuniones',datos)).statusCode,403);
  const creada = await llamar('gestor','POST','/api/reuniones',datos);
  assert.equal(creada.statusCode,201,creada.body);
  reunionIdentificador = creada.json().identificador;
  const ruta = `/api/reuniones/${reunionIdentificador}`;
  assert.equal((await pool.query('select * from "notificacionesReunion" where "reunionIdentificador"=$1',[reunionIdentificador])).rowCount,2);
  assert.equal((await llamar('ajeno','GET',ruta)).statusCode,403);
  assert.equal((await llamar('administradorAjeno','GET',ruta)).statusCode,403);
  assert.equal((await llamar('administradorAjeno','POST',`${ruta}/iniciar`)).statusCode,403);
  assert.deepEqual((await llamar('administradorAjeno','GET','/api/reuniones')).json(), []);
  assert.equal((await llamar('ajeno','POST',`${ruta}/credencial`)).statusCode,403);
  assert.equal((await llamar('inscrito','POST',`${ruta}/iniciar`)).statusCode,403);
  const edicion = { titulo: datos.titulo, inicioProgramado: datos.inicioProgramado, finProgramado: datos.finProgramado };
  assert.equal((await llamar('docente','PATCH',ruta,edicion)).statusCode,200);
  assert.equal((await llamar('docente','PATCH',ruta,{ ...edicion, finProgramado: edicion.inicioProgramado })).statusCode,422);
  assert.equal((await llamar('inscrito','POST',`${ruta}/credencial`)).statusCode,409);
  assert.equal((await llamar('docente','POST',`${ruta}/iniciar`)).statusCode,200);
  assert.equal((await llamar('docente','POST',`${ruta}/iniciar`)).statusCode,200);
  const credencial = await llamar('inscrito','POST',`${ruta}/credencial`);
  assert.equal(credencial.statusCode,200,credencial.body);
  assert.equal(credencial.headers['cache-control'],'no-store');
  assert.ok(credencial.json().token);
  const claims = JSON.parse(Buffer.from(credencial.json().token.split('.')[1], 'base64url').toString());
  assert.equal(claims.context.user.moderator, false);
  const credencialAnfitrion = await llamar('docente','POST',`${ruta}/credencial`);
  assert.equal(credencialAnfitrion.statusCode, 200);
  const claimsAnfitrion = JSON.parse(Buffer.from(credencialAnfitrion.json().token.split('.')[1], 'base64url').toString());
  assert.equal(claimsAnfitrion.context.user.moderator, true);
  env.jitsiHabilitado = false;
  assert.equal((await llamar('inscrito','POST',`${ruta}/credencial`)).statusCode,503);
  env.jitsiHabilitado = true;
  await pool.query('delete from enrollments where class_id=$1 and user_id=$2', [claseIdentificador, usuarios.get('inscrito')!.identificador]);
  assert.equal((await llamar('inscrito','POST',`${ruta}/credencial`)).statusCode,403);
  await pool.query('insert into enrollments(class_id,user_id) values ($1,$2)', [claseIdentificador, usuarios.get('inscrito')!.identificador]);
  assert.equal((await llamar('gestor','POST',`${ruta}/participantes/${usuarios.get('inscrito')!.identificador}/retirar`)).statusCode,200);
  assert.equal((await llamar('inscrito','POST',`${ruta}/credencial`)).statusCode,403);
  assert.equal((await llamar('docente','POST',`${ruta}/finalizar`)).statusCode,200);
  assert.equal((await llamar('docente','POST',`${ruta}/credencial`)).statusCode,409);
  assert.equal((await llamar('docente','POST',`${ruta}/iniciar`)).statusCode,409);
});
