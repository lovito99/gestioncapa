import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/shared/database.js';
import { redis } from '../../src/shared/redis.js';
import { migrar } from '../../src/shared/migraciones.js';
import { env } from '../../src/config/env.js';
import { emitirTokenQr, reloj } from '../../src/modules/qr/qr.token.js';
import { validarAlcance, type CursoEmision } from '../../src/modules/certificados/certificados.repositorio.js';

let app: FastifyInstance;
const prefijo = `hu36${Date.now()}`;
const usuarios = new Map<string, { id: string; token: string }>();
const llamar = (usuario: string | null, method: 'GET' | 'POST' | 'PUT', url: string, payload?: object) => app.inject({ method, url,
  headers: usuario ? { authorization: `Bearer ${usuarios.get(usuario)!.token}` } : {}, ...(payload ? { payload } : {}) });
const sesion = (cambios: object = {}) => ({ nombre: 'Sesión HU-36', fecha: '2034-03-10', horaInicio: '10:00', horaFin: '11:00', lugar: 'Auditorio CPPP', ...cambios });
let fechaLibre = 0;
const otraFecha = () => `2034-04-${String(++fechaLibre).padStart(2, '0')}`;

async function curso(modalidad = 'PRESENCIAL', publicar = false) {
  const respuesta = await llamar('admin', 'POST', '/api/cursos', { titulo: `${prefijo} ${modalidad}`, instructorId: usuarios.get('docente')!.id,
    horasLectivas: 10, modalidad, costo: 0, cupos: 20, tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Práctica' }] });
  assert.equal(respuesta.statusCode, 201, respuesta.body);
  const id = respuesta.json().id as string;
  if (publicar) assert.equal((await llamar('admin', 'POST', `/api/cursos/${id}/publicar`)).statusCode, 200);
  return id;
}
const programar = (cursoId: string, cambios: object) => llamar('admin', 'POST', `/api/cursos/${cursoId}/sesiones`, sesion({ fecha: otraFecha(), ...cambios }));
const modalidadDe = async (cursoId: string) => (await pool.query('select modalidad from cursos where id=$1', [cursoId])).rows[0].modalidad;
const reunionesDe = async (claseId: string) => (await pool.query<{ estado: string; inicio: string; fin: string }>(`select estado,
  to_char("inicioProgramado" at time zone 'America/Lima','YYYY-MM-DD HH24:MI') as inicio, to_char("finProgramado" at time zone 'America/Lima','HH24:MI') as fin
  from reuniones where "claseIdentificador"=$1 order by "fechaCreacion"`, [claseId])).rows;

before(async () => {
  await migrar(pool); app = await buildApp();
  for (const [nombre, rol] of [['admin', 'admin'], ['docente', 'instructor'], ['colegiado', 'agremiado'], ['ajeno', 'agremiado']] as const) {
    const persona = (await pool.query<{ id: string }>("insert into users(name,email,password_hash,role) values($1,$2,'sin-acceso',$3) returning id::text",
      [nombre, `${prefijo}-${nombre}@prueba.local`, rol])).rows[0]!;
    usuarios.set(nombre, { id: persona.id, token: app.jwt.sign({ sub: persona.id }) });
  }
});
after(async () => {
  const ids = [...usuarios.values()].map(persona => persona.id);
  const reuniones = (await pool.query(`select r.identificador from reuniones r join classes s on s.id=r."claseIdentificador" where s.instructor_id=any($1::bigint[])`, [ids])).rows.map(fila => fila.identificador);
  for (const tabla of ['"notificacionesReunion"', '"participantesReunion"']) await pool.query(`delete from ${tabla} where "reunionIdentificador"=any($1::uuid[])`, [reuniones]);
  await pool.query('delete from reuniones where identificador=any($1::uuid[])', [reuniones]);
  await pool.query('delete from attendances where user_id=any($1::bigint[])', [ids]);
  await pool.query('delete from classes where instructor_id=any($1::bigint[])', [ids]);
  await pool.query('delete from inscripciones_curso where usuario_id=any($1::bigint[])', [ids]);
  await pool.query('delete from cursos where creador_id=any($1::bigint[])', [ids]);
  await pool.query('delete from users where id=any($1::bigint[])', [ids]);
  await app?.close(); await pool.end(); redis.disconnect();
});

test('HU36-01/02/03: cada sesión elige su modalidad y el curso se clasifica por sus sesiones', async () => {
  const id = await curso('PRESENCIAL');
  const virtual = await programar(id, { modalidad: 'VIRTUAL', lugar: '' });
  assert.equal(virtual.statusCode, 201, virtual.body);
  assert.equal(virtual.json().modalidad, 'VIRTUAL');
  assert.equal(virtual.json().lugar, 'Aula virtual');
  assert.equal(await modalidadDe(id), 'VIRTUAL');
  for (let dia = 0; dia < 3; dia++) assert.equal((await programar(id, { modalidad: 'VIRTUAL' })).statusCode, 201);
  assert.equal((await programar(id, { modalidad: 'PRESENCIAL' })).statusCode, 201);
  assert.equal(await modalidadDe(id, ), 'HIBRIDA', 'cuatro virtuales y una presencial');
  assert.equal((await programar(id, { modalidad: 'HIBRIDA' })).statusCode, 422);
  for (const modalidad of ['PRESENCIAL', 'AMBAS']) {
    const sinLugar = await programar(id, { modalidad, lugar: ' ' });
    assert.equal(sinLugar.statusCode, 422);
    assert.ok(sinLugar.json().fields.lugar);
  }
  const detalle = (await llamar('admin', 'GET', `/api/cursos/${id}`)).json();
  assert.equal(detalle.modalidad, 'HIBRIDA');
  assert.deepEqual(detalle.sesiones.map((s: { modalidad: string }) => s.modalidad), ['VIRTUAL', 'VIRTUAL', 'VIRTUAL', 'VIRTUAL', 'PRESENCIAL']);
});

test('HU36-03/07: editar y cancelar recalculan el curso y sincronizan la sala de la sesión', async () => {
  const id = await curso('PRESENCIAL');
  const creada = (await programar(id, { modalidad: 'VIRTUAL', horaInicio: '15:00', horaFin: '16:30' })).json();
  assert.deepEqual(await reunionesDe(creada.id), [{ estado: 'programada', inicio: `${creada.fecha} 15:00`, fin: '16:30' }], 'la sesión virtual crea su sala con el mismo horario');
  const ruta = `/api/clases/${creada.id}`;
  const base = { nombre: creada.nombre, instructorId: usuarios.get('docente')!.id, fecha: creada.fecha, horaInicio: '15:00', horaFin: '17:00' };
  const reprogramada = await llamar('admin', 'PUT', ruta, base);
  assert.equal(reprogramada.statusCode, 200, reprogramada.body);
  assert.equal(reprogramada.json().modalidad, 'VIRTUAL', 'sin modalidad conserva la actual');
  assert.deepEqual(await reunionesDe(creada.id), [{ estado: 'programada', inicio: `${creada.fecha} 15:00`, fin: '17:00' }], 'la sala sigue el nuevo horario sin duplicarse');
  const presencial = await llamar('admin', 'PUT', ruta, { ...base, modalidad: 'PRESENCIAL', lugar: 'Aula 3' });
  assert.equal(presencial.statusCode, 200, presencial.body);
  assert.equal(await modalidadDe(id), 'PRESENCIAL');
  assert.deepEqual((await reunionesDe(creada.id)).map(r => r.estado), ['cancelada'], 'al pasar a presencial se cancela la sala programada');
  assert.equal((await llamar('admin', 'PUT', ruta, { ...base, modalidad: 'AMBAS', lugar: 'Aula 3' })).statusCode, 200);
  assert.deepEqual((await reunionesDe(creada.id)).map(r => r.estado), ['cancelada', 'programada']);
  assert.equal(await modalidadDe(id), 'HIBRIDA');
  assert.equal((await llamar('admin', 'POST', `${ruta}/cancelar`)).statusCode, 200);
  assert.deepEqual((await reunionesDe(creada.id)).map(r => r.estado), ['cancelada', 'cancelada']);
  assert.equal(await modalidadDe(id), 'PRESENCIAL', 'sin sesiones programadas vuelve a la planificada');
});

test('HU36-07: una sala iniciada no se cancela al cambiar la sesión', async () => {
  const id = await curso('PRESENCIAL');
  const creada = (await programar(id, { modalidad: 'AMBAS' })).json();
  await pool.query(`update reuniones set estado='iniciada' where "claseIdentificador"=$1`, [creada.id]);
  const base = { nombre: creada.nombre, instructorId: usuarios.get('docente')!.id, fecha: creada.fecha, horaInicio: '10:00', horaFin: '11:00' };
  assert.equal((await llamar('admin', 'PUT', `/api/clases/${creada.id}`, { ...base, modalidad: 'PRESENCIAL', lugar: 'Aula 1' })).statusCode, 200);
  assert.deepEqual((await reunionesDe(creada.id)).map(r => r.estado), ['iniciada']);
});

test('HU36-09: no se crea una sala virtual para una sesión presencial', async () => {
  const id = await curso('PRESENCIAL');
  const presencial = (await programar(id, { modalidad: 'PRESENCIAL' })).json();
  const reunion = await llamar('admin', 'POST', '/api/reuniones', { claseIdentificador: presencial.id, titulo: 'Sala no válida', inicioProgramado: '2034-03-10T10:00:00-05:00', finProgramado: '2034-03-10T11:00:00-05:00' });
  assert.equal(reunion.statusCode, 409);
  assert.equal(reunion.json().code, 'SESION_PRESENCIAL');
});

test('HU36-05/08: el detalle muestra la sala solo a quien tiene acceso al curso', async () => {
  const id = await curso('VIRTUAL', true);
  assert.equal((await llamar('colegiado', 'POST', `/api/cursos/${id}/inscribirme`)).statusCode, 201);
  await programar(id, { modalidad: 'VIRTUAL' });
  await programar(id, { modalidad: 'PRESENCIAL', lugar: 'Aula magna' });
  const visto = (await llamar('colegiado', 'GET', `/api/cursos/${id}`)).json();
  const [virtual, presencial] = visto.sesiones;
  assert.equal(virtual.modalidad, 'VIRTUAL');
  assert.match(virtual.reunion.identificador, /^[0-9a-f-]{36}$/);
  assert.equal(virtual.reunion.estado, 'programada');
  assert.equal(presencial.reunion, null);
  assert.equal(presencial.lugar, 'Aula magna');
  const ajeno = (await llamar('ajeno', 'GET', `/api/cursos/${id}`)).json();
  assert.equal(ajeno.sesiones[0].reunion, null, 'quien no está inscrito no recibe el acceso');
  assert.ok((await llamar('docente', 'GET', `/api/cursos/${id}`)).json().sesiones[0].reunion);
});

test('HU36-10/11: el QR solo se toma donde hay aula; en «ambas» vale cualquier vía', async () => {
  const id = await curso('PRESENCIAL', true);
  assert.equal((await llamar('colegiado', 'POST', `/api/cursos/${id}/inscribirme`)).statusCode, 201);
  const virtual = (await programar(id, { modalidad: 'VIRTUAL', fecha: '2034-05-20' })).json();
  const ambas = (await programar(id, { modalidad: 'AMBAS', fecha: '2034-05-21' })).json();
  const qrVirtual = await llamar('docente', 'GET', `/api/clases/${virtual.id}/qr`);
  assert.equal(qrVirtual.statusCode, 409);
  assert.equal(qrVirtual.json().code, 'SESION_VIRTUAL');
  const ahoraOriginal = reloj.ahora;
  try {
    reloj.ahora = () => Date.UTC(2034, 4, 20, 15, 30);
    const marcarVirtual = await llamar('colegiado', 'POST', '/api/asistencia/marcar', { token: emitirTokenQr(virtual.id, reloj.ahora(), env.QR_SECRET).token });
    assert.equal(marcarVirtual.statusCode, 409);
    assert.equal(marcarVirtual.json().code, 'SESION_VIRTUAL');
    reloj.ahora = () => Date.UTC(2034, 4, 21, 15, 30);
    assert.equal((await llamar('docente', 'GET', `/api/clases/${ambas.id}/qr`)).statusCode, 200);
    const marcarAmbas = await llamar('colegiado', 'POST', '/api/asistencia/marcar', { token: emitirTokenQr(ambas.id, reloj.ahora(), env.QR_SECRET).token });
    assert.equal(marcarAmbas.statusCode, 201, marcarAmbas.body);
  } finally { reloj.ahora = ahoraOriginal; }
  assert.ok((await reunionesDe(ambas.id)).length === 1, 'la sesión «ambas» también tiene sala virtual');
});

test('HU36-13/14: un curso grabado no admite sesiones con fecha y se filtra como grabado', async () => {
  const id = await curso('GRABADO', true);
  const intento = await programar(id, { modalidad: 'VIRTUAL' });
  assert.equal(intento.statusCode, 409);
  assert.equal(intento.json().code, 'CURSO_GRABADO');
  assert.equal(await modalidadDe(id), 'GRABADO');
  const catalogo = await llamar('colegiado', 'GET', `/api/catalogo/cursos/pagina?modalidad=GRABADO&buscar=${encodeURIComponent(prefijo)}`);
  assert.equal(catalogo.statusCode, 200, catalogo.body);
  assert.deepEqual(catalogo.json().items.map((item: { id: string }) => item.id), [id]);
});

test('HU36-12/15: constancias en cursos presenciales, virtuales e híbridos; el grabado espera a HU-37', () => {
  const base: CursoEmision = { id: '1', estado: 'PUBLICADO', titulo: 'Curso', modalidad: 'PRESENCIAL', costo: 0, modalidadCobro: 'GRATUITO', tipoCertificado: 'PARTICIPACION', horasLectivas: 8, instructorNombre: 'Docente' };
  for (const modalidad of ['PRESENCIAL', 'VIRTUAL', 'HIBRIDA']) assert.doesNotThrow(() => validarAlcance({ ...base, modalidad }), modalidad);
  assert.throws(() => validarAlcance({ ...base, modalidad: 'GRABADO' }), (error: { codigo?: string; code?: string }) => (error.codigo ?? error.code) === 'CURSO_GRABADO');
});
