import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/shared/database.js';
import { redis } from '../../src/shared/redis.js';
import { migrar } from '../../src/shared/migraciones.js';
let app: FastifyInstance;
const org = String(Date.now()); const otra = String(Number(org)+1);
const personas = new Map<string, { id: string; token: string }>();
let borrador: string;
const pedir = (persona: string | null, method: 'GET' | 'POST', url: string, payload?: object) => app.inject({ method, url, headers: persona ? { authorization: `Bearer ${personas.get(persona)!.token}` } : {}, ...(payload ? { payload } : {}) });
async function crear(datos: object = {}, publicar = true, admin = 'admin', docente = 'docente') {
  const r = await pedir(admin,'POST','/api/cursos',{ titulo: 'Curso para inscripción', instructorId: personas.get(docente)!.id, descripcion: 'Descripción del curso', horasLectivas: 16, modalidad: 'VIRTUAL', costo: 25, cupos: 5, tipoCertificado: 'PARTICIPACION', categoria: 'Educación', fechaInicio: '2030-01-01', fechaFin: '2030-01-31', modulos: [{ titulo: 'Introducción' }], ...datos });
  assert.equal(r.statusCode,201,r.body);
  const curso = r.json(); if (publicar) assert.equal((await pedir(admin,'POST',`/api/cursos/${curso.id}/publicar`)).statusCode,200);
  return curso;
}
const catalogo = (consulta = '', persona = 'a') => pedir(persona,'GET',`/api/catalogo/cursos/pagina${consulta ? '?'+consulta : ''}`);
before(async () => {
  await migrar(pool); app = await buildApp();
  await pool.query('insert into organizations(id,name) values($1,$3),($2,$3)', [org,otra,'Prueba HU-14']);
  for (const [nombre,rol,organizacion] of [['admin','admin',org],['docente','instructor',org],['a','participante',org],['b','participante',org],['c','participante',org],['adminAjeno','admin',otra],['docenteAjeno','instructor',otra],['ajeno','participante',otra]]) {
    const id = (await pool.query<{ id: string }>(`insert into users(name,email,password_hash,role,organization_id) values($1,$2,'sin-clave',$3,$4) returning id::text`, [nombre,`hu14-${org}-${nombre}@prueba.local`,rol,organizacion])).rows[0]!.id;
    personas.set(nombre!,{ id,token: app.jwt.sign({ sub: id }) });
  }
  for (let i=0;i<8;i++) await crear({ titulo: `HU14 · Capacitación ${i}`, modalidad: i%2 ? 'PRESENCIAL' : 'VIRTUAL', categoria: i%2 ? 'Educación' : 'Tecnología' });
  borrador = (await crear({ titulo: 'HU14 · Capacitación borrador',categoria: 'Solo borrador' },false)).id;
  await crear({ titulo: 'HU14 · Curso ajeno',categoria: 'Solo otra organización' },true,'adminAjeno','docenteAjeno');
});
after(async () => {
  await pool.query('delete from classes where organization_id in($1,$2)',[org,otra]);
  await pool.query('delete from cursos where organization_id in($1,$2)',[org,otra]);
  await pool.query('delete from users where organization_id in($1,$2)',[org,otra]);
  await pool.query('delete from organizations where id in($1,$2)',[org,otra]);
  await app?.close(); await pool.end(); redis.disconnect();
});
test('HU-14: búsqueda por nombre sin distinguir tildes y páginas ordenadas sin duplicados', async () => {
  const paginas = [];
  for (let pagina=1;pagina<=3;pagina++) {
    const respuesta = await catalogo(`buscar=CAPACITACION&tamanoPagina=3&pagina=${pagina}`);
    assert.equal(respuesta.statusCode,200,respuesta.body);
    const datos = respuesta.json(); assert.equal(datos.total,8); assert.equal(datos.totalPaginas,3); assert.equal(datos.pagina,pagina);
    assert.equal(datos.items.length,pagina===3 ? 2 : 3); paginas.push(...datos.items);
    assert.equal(respuesta.headers['cache-control'],'private, no-store');
  }
  assert.equal(new Set(paginas.map(c => c.id)).size,8);
  const primero = paginas[0];
  assert.equal(primero.descripcion,'Descripción del curso'); assert.equal(primero.instructorNombre,'docente');
  assert.equal(primero.fechaInicio,'2030-01-01'); assert.equal(primero.fechaFin,'2030-01-31');
  assert.equal(primero.horasLectivas,16); assert.equal(primero.costo,25); assert.equal(primero.cuposDisponibles,5);
  assert.deepEqual((await catalogo('buscar=hu14&pagina=999')).json().items,[]);
});
test('HU-14: filtros combinados, borradores y aislamiento de organizaciones', async () => {
  const respuesta = await catalogo('buscar=hu14&modalidad=VIRTUAL&categoria=Tecnolog%C3%ADa');
  assert.equal(respuesta.json().total,4);
  assert.ok(respuesta.json().items.every((c: { modalidad: string; categoria: string }) => c.modalidad==='VIRTUAL' && c.categoria==='Tecnología'));
  const todos = (await catalogo()).json(); assert.equal(todos.total,8); assert.ok(!todos.items.some((c: { id: string }) => c.id===borrador));
  assert.deepEqual(todos.categorias,['Educación','Tecnología']);
  assert.equal((await catalogo('','ajeno')).json().total,1);
  assert.equal((await pedir('a','GET',`/api/cursos/${borrador}`)).statusCode,403);
  assert.equal((await pedir(null,'GET','/api/catalogo/cursos/pagina')).statusCode,401);
});
test('HU-14: búsqueda literal y validación de filtros', async () => {
  await crear({ titulo: 'Literal 100%_válido' });
  assert.equal((await catalogo('buscar=100%25_')).json().total,1);
  assert.equal((await catalogo('buscar=%27%20OR%201%3D1')).json().total,0);
  for (const consulta of ['pagina=0','pagina=-1','pagina=1.5','tamanoPagina=51','modalidad=OTRA','categoria=','buscar='+ 'a'.repeat(161)]) assert.equal((await catalogo(consulta)).statusCode,422,consulta);
});
test('HU-14: sin cupos impide inscripción en servidor, repetición idempotente e historial actualizado', async () => {
  const curso = await crear({ titulo: 'Última plaza',cupos: 1 });
  const clase = (await pool.query<{ id: string }>(`insert into classes(organization_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar,curso_id) values($1,'Sesión inscrita',$2,'2030-01-01','08:00','09:00','Virtual',$3) returning id::text`, [org,personas.get('docente')!.id,curso.id])).rows[0]!;
  const ruta = `/api/cursos/${curso.id}/inscribirme`;
  assert.equal((await pedir('a','POST',ruta)).statusCode,201);
  assert.equal((await pedir('a','POST',ruta)).statusCode,200);
  const sinCupo = await pedir('b','POST',ruta); assert.equal(sinCupo.statusCode,409); assert.equal(sinCupo.json().code,'SIN_CUPOS');
  const detalle = (await pedir('b','GET',`/api/cursos/${curso.id}`)).json(); assert.equal(detalle.cuposDisponibles,0); assert.equal(detalle.inscrito,false);
  assert.equal((await pedir('a','GET',`/api/cursos/${curso.id}`)).json().inscrito,true);
  assert.equal((await pool.query('select count(*)::int as total from inscripciones_curso where curso_id=$1',[curso.id])).rows[0].total,1);
  assert.equal((await pool.query('select count(*)::int as total from enrollments where class_id=$1 and user_id=$2',[clase.id,personas.get('a')!.id])).rows[0].total,1);
  const h = (await pedir('a','GET',`/api/colegiados/${personas.get('a')!.id}/historial`)).json(); assert.ok(h.cursos.some((c: { id: string }) => c.id===curso.id));
  await pool.query("update inscripciones_curso set estado='TERMINADO',terminado_en=now() where curso_id=$1 and usuario_id=$2",[curso.id,personas.get('a')!.id]);
  const repetida = await pedir('a','POST',ruta); assert.equal(repetida.statusCode,200); assert.equal(repetida.json().estado,'TERMINADO');
  assert.equal((await pedir('admin','POST',ruta)).statusCode,403);
  assert.equal((await pedir('ajeno','POST',ruta)).statusCode,403);
  assert.equal((await pedir('b','POST',`/api/cursos/${borrador}/inscribirme`)).statusCode,409);
});
test('HU-14: solicitudes concurrentes no sobrepasan la última plaza', async () => {
  const curso = await crear({ titulo: 'Plaza concurrente',cupos: 1 });
  const respuestas = await Promise.all(['a','b','c'].map(p => pedir(p,'POST',`/api/cursos/${curso.id}/inscribirme`)));
  assert.deepEqual(respuestas.map(r => r.statusCode).sort(),[201,409,409]);
  assert.equal((await pool.query('select count(*)::int as total from inscripciones_curso where curso_id=$1',[curso.id])).rows[0].total,1);
});
test('HU-14: metadatos opcionales compatibles y fechas inválidas rechazadas', async () => {
  const curso = await crear({ categoria: undefined,fechaInicio: undefined,fechaFin: undefined });
  assert.equal(curso.categoria,'General'); assert.equal(curso.fechaInicio,null); assert.equal(curso.fechaFin,null);
  for (const fechas of [{ fechaInicio: '0000-01-01',fechaFin: '0000-01-02' },{ fechaInicio: '2030-02-30',fechaFin: '2030-03-10' },{ fechaInicio: '2030-02-01',fechaFin: null },{ fechaInicio: '2030-03-10',fechaFin: '2030-03-01' }]) {
    const r = await pedir('admin','POST','/api/cursos',{ titulo: 'Inválido',instructorId: personas.get('docente')!.id,horasLectivas: 1,modalidad: 'VIRTUAL',costo: 0,cupos: 1,tipoCertificado: 'PARTICIPACION',modulos: [{ titulo: 'Módulo' }],...fechas });
    assert.equal(r.statusCode,422,r.body);
  }
});
