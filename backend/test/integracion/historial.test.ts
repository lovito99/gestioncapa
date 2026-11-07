import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/shared/database.js';
import { redis } from '../../src/shared/redis.js';
import { migrar } from '../../src/shared/migraciones.js';
import { crearPdfTexto } from '../../src/shared/pdf.js';
let app: FastifyInstance;
const org = String(Date.now()); const orgAjena = String(Number(org) + 1);
const usuarios = new Map<string, { id: string; token: string }>();
let certificadoId: string;
const pedir = (persona: string | null, ruta: string) => app.inject({ method: 'GET', url: ruta, headers: persona ? { authorization: `Bearer ${usuarios.get(persona)!.token}` } : {} });
const ruta = (persona = 'maria') => `/api/colegiados/${usuarios.get(persona)!.id}/historial`;
const descargar = (persona = 'maria', id = certificadoId) => `/api/colegiados/${usuarios.get(persona)!.id}/certificados/${id}/archivo`;
const extraerTexto = (archivo: Buffer) => [...archivo.toString().matchAll(/<([0-9a-f]*)> Tj/g)].map(m => Buffer.from(m[1]!, 'hex').toString('latin1')).join('\n');
before(async () => {
  await migrar(pool); app = await buildApp();
  await pool.query('insert into organizations(id,name) values($1,$3),($2,$3)', [org, orgAjena, 'Prueba HU-18']);
  for (const [nombre, rol, organizacion] of [['admin','admin',org],['docente','instructor',org],['coord','coordinador',org],['maria','participante',org],['luz','participante',org],['vacio','participante',org],['adminAjeno','admin',orgAjena],['ajeno','participante',orgAjena]]) {
    const persona = (await pool.query<{ id: string }>(`insert into users(name,email,password_hash,role,organization_id,dni) values($1,$2,'sin-clave',$3,$4,'12345678') returning id::text`, [nombre, `hu18-${org}-${nombre}@prueba.local`, rol, organizacion])).rows[0]!;
    usuarios.set(nombre!, { id: persona.id, token: app.jwt.sign({ sub: persona.id }) });
  }
  const crearCurso = async (nombre: string, estado: string) => {
    const curso = (await pool.query<{ id: string }>(`insert into cursos(organization_id,creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado)
      values($1,$2,$3,$4,24,'VIRTUAL',0,30,'APROBACION') returning id::text`, [org, usuarios.get('admin')!.id, usuarios.get('docente')!.id, nombre])).rows[0]!;
    await pool.query(`insert into inscripciones_curso(curso_id,usuario_id,estado,inscrito_en,terminado_en) values($1,$2,$3,'2000-01-01',case when $3::varchar='TERMINADO' then '2003-01-01'::timestamptz end)`, [curso.id, usuarios.get('maria')!.id, estado]);
    return curso.id;
  };
  const cursoA = await crearCurso('Curso en progreso', 'EN_CURSO');
  const cursoB = await crearCurso('Curso terminado con acentos: capacitación', 'TERMINADO');
  await crearCurso('Curso sin sesiones', 'EN_CURSO');
  const crearSesion = async (curso: string | null, nombre: string, fecha: string, estado: string, presente: boolean) => {
    const sesion = (await pool.query<{ id: string }>(`insert into classes(organization_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar,estado,curso_id)
      values($1,$2,$3,$4,'10:00','11:00','Sala de pruebas',$5,$6) returning id::text`, [org, nombre, usuarios.get('docente')!.id, fecha, estado, curso])).rows[0]!;
    await pool.query('insert into enrollments(organization_id,class_id,user_id) values($1,$2,$3)', [org, sesion.id, usuarios.get('maria')!.id]);
    if (presente) await pool.query(`insert into attendances(organization_id,class_id,user_id,created_by,timestamp_lima) values($1,$2,$3,$3,$4::timestamp)`, [org, sesion.id, usuarios.get('maria')!.id, `${fecha} 10:02:00`]);
  };
  await crearSesion(cursoA, 'Pasada presente', '2001-01-01', 'PROGRAMADA', true);
  await crearSesion(cursoA, 'Pasada ausente', '2001-01-02', 'PROGRAMADA', false);
  await crearSesion(cursoA, 'Futura', '2099-01-01', 'PROGRAMADA', false);
  await crearSesion(cursoA, 'Cancelada', '2001-01-03', 'CANCELADA', false);
  await crearSesion(cursoB, 'Final 1', '2002-01-01', 'PROGRAMADA', true);
  await crearSesion(cursoB, 'Final 2', '2002-01-02', 'PROGRAMADA', true);
  await crearSesion(null, 'Independiente', '2001-02-01', 'PROGRAMADA', true);
  const heredado = await crearCurso('Curso con sesión heredada', 'EN_CURSO');
  await pool.query('delete from inscripciones_curso where curso_id=$1', [heredado]);
  await crearSesion(heredado, 'Sesión inscrita sin inscripción al curso', '2001-02-02', 'PROGRAMADA', true);
  certificadoId = (await pool.query<{ id: string }>(`insert into certificados_curso(curso_id,usuario_id,codigo,tipo,archivo) values($1,$2,$3,'APROBACION',$4) returning id::text`, [cursoB, usuarios.get('maria')!.id, `HU18-${org}`, crearPdfTexto('Certificado de prueba', ['Solo para pruebas'])])).rows[0]!.id;
});
after(async () => {
  await pool.query('delete from classes where organization_id in ($1,$2)', [org, orgAjena]);
  await pool.query('delete from cursos where organization_id in ($1,$2)', [org, orgAjena]);
  await pool.query('delete from users where organization_id in ($1,$2)', [org, orgAjena]);
  await pool.query('delete from organizations where id in ($1,$2)', [org, orgAjena]);
  await app?.close(); await pool.end(); redis.disconnect();
});
test('HU-18: cursos en curso y terminados, sesiones y porcentajes sin futuras ni canceladas', async () => {
  const respuesta = await pedir('maria', ruta()); assert.equal(respuesta.statusCode, 200, respuesta.body);
  const h = respuesta.json(); assert.equal(h.cursos.length, 3);
  const progreso = h.cursos.find((c: { titulo: string }) => c.titulo === 'Curso en progreso');
  assert.equal(progreso.estado, 'EN_CURSO'); assert.deepEqual(progreso.asistencia, { presentes: 1, realizadas: 2, porcentaje: 50 });
  assert.deepEqual(progreso.sesiones.map((s: { estado: string }) => s.estado), ['PRESENTE', 'AUSENTE', 'CANCELADA', 'PENDIENTE']);
  const terminado = h.cursos.find((c: { estado: string }) => c.estado === 'TERMINADO');
  assert.equal(terminado.asistencia.porcentaje, 100); assert.equal(terminado.certificados[0].id, certificadoId);
  assert.equal(h.cursos.find((c: { titulo: string }) => c.titulo === 'Curso sin sesiones').asistencia.porcentaje, null);
  assert.equal(h.sesionesIndependientes.length, 2); assert.deepEqual(h.asistenciaGeneral, { presentes: 5, realizadas: 6, porcentaje: 83.33 });
  assert.equal(h.colegiado.dniEnmascarado, '****5678'); assert.ok(!respuesta.body.includes('12345678'));
  assert.ok(!respuesta.body.includes('password')); assert.ok(!respuesta.body.includes('@prueba.local'));
  assert.equal(respuesta.headers['cache-control'], 'private, no-store');
});
test('HU-18: otro colegiado recibe 403 en JSON, PDF y certificados, incluso por HEAD', async () => {
  for (const url of [ruta(), `${ruta()}/pdf`, descargar()]) {
    assert.equal((await pedir('luz', url)).statusCode, 403);
    assert.equal((await pedir(null, url)).statusCode, 401);
    for (const rol of ['docente','coord','adminAjeno']) assert.equal((await pedir(rol, url)).statusCode, 403);
    assert.equal((await app.inject({ method: 'HEAD', url, headers: { authorization: `Bearer ${usuarios.get('luz')!.token}` } })).statusCode, 403);
  }
});
test('HU-18: administrador propio puede consultar y descargar, otro no; lista mínima', async () => {
  assert.equal((await pedir('admin', ruta())).statusCode, 200);
  assert.equal((await pedir('admin', `${ruta()}/pdf`)).statusCode, 200);
  assert.equal((await pedir('admin', descargar())).statusCode, 200);
  const lista = await pedir('admin', '/api/colegiados'); assert.equal(lista.statusCode, 200);
  assert.ok(lista.json().some((p: { id: string }) => p.id === usuarios.get('maria')!.id));
  assert.ok(!lista.json().some((p: { id: string }) => p.id === usuarios.get('ajeno')!.id));
  assert.ok(!lista.body.includes('12345678')); assert.ok(!lista.body.includes('email'));
  assert.equal((await pedir('maria', '/api/colegiados')).statusCode, 403);
});
test('HU-18: PDF real con nombre, DNI oculto y datos del historial sin campos sensibles', async () => {
  const respuesta = await pedir('maria', `${ruta()}/pdf`); assert.equal(respuesta.statusCode, 200);
  assert.match(String(respuesta.headers['content-type']), /application\/pdf/);
  assert.match(String(respuesta.headers['content-disposition']), /attachment.*historial-capacitacion.pdf/);
  const texto = extraerTexto(respuesta.rawPayload);
  assert.match(texto, /DNI: \*\*\*\*5678/); assert.match(texto, /Colegiado: maria/);
  assert.match(texto, /capacitación/); assert.match(texto, /50%/); assert.match(texto, /HU18-/);
  assert.ok(!texto.includes('12345678')); assert.ok(!texto.includes('@prueba.local')); assert.ok(!texto.includes('password'));
  const cert = await pedir('maria', descargar()); assert.equal(cert.statusCode, 200);
  assert.ok(cert.rawPayload.toString().startsWith('%PDF-'));
  assert.equal((await pedir('luz', descargar('luz'))).statusCode, 404);
});
test('HU-18: historial vacío y DNI no registrado se representan sin inventar datos', async () => {
  await pool.query('update users set dni=null where id=$1', [usuarios.get('vacio')!.id]);
  const h = (await pedir('vacio', ruta('vacio'))).json();
  assert.equal(h.colegiado.dniEnmascarado, null); assert.deepEqual(h.cursos, []); assert.deepEqual(h.sesionesIndependientes, []);
  assert.deepEqual(h.asistenciaGeneral, { presentes: 0, realizadas: 0, porcentaje: null });
  assert.equal((await pedir('admin', '/api/colegiados/no-valido/historial')).statusCode, 404);
});
