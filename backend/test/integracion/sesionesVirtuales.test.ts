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
let claseAjena: string;
const prefijo = `hu26${Date.now()}`;
const usuarios = new Map<string, { identificador: string; token: string }>();
const anterior = { ...env };
const secretoEventos = 'secretoEventosDePruebaDistintoDelResto1234';
const llamar = (nombre: string | null, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) => aplicacion.inject({
  method, url, headers: nombre ? { authorization: `Bearer ${usuarios.get(nombre)!.token}` } : {}, ...(payload ? { payload } : {}) });
const evento = (tipo: string, cuerpo: object, secreto = secretoEventos) => aplicacion.inject({
  method: 'POST', url: `/api/jitsi/events/${tipo}`, headers: secreto ? { authorization: `Bearer ${secreto}` } : {}, payload: cuerpo });
const politicasBase = { camaraPermitida: true, microfonoPermitido: true, pantallaPermitida: false, manoPermitida: true, porcentajeMinimo: 70, grabacionPrevista: false };

async function crearReunion(clase = claseIdentificador, creador = 'gestor') {
  const respuesta = await llamar(creador, 'POST', '/api/reuniones', { claseIdentificador: clase, titulo: 'Sesión segura', inicioProgramado: '2032-01-01T10:00:00-05:00', finProgramado: '2032-01-01T11:00:00-05:00' });
  assert.equal(respuesta.statusCode, 201, respuesta.body);
  return respuesta.json() as { identificador: string; nombreSala: string; pantallaPermitida: boolean; porcentajeMinimo: number };
}

before(async () => {
  await migrar(pool);
  aplicacion = await buildApp();
  Object.assign(env, { jitsiHabilitado: true, jitsiDominio: 'meet.prueba.local', jitsiAplicacion: 'gestioncapa', jitsiSecreto: 'secretoDePruebaJitsiDistintoDelResto123', jitsiEventosSecreto: secretoEventos });
  for (const [nombre, rol] of [['gestor', 'admin'], ['docente', 'instructor'], ['otroDocente', 'instructor'], ['inscrito', 'agremiado'], ['segundo', 'agremiado'], ['expulsado', 'agremiado'], ['ajeno', 'agremiado']] as const) {
    const persona = (await pool.query('insert into users (name,email,password_hash,role) values ($1,$2,$3,$4) returning id', [nombre, `${prefijo}${nombre}@prueba.local`, 'sinAccesoPorClave', rol])).rows[0];
    usuarios.set(nombre, { identificador: String(persona.id), token: aplicacion.jwt.sign({ sub: String(persona.id) }) });
  }
  claseIdentificador = (await pool.query(`insert into classes(nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar,modalidad) values ($1,$2,'2032-01-01','10:00','11:00','Sala virtual','VIRTUAL') returning id`, [prefijo, usuarios.get('docente')!.identificador])).rows[0].id;
  claseAjena = (await pool.query(`insert into classes(nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar,modalidad) values ($1,$2,'2032-01-02','10:00','11:00','Sala virtual','VIRTUAL') returning id`, [`${prefijo}ajena`, usuarios.get('otroDocente')!.identificador])).rows[0].id;
  for (const nombre of ['inscrito', 'segundo', 'expulsado']) await pool.query('insert into enrollments(class_id,user_id) values ($1,$2)', [claseIdentificador, usuarios.get(nombre)!.identificador]);
});

after(async () => {
  const reuniones = (await pool.query('select identificador from reuniones where "claseIdentificador" = any($1::bigint[])', [[claseIdentificador, claseAjena]])).rows.map(fila => fila.identificador);
  for (const tabla of ['"asistenciaReunion"', '"conexionesReunion"', '"notificacionesReunion"', '"participantesReunion"']) await pool.query(`delete from ${tabla} where "reunionIdentificador" = any($1::uuid[])`, [reuniones]);
  await pool.query('delete from reuniones where identificador = any($1::uuid[])', [reuniones]);
  await pool.query('delete from attendances where class_id = any($1::bigint[])', [[claseIdentificador, claseAjena]]);
  await pool.query('delete from classes where id = any($1::bigint[])', [[claseIdentificador, claseAjena]]);
  await pool.query('delete from users where email like $1', [`${prefijo}%`]);
  Object.assign(env, anterior);
  await aplicacion?.close(); await pool.end(); redis.disconnect();
});

test('HU26-07: una reunión nueva restringe la pantalla y fija el mínimo de 70 %', async () => {
  const reunion = await crearReunion();
  assert.equal(reunion.pantallaPermitida, false);
  assert.equal(reunion.porcentajeMinimo, 70);
});

test('HU-26: el instructor asignado crea la reunión de su sesión y no la de otra', async () => {
  const propia = await llamar('docente', 'POST', '/api/reuniones', { claseIdentificador, titulo: 'Mi sesión', inicioProgramado: '2032-01-01T10:00:00-05:00', finProgramado: '2032-01-01T11:00:00-05:00' });
  assert.equal(propia.statusCode, 201, propia.body);
  const ajena = await llamar('docente', 'POST', '/api/reuniones', { claseIdentificador: claseAjena, titulo: 'Ajena', inicioProgramado: '2032-01-01T10:00:00-05:00', finProgramado: '2032-01-01T11:00:00-05:00' });
  assert.equal(ajena.statusCode, 403);
  assert.equal((await llamar('inscrito', 'POST', '/api/reuniones', { claseIdentificador, titulo: 'No', inicioProgramado: '2032-01-01T10:00:00-05:00', finProgramado: '2032-01-01T11:00:00-05:00' })).statusCode, 403);
});

test('HU26-01/02/03: sin sesión 401, no inscrito 403; el colegiado recibe la marca de sala de espera', async () => {
  const reunion = await crearReunion();
  assert.equal((await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/iniciar`)).statusCode, 200);
  assert.equal((await llamar(null, 'POST', `/api/reuniones/${reunion.identificador}/credencial`)).statusCode, 401);
  assert.equal((await llamar('ajeno', 'POST', `/api/reuniones/${reunion.identificador}/credencial`)).statusCode, 403);
  const credencial = await llamar('inscrito', 'POST', `/api/reuniones/${reunion.identificador}/credencial`);
  assert.equal(credencial.statusCode, 200, credencial.body);
  const usuario = JSON.parse(Buffer.from(credencial.json().token.split('.')[1], 'base64url').toString()).context.user;
  assert.equal(usuario.lobby, true);
  assert.equal(usuario.moderator, false);
  const anfitrion = JSON.parse(Buffer.from((await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/credencial`)).json().token.split('.')[1], 'base64url').toString()).context.user;
  assert.equal(anfitrion.lobby, undefined);
  assert.equal(anfitrion.moderator, true);
});

test('HU26-06/10: el instructor guarda políticas validadas; el colegiado no puede cambiarlas', async () => {
  const reunion = await crearReunion();
  const ruta = `/api/reuniones/${reunion.identificador}/politicas`;
  const guardada = await llamar('docente', 'PATCH', ruta, { ...politicasBase, microfonoPermitido: false, manoPermitida: false, porcentajeMinimo: 80 });
  assert.equal(guardada.statusCode, 200, guardada.body);
  assert.deepEqual((({ camaraPermitida, microfonoPermitido, pantallaPermitida, manoPermitida, porcentajeMinimo, grabacionPrevista }) => ({ camaraPermitida, microfonoPermitido, pantallaPermitida, manoPermitida, porcentajeMinimo, grabacionPrevista }))(guardada.json()),
    { ...politicasBase, microfonoPermitido: false, manoPermitida: false, porcentajeMinimo: 80 });
  assert.equal((await llamar('inscrito', 'PATCH', ruta, politicasBase)).statusCode, 403);
  assert.equal((await llamar('otroDocente', 'PATCH', ruta, politicasBase)).statusCode, 403);
  for (const invalido of [{ ...politicasBase, porcentajeMinimo: 0 }, { ...politicasBase, porcentajeMinimo: 101 }, { ...politicasBase, rol: 'anfitrion' }, { camaraPermitida: true }]) {
    assert.equal((await llamar('docente', 'PATCH', ruta, invalido)).statusCode, 422);
  }
  await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/iniciar`);
  // El aviso de grabación debe conocerse antes de entrar: no cambia con la reunión iniciada.
  assert.equal((await llamar('docente', 'PATCH', ruta, { ...politicasBase, grabacionPrevista: true })).statusCode, 409);
  assert.equal((await llamar('docente', 'PATCH', ruta, { ...politicasBase, pantallaPermitida: true })).statusCode, 200);
  await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/finalizar`);
  assert.equal((await llamar('docente', 'PATCH', ruta, politicasBase)).statusCode, 409);
});

test('HU26-04: con grabación prevista no se emite credencial sin aceptar el aviso', async () => {
  const reunion = await crearReunion();
  assert.equal((await llamar('docente', 'PATCH', `/api/reuniones/${reunion.identificador}/politicas`, { ...politicasBase, grabacionPrevista: true })).statusCode, 200);
  await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/iniciar`);
  const ruta = `/api/reuniones/${reunion.identificador}/credencial`;
  const sinAceptar = await llamar('inscrito', 'POST', ruta);
  assert.equal(sinAceptar.statusCode, 422);
  assert.equal(sinAceptar.json().code, 'AVISO_GRABACION_PENDIENTE');
  assert.equal((await llamar('inscrito', 'POST', ruta, { aceptaGrabacion: true })).statusCode, 200);
  const aceptado = (await pool.query('select "avisoGrabacionAceptadoEn" from "participantesReunion" where "reunionIdentificador"=$1 and "usuarioIdentificador"=$2', [reunion.identificador, usuarios.get('inscrito')!.identificador])).rows[0];
  assert.ok(aceptado?.avisoGrabacionAceptadoEn instanceof Date);
  assert.equal((await llamar('inscrito', 'POST', ruta)).statusCode, 200, 'la aceptación registrada vale para reconectarse');
  assert.equal((await llamar('docente', 'POST', ruta)).statusCode, 200, 'quien graba no necesita aceptar su propio aviso');
});

test('HU26-09: el expulsado queda retirado con fecha y no recibe una credencial nueva', async () => {
  const reunion = await crearReunion();
  await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/iniciar`);
  const retiro = await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/participantes/${usuarios.get('expulsado')!.identificador}/retirar`);
  assert.equal(retiro.statusCode, 200, retiro.body);
  assert.deepEqual(retiro.json(), { accesoRevocado: true });
  const fila = (await pool.query('select estado, "retiradoEn" from "participantesReunion" where "reunionIdentificador"=$1 and "usuarioIdentificador"=$2', [reunion.identificador, usuarios.get('expulsado')!.identificador])).rows[0];
  assert.equal(fila.estado, 'retirado');
  assert.ok(fila.retiradoEn instanceof Date);
  assert.equal((await llamar('expulsado', 'POST', `/api/reuniones/${reunion.identificador}/credencial`)).statusCode, 403);
  assert.equal((await llamar('inscrito', 'POST', `/api/reuniones/${reunion.identificador}/participantes/${usuarios.get('segundo')!.identificador}/retirar`)).statusCode, 403);
  const participantes = (await llamar('docente', 'GET', `/api/reuniones/${reunion.identificador}/participantes`)).json() as { identificador: string; estado: string }[];
  assert.equal(participantes.find(persona => String(persona.identificador) === usuarios.get('expulsado')!.identificador)?.estado, 'retirado');
});

test('HU26-12: el webhook exige el secreto propio y valida el cuerpo', async () => {
  const reunion = await crearReunion();
  const cuerpo = { event_name: 'muc-occupant-joined', room_name: reunion.nombreSala, occupant: { id: usuarios.get('inscrito')!.identificador, occupant_jid: 'a@localhost/x', joined_at: Math.floor(Date.now() / 1000) } };
  assert.equal((await evento('occupant/joined', cuerpo, '')).statusCode, 401);
  assert.equal((await evento('occupant/joined', cuerpo, 'secretoEquivocadoDeLaMismaLongitud1234567')).statusCode, 401);
  assert.equal((await evento('occupant/joined', cuerpo, env.jitsiSecreto!)).statusCode, 401);
  assert.equal((await evento('occupant/joined', { ...cuerpo, occupant: { ...cuerpo.occupant, joined_at: 'ayer' } })).statusCode, 422);
  assert.equal((await evento('room/created', { event_name: 'muc-room-created', room_name: reunion.nombreSala })).statusCode, 200);
  // Una reunión que no está iniciada no registra conexiones.
  assert.equal((await evento('occupant/joined', cuerpo)).statusCode, 200);
  assert.equal((await pool.query('select 1 from "conexionesReunion" where "reunionIdentificador"=$1', [reunion.identificador])).rowCount, 0);
  assert.equal((await evento('occupant/joined', { ...cuerpo, room_name: 'salaDesconocida' })).statusCode, 200);
  const anterior = env.jitsiEventosSecreto;
  env.jitsiEventosSecreto = undefined;
  assert.equal((await evento('occupant/joined', cuerpo)).statusCode, 503);
  env.jitsiEventosSecreto = anterior;
});

test('HU26-12/13/14/15: los eventos de Prosody calculan la asistencia virtual al finalizar', async () => {
  const reunion = await crearReunion();
  await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/iniciar`);
  const iniciada = Math.floor(Date.now() / 1000) - 1000;
  await pool.query('update reuniones set "iniciadaEn" = to_timestamp($2) where identificador = $1', [reunion.identificador, iniciada]);
  const [inscrito, segundo, expulsado] = ['inscrito', 'segundo', 'expulsado'].map(nombre => usuarios.get(nombre)!.identificador) as [string, string, string];
  // QR previo del segundo: se conserva aunque no alcance el mínimo virtual.
  await pool.query(`insert into attendances(class_id,user_id,created_by) values ($1,$2,$2)`, [claseIdentificador, segundo]);
  const unirse = (id: string, jid: string, entrada: number) => evento('occupant/joined', { event_name: 'muc-occupant-joined', room_name: reunion.nombreSala, occupant: { id, occupant_jid: jid, joined_at: entrada, name: 'Nombre elegido' } });
  const salir = (id: string, jid: string, entrada: number, salida: number) => evento('occupant/left', { event_name: 'muc-occupant-left', room_name: reunion.nombreSala, occupant: { id, occupant_jid: jid, joined_at: entrada, left_at: salida } });
  // Dos pestañas solapadas del inscrito: 0–500 y 300–800 → 800 s (80 %).
  for (const respuesta of [await unirse(inscrito, 'i1@localhost/a', iniciada), await unirse(inscrito, 'i1@localhost/a', iniciada), await unirse(inscrito, 'i2@localhost/b', iniciada + 300)]) assert.equal(respuesta.statusCode, 200);
  await salir(inscrito, 'i1@localhost/a', iniciada, iniciada + 500);
  await salir(inscrito, 'i2@localhost/b', iniciada + 300, iniciada + 800);
  // El segundo solo 300 s (30 %). El expulsado estuvo conectado hasta el final.
  await unirse(segundo, 's@localhost/a', iniciada); await salir(segundo, 's@localhost/a', iniciada, iniciada + 300);
  await unirse(expulsado, 'e@localhost/a', iniciada);
  await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/participantes/${expulsado}/retirar`);
  // El instructor no recibe asistencia de colegiado.
  await unirse(usuarios.get('docente')!.identificador, 'd@localhost/a', iniciada);
  assert.equal((await pool.query('select 1 from "conexionesReunion" where "reunionIdentificador"=$1', [reunion.identificador])).rowCount, 5, 'el reintento de Prosody no duplica la conexión');

  assert.equal((await llamar('docente', 'GET', `/api/reuniones/${reunion.identificador}/asistencia`)).statusCode, 409, 'sin resultado hasta finalizar');
  const finalizada = await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/finalizar`);
  assert.equal(finalizada.statusCode, 200, finalizada.body);
  assert.ok(finalizada.json().finalizadaEn);
  const abiertas = await pool.query('select 1 from "conexionesReunion" where "reunionIdentificador"=$1 and "salidaEn" is null', [reunion.identificador]);
  assert.equal(abiertas.rowCount, 0, 'finalizar cierra las conexiones abiertas');

  const consulta = await llamar('docente', 'GET', `/api/reuniones/${reunion.identificador}/asistencia`);
  assert.equal(consulta.statusCode, 200, consulta.body);
  const resultado = consulta.json() as { porcentajeMinimo: number; resultados: { usuarioIdentificador: string; nombre: string; porcentaje: number; cuenta: boolean; expulsado: boolean; segundosConectados: number }[] };
  assert.equal(resultado.porcentajeMinimo, 70);
  const de = (id: string) => resultado.resultados.find(fila => String(fila.usuarioIdentificador) === id)!;
  assert.equal(resultado.resultados.length, 3, 'solo inscritos, sin el instructor');
  assert.ok(de(inscrito).porcentaje >= 79 && de(inscrito).porcentaje <= 81, String(de(inscrito).porcentaje));
  assert.equal(de(inscrito).cuenta, true);
  assert.equal(de(segundo).cuenta, false);
  assert.equal(de(expulsado).cuenta, false);
  assert.equal(de(expulsado).expulsado, true);

  const asistencias = (await pool.query('select user_id::text as usuario, origen from attendances where class_id=$1 order by user_id', [claseIdentificador])).rows;
  assert.deepEqual(asistencias.find(fila => fila.usuario === inscrito), { usuario: inscrito, origen: 'VIRTUAL' });
  assert.deepEqual(asistencias.find(fila => fila.usuario === segundo), { usuario: segundo, origen: 'QR' });
  assert.equal(asistencias.some(fila => fila.usuario === expulsado), false);

  // Eventos tardíos y una segunda finalización no cambian el resultado.
  await unirse(inscrito, 'tarde@localhost/a', iniciada + 900);
  assert.equal((await llamar('docente', 'POST', `/api/reuniones/${reunion.identificador}/finalizar`)).statusCode, 200);
  assert.deepEqual((await llamar('docente', 'GET', `/api/reuniones/${reunion.identificador}/asistencia`)).json(), resultado);
  assert.equal((await llamar('inscrito', 'GET', `/api/reuniones/${reunion.identificador}/asistencia`)).statusCode, 403);
});
