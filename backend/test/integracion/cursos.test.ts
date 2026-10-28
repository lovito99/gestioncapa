import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/shared/database.js';
import { redis } from '../../src/shared/redis.js';
import { migrar } from '../../src/shared/migraciones.js';
let app: FastifyInstance;
const organizacion = String(Date.now());
const otraOrganizacion = String(Number(organizacion) + 1);
const usuarios = new Map<string, { id: string; token: string }>();
const llamar = (usuario: string | null, method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url,
  headers: usuario ? { authorization: `Bearer ${usuarios.get(usuario)!.token}` } : {}, ...(payload ? { payload } : {}) });
const datos = (cambios: object = {}) => ({ titulo: 'Curso HU-13', descripcion: 'Curso para colegiados', instructorId: usuarios.get('docente')!.id,
  horasLectivas: 24, modalidad: 'VIRTUAL', costo: 150.50, cupos: 30, tipoCertificado: 'APROBACION', modulos: [{ titulo: 'Introducción' }, { titulo: 'Práctica' }], ...cambios });
async function crear(cambios: object = {}) {
  const respuesta = await llamar('admin', 'POST', '/api/cursos', datos(cambios));
  assert.equal(respuesta.statusCode, 201, respuesta.body); return respuesta.json();
}
before(async () => {
  await migrar(pool); app = await buildApp();
  await pool.query('insert into organizations(id,name) values($1,$3),($2,$3)', [organizacion, otraOrganizacion, 'Prueba HU-13']);
  for (const [nombre, rol, org] of [['admin', 'admin', organizacion], ['docente', 'instructor', organizacion], ['otroDocente', 'instructor', organizacion],
    ['colegiado', 'participante', organizacion], ['coordinador', 'coordinador', organizacion], ['adminAjeno', 'admin', otraOrganizacion], ['docenteAjeno', 'instructor', otraOrganizacion]]) {
    const persona = (await pool.query<{ id: string }>(`insert into users(name,email,password_hash,role,organization_id) values($1,$2,'sin-clave-de-acceso',$3,$4) returning id::text`, [nombre, `hu13-${organizacion}-${nombre}@prueba.local`, rol, org])).rows[0]!;
    usuarios.set(nombre!, { id: persona.id, token: app.jwt.sign({ sub: persona.id }) });
  }
});
after(async () => {
  await pool.query('delete from cursos where organization_id in ($1,$2)', [organizacion, otraOrganizacion]);
  await pool.query('delete from users where organization_id in ($1,$2)', [organizacion, otraOrganizacion]);
  await pool.query('delete from organizations where id in ($1,$2)', [organizacion, otraOrganizacion]);
  await app?.close(); await pool.end(); redis.disconnect();
});
test('HU-13: crea en borrador, conserva orden y usa nota 14 al omitirla', async () => {
  const curso = await crear({ modulos: [{ titulo: 'Segundo en nombre' }, { titulo: 'Primero en nombre' }] });
  assert.equal(curso.estado, 'BORRADOR'); assert.equal(curso.notaMinima, 14);
  assert.deepEqual(curso.modulos.map((m: { titulo: string; orden: number }) => [m.titulo, m.orden]), [['Segundo en nombre', 1], ['Primero en nombre', 2]]);
  assert.equal(curso.horasLectivas, 24); assert.equal(curso.costo, 150.5);
  assert.equal((await pool.query('select estado from cursos where id=$1', [curso.id])).rows[0].estado, 'BORRADOR');
});
test('HU-13: borrador oculto y publicación idempotente en catálogo', async () => {
  const curso = await crear();
  assert.ok(!(await llamar('colegiado', 'GET', '/api/catalogo/cursos')).json().some((c: { id: string }) => c.id === curso.id));
  assert.equal((await llamar('colegiado', 'GET', `/api/cursos/${curso.id}`)).statusCode, 403);
  assert.equal((await llamar('docente', 'POST', `/api/cursos/${curso.id}/publicar`)).statusCode, 403);
  for (let i = 0; i < 2; i++) assert.equal((await llamar('admin', 'POST', `/api/cursos/${curso.id}/publicar`)).json().estado, 'PUBLICADO');
  assert.equal((await llamar('colegiado', 'GET', '/api/catalogo/cursos')).json().filter((c: { id: string }) => c.id === curso.id).length, 1);
  assert.equal((await llamar('colegiado', 'GET', `/api/cursos/${curso.id}`)).statusCode, 200);
  assert.ok(!(await llamar('adminAjeno', 'GET', '/api/catalogo/cursos')).json().some((c: { id: string }) => c.id === curso.id));
});
test('HU-13: valida horas, certificado obligatorio, nota, cupos, costo y módulos sin persistir', async () => {
  const antes = (await pool.query('select count(*) from cursos where organization_id=$1', [organizacion])).rows[0].count;
  for (const cambio of [{ horasLectivas: undefined }, { horasLectivas: 0 }, { horasLectivas: -1 }, { horasLectivas: '24' },
    { tipoCertificado: undefined }, { tipoCertificado: 'OTRO' }, { notaMinima: 21 }, { notaMinima: null }, { cupos: 0 }, { cupos: 1.5 },
    { costo: -1 }, { costo: 1.234 }, { modulos: [] }, { modulos: [{ titulo: ' ' }] }, { estado: 'PUBLICADO' }]) {
    const respuesta = await llamar('admin', 'POST', '/api/cursos', datos(cambio)); assert.equal(respuesta.statusCode, 422, respuesta.body);
  }
  assert.equal((await pool.query('select count(*) from cursos where organization_id=$1', [organizacion])).rows[0].count, antes);
  assert.equal((await crear({ notaMinima: 0, horasLectivas: 0.5, tipoCertificado: 'PARTICIPACION', costo: 0 })).notaMinima, 0);
});
test('HU-13: solo admin crea y el instructor debe ser activo de la misma organización', async () => {
  assert.equal((await llamar(null, 'POST', '/api/cursos', datos())).statusCode, 401);
  for (const rol of ['docente', 'colegiado', 'coordinador']) assert.equal((await llamar(rol, 'POST', '/api/cursos', datos())).statusCode, 403);
  for (const nombre of ['colegiado', 'admin', 'docenteAjeno']) assert.equal((await llamar('admin', 'POST', '/api/cursos', datos({ instructorId: usuarios.get(nombre)!.id }))).statusCode, 422);
  await pool.query('update users set active=false where id=$1', [usuarios.get('otroDocente')!.id]);
  try { assert.equal((await llamar('admin', 'POST', '/api/cursos', datos({ instructorId: usuarios.get('otroDocente')!.id }))).statusCode, 422); }
  finally { await pool.query('update users set active=true where id=$1', [usuarios.get('otroDocente')!.id]); }
});
test('HU-13: instructor asignado guarda PDF, enlace y video; otros reciben 403', async () => {
  const curso = await crear(); const ruta = `/api/cursos/${curso.id}/modulos/${curso.modulos[0].id}/materiales`;
  const pdf = Buffer.from('%PDF-1.4\n%%EOF');
  for (const material of [{ titulo: 'Guía', tipo: 'PDF', contenidoBase64: pdf.toString('base64') },
    { titulo: 'Referencia', tipo: 'ENLACE', url: 'https://ejemplo.test/referencia' }, { titulo: 'Video', tipo: 'VIDEO', url: 'https://ejemplo.test/video' }]) {
    for (const nombre of ['otroDocente', 'colegiado', 'admin', 'docenteAjeno']) assert.equal((await llamar(nombre, 'POST', ruta, material)).statusCode, 403);
    const guardado = await llamar('docente', 'POST', ruta, material); assert.equal(guardado.statusCode, 201, guardado.body);
    if (material.tipo === 'PDF') {
      const archivo = await llamar('docente', 'GET', `${ruta}/${guardado.json().id}/archivo`);
      assert.equal(archivo.statusCode, 200); assert.deepEqual(archivo.rawPayload, pdf); assert.match(String(archivo.headers['content-disposition']), /attachment/);
      assert.equal((await llamar('adminAjeno', 'GET', `${ruta}/${guardado.json().id}/archivo`)).statusCode, 403);
    }
  }
  const detalle = (await llamar('docente', 'GET', `/api/cursos/${curso.id}`)).json();
  assert.equal(detalle.modulos[0].materiales.length, 3); assert.equal(detalle.modulos[1].materiales.length, 0);
  assert.ok(!JSON.stringify(detalle).includes('contenidoBase64'));
  for (const nombre of ['adminAjeno', 'docenteAjeno']) assert.equal((await llamar(nombre, 'GET', `/api/cursos/${curso.id}`)).statusCode, 403);
  assert.equal((await llamar('adminAjeno', 'POST', `/api/cursos/${curso.id}/publicar`)).statusCode, 403);
  assert.ok((await llamar('docente', 'GET', '/api/cursos')).json().some((c: { id: string }) => c.id === curso.id));
  assert.ok(!(await llamar('otroDocente', 'GET', '/api/cursos')).json().some((c: { id: string }) => c.id === curso.id));
});
test('HU-13: rechaza módulos ajenos, archivos inválidos y URLs inseguras', async () => {
  const curso = await crear(); const otro = await crear();
  const ruta = `/api/cursos/${curso.id}/modulos/${curso.modulos[0].id}/materiales`;
  const valido = { titulo: 'Referencia', tipo: 'ENLACE', url: 'https://ejemplo.test' };
  assert.equal((await llamar('docente', 'POST', `/api/cursos/${curso.id}/modulos/${otro.modulos[0].id}/materiales`, valido)).statusCode, 404);
  for (const material of [{ ...valido, url: 'javascript:alert(1)' }, { ...valido, url: 'http://ejemplo.test' }, { ...valido, url: 'https://usuario:clave@ejemplo.test' },
    { titulo: 'No PDF', tipo: 'PDF', contenidoBase64: Buffer.from('<script>hola</script>').toString('base64') },
    { titulo: 'No base64', tipo: 'PDF', contenidoBase64: '%%%invalid' },
    { titulo: 'Grande', tipo: 'PDF', contenidoBase64: Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5242880)]).toString('base64') }]) {
    const respuesta = await llamar('docente', 'POST', ruta, material); assert.equal(respuesta.statusCode, 422, respuesta.body);
  }
  assert.equal((await pool.query('select count(*) from materiales_curso where modulo_id=$1', [curso.modulos[0].id])).rows[0].count, '0');
});
