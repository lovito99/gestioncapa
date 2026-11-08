import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/shared/database.js';
import { redis } from '../../src/shared/redis.js';
import { migrar } from '../../src/shared/migraciones.js';

let app: FastifyInstance;
const org = String(Date.now());
const ajena = String(Number(org) + 1);
const usuarios = new Map<string, { id: string; token: string }>();
const llamar = (usuario: string | null, method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url,
  headers: usuario ? { authorization: `Bearer ${usuarios.get(usuario)!.token}` } : {}, ...(payload ? { payload } : {}) });
async function curso(modalidad = 'PRESENCIAL') {
  const respuesta = await llamar('admin', 'POST', '/api/cursos', { titulo: 'Sesiones HU-13', instructorId: usuarios.get('docente')!.id,
    horasLectivas: 10, modalidad, costo: 0, cupos: 20, tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Práctica' }] });
  assert.equal(respuesta.statusCode, 201, respuesta.body);
  return respuesta.json();
}
const sesion = (cambios = {}) => ({ nombre: 'Práctica presencial', fecha: '2033-06-10', horaInicio: '10:00', horaFin: '11:00', lugar: 'Auditorio CPPP', ...cambios });
before(async () => {
  await migrar(pool); app = await buildApp();

  for (const [nombre, rol, organizacion] of [['admin', 'admin', org], ['docente', 'instructor', org], ['otroDocente', 'instructor', org],
    ['colegiado', 'agremiado', org], ['adminMigrado', 'admin', org], ['adminAjeno', 'admin', ajena], ['colegiadoAjeno', 'agremiado', ajena]]) {
    const persona = (await pool.query<{ id: string }>("insert into users(name,email,password_hash,role) values($1,$2,'sin-acceso',$3) returning id::text",
      [nombre, `sesiones-${org}-${nombre!.toLowerCase()}@prueba.local`, rol])).rows[0]!;
    usuarios.set(nombre!, { id: persona.id, token: app.jwt.sign({ sub: persona.id }) });
  }
});
after(async () => {
  await pool.query('delete from classes where instructor_id=any($1::bigint[])', [[...usuarios.values()].map(p => p.id)]);
  await pool.query('delete from cursos where creador_id=any($1::bigint[])', [[...usuarios.values()].map(p => p.id)]);
  await pool.query('delete from users where id=any($1::bigint[])', [[...usuarios.values()].map(p => p.id)]);

  await app?.close(); await pool.end(); redis.disconnect();
});
test('HU-13: admin programa sesiones asociadas al curso y se consultan en orden', async () => {
  const c = await curso();
  for (const fecha of ['2033-06-12', '2033-06-11']) {
    const respuesta = await llamar('admin', 'POST', `/api/cursos/${c.id}/sesiones`, sesion({ fecha }));
    assert.equal(respuesta.statusCode, 201, respuesta.body);
    assert.equal(respuesta.json().cursoId, c.id);
    assert.equal(respuesta.json().instructor.id, usuarios.get('docente')!.id);
    const fila = (await pool.query('select curso_id::text from classes where id=$1', [respuesta.json().id])).rows[0];
    assert.equal(fila.curso_id, c.id);
  }
  const detalle = (await llamar('docente', 'GET', `/api/cursos/${c.id}`)).json();
  assert.deepEqual(detalle.sesiones.map((s: { fecha: string }) => s.fecha), ['2033-06-11', '2033-06-12']);
  assert.equal(detalle.sesiones[0].lugar, 'Auditorio CPPP');
  assert.equal(detalle.sesiones[0].horaInicio, '10:00');
  assert.equal(detalle.sesiones[0].horaFin, '11:00');
});
test('HU-13: permisos, modalidad, fechas y horarios se validan sin guardar sesiones', async () => {
  const c = await curso(); const ruta = `/api/cursos/${c.id}/sesiones`;
  assert.equal((await llamar(null, 'POST', ruta, sesion())).statusCode, 401);
  for (const usuario of ['docente', 'otroDocente', 'colegiado']) {
    assert.equal((await llamar(usuario, 'POST', ruta, sesion())).statusCode, 403);
  }
  for (const cambio of [{ fecha: '2033-02-30' }, { fecha: '' }, { horaInicio: '25:00' }, { horaFin: '09:00' }, { horaFin: '10:00' }, { lugar: ' ' }, { nombre: '' }]) {
    assert.equal((await llamar('admin', 'POST', ruta, sesion(cambio))).statusCode, 422);
  }
  const virtual = await curso('VIRTUAL');
  assert.equal((await llamar('admin', 'POST', `/api/cursos/${virtual.id}/sesiones`, sesion())).statusCode, 409);
  assert.equal((await llamar('admin', 'POST', '/api/cursos/abc/sesiones', sesion())).statusCode, 404);
  assert.equal((await pool.query('select count(*) from classes where curso_id=$1', [c.id])).rows[0].count, '0');
});
test('HU-13: dos cursos no pueden programar simultáneamente al mismo instructor', async () => {
  const a = await curso(); const b = await curso('HIBRIDA');
  const respuestas = await Promise.all([a, b].map(c => llamar('admin', 'POST', `/api/cursos/${c.id}/sesiones`, sesion({ fecha: '2033-06-13' }))));
  assert.deepEqual(respuestas.map(r => r.statusCode).sort(), [201, 409]);
  const contigua = await llamar('admin', 'POST', `/api/cursos/${a.id}/sesiones`, sesion({ fecha: '2033-06-13', horaInicio: '11:00', horaFin: '12:00' }));
  assert.equal(contigua.statusCode, 201, contigua.body);
});
test('HU-13/HU-20: QR alimenta el 80 %, excluye otros cursos y sesiones canceladas', async () => {
  const c = await curso(); const ruta = `/api/cursos/${c.id}`;
  assert.equal((await llamar('admin', 'POST', `${ruta}/publicar`)).statusCode, 200);
  const vacia = await llamar('colegiado', 'GET', `${ruta}/mi-asistencia`);
  assert.equal(vacia.statusCode, 200, vacia.body);
  assert.deepEqual(vacia.json(), { totalSesiones: 0, presentes: 0, porcentaje: 0, requisitoAsistencia: 80, cumpleAsistencia: false });
  const sesiones: string[] = [];
  for (let i = 0; i < 5; i++) {
    const nueva = await llamar('admin', 'POST', `${ruta}/sesiones`, sesion({ fecha: `2033-07-${10 + i}` }));
    assert.equal(nueva.statusCode, 201, nueva.body); sesiones.push(nueva.json().id);
    await pool.query("insert into enrollments(class_id,user_id) values($1,$2)", [nueva.json().id, usuarios.get('colegiado')!.id]);
    if (i < 4) {
      const qr = await llamar('docente', 'GET', `/api/clases/${nueva.json().id}/qr`);
      const marcada = await llamar('colegiado', 'POST', '/api/asistencia/marcar', { token: qr.json().token });
      assert.equal(marcada.statusCode, 201, marcada.body);
    }
  }
  assert.deepEqual((await llamar('colegiado', 'GET', `${ruta}/mi-asistencia`)).json(),
    { totalSesiones: 5, presentes: 4, porcentaje: 80, requisitoAsistencia: 80, cumpleAsistencia: true });
  await pool.query("update classes set estado='CANCELADA' where id=$1", [sesiones[0]]);
  assert.deepEqual((await llamar('colegiado', 'GET', `${ruta}/mi-asistencia`)).json(),
    { totalSesiones: 4, presentes: 3, porcentaje: 75, requisitoAsistencia: 80, cumpleAsistencia: false });
  const otro = await curso();
  assert.equal((await llamar('admin', 'POST', `/api/cursos/${otro.id}/publicar`)).statusCode, 200);
  assert.equal((await llamar('colegiado', 'GET', `/api/cursos/${otro.id}/mi-asistencia`)).json().totalSesiones, 0);
  assert.equal((await llamar('colegiadoAjeno', 'GET', `${ruta}/mi-asistencia`)).statusCode, 200);
  assert.equal((await llamar('docente', 'GET', `${ruta}/mi-asistencia`)).statusCode, 403);
  const borrador = await curso();
  assert.equal((await llamar('colegiado', 'GET', `/api/cursos/${borrador.id}/mi-asistencia`)).statusCode, 403);
});

test('HU-13: las rutas de clases tampoco permiten acceso a sesiones de otro instructor', async () => {
  const c = await curso();
  const creada = await llamar('admin', 'POST', `/api/cursos/${c.id}/sesiones`, sesion({ fecha: '2033-08-10' }));
  assert.equal(creada.statusCode, 201, creada.body);
  const id = creada.json().id;
  for (const sufijo of ['', '/inscritos', '/asistencia', '/qr']) {
    assert.equal((await llamar('otroDocente', 'GET', `/api/clases/${id}${sufijo}`)).statusCode, 403);
    assert.equal((await llamar('otroDocente', 'GET', `/api/clases/0${id}${sufijo}`)).statusCode, 403);
  }
  assert.equal((await llamar('otroDocente', 'POST', `/api/clases/${id}/cancelar`)).statusCode, 403);
  assert.equal((await app.inject({ method: 'HEAD', url: `/api/clases/${id}`, headers: { authorization: `Bearer ${usuarios.get('otroDocente')!.token}` } })).statusCode, 403);
  assert.equal((await llamar('otroDocente', 'GET', '/api/clases')).statusCode,403);
  const editar = (usuario: string, instructor: string) => app.inject({ method: 'PUT', url: `/api/clases/${id}`,
    headers: { authorization: `Bearer ${usuarios.get(usuario)!.token}` }, payload: { ...sesion({ fecha: '2033-08-10' }), instructorId: usuarios.get(instructor)!.id } });
  assert.equal((await editar('otroDocente', 'docente')).statusCode, 403);
  assert.equal((await editar('admin', 'otroDocente')).statusCode, 422);
  assert.equal((await editar('admin', 'docente')).statusCode, 200);

  const inscripcion = await llamar('admin', 'POST', `/api/clases/${id}/inscritos`, { email: `sesiones-${org}-colegiado@prueba.local` });
  assert.equal(inscripcion.statusCode, 201, inscripcion.body);
  assert.equal((await pool.query('select user_id::text from enrollments where class_id=$1', [id])).rows[0].user_id, usuarios.get('colegiado')!.id);
});
