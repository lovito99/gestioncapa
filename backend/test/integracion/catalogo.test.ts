import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { env } from '../../src/config/env.js';
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
  assert.deepEqual(todos.categorias,['Educación','General','Seguridad y salud','Tecnología']);
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
  const curso = await crear({ titulo: 'Última plaza',cupos: 1, costo: 0 });
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

test('HU-14: detalle publicado incluye solo sus sesiones, ordenadas y sin datos de participantes', async () => {
  const curso = await crear({ modalidad: 'PRESENCIAL' });
  const ajeno = await crear({ modalidad: 'PRESENCIAL' }, true, 'adminAjeno', 'docenteAjeno');
  for (const [id, organizacion, docente, fecha, inicio, fin, estado] of [
    [curso.id, org, 'docente', '2031-04-12', '10:00', '11:00', 'PROGRAMADA'],
    [curso.id, org, 'docente', '2031-04-11', '11:00', '12:00', 'CANCELADA'],
    [curso.id, org, 'docente', '2031-04-11', '08:00', '09:00', 'PROGRAMADA'],
    [ajeno.id, otra, 'docenteAjeno', '2031-04-10', '08:00', '09:00', 'PROGRAMADA'],
  ]) await pool.query(`insert into classes(organization_id,curso_id,instructor_id,nombre,fecha,hora_inicio,hora_fin,lugar,estado)
    values($1,$2,$3,'Sesión HU14',$4,$5,$6,'Auditorio CPPP',$7)`, [organizacion,id,personas.get(docente!)!.id,fecha,inicio,fin,estado]);
  const respuesta = await pedir('a','GET',`/api/cursos/${curso.id}`);
  assert.equal(respuesta.statusCode,200,respuesta.body);
  const detalle = respuesta.json();
  assert.equal(detalle.modalidad,'PRESENCIAL');
  assert.deepEqual(detalle.sesiones.map((s: { fecha: string; horaInicio: string; lugar: string; estado: string }) => [s.fecha,s.horaInicio,s.lugar,s.estado]), [
    ['2031-04-11','08:00','Auditorio CPPP','PROGRAMADA'],
    ['2031-04-11','11:00','Auditorio CPPP','CANCELADA'],
    ['2031-04-12','10:00','Auditorio CPPP','PROGRAMADA'],
  ]);
  assert.ok(detalle.sesiones.every((s: object) => !('inscritos' in s) && !('participantes' in s)));
  assert.equal((await pedir('ajeno','GET',`/api/cursos/${curso.id}`)).statusCode,403);
  const sinSesiones = await crear();
  assert.deepEqual((await pedir('a','GET',`/api/cursos/${sinSesiones.id}`)).json().sesiones,[]);
});

test('RF-07: catálogo público vigente, paginado y sin datos internos', async () => {
  const anterior = env.cpppOrganizacionId;
  env.cpppOrganizacionId = org;
  try {
    const vencido = await crear({ titulo: 'Curso público vencido', fechaInicio: '2020-01-01', fechaFin: '2020-01-02' });
    const respuesta = await pedir(null, 'GET', '/api/publico/cursos?tamanoPagina=50');
    assert.equal(respuesta.statusCode, 200, respuesta.body);
    assert.equal(respuesta.headers['cache-control'], 'no-store');
    const datos = respuesta.json();
    assert.ok(datos.total > 0);
    assert.ok(!datos.items.some((curso: { id: string }) => [borrador, vencido.id].includes(curso.id)));
    for (const curso of datos.items) {
      assert.notEqual(curso.titulo, 'HU14 · Curso ajeno');
      assert.deepEqual(Object.keys(curso).sort(), ['id', 'titulo', 'descripcion', 'instructorNombre', 'horasLectivas', 'modalidad', 'costo', 'cupos', 'cuposDisponibles', 'categoria', 'fechaInicio', 'fechaFin'].sort());
    }
    const filtro = await pedir(null, 'GET', '/api/publico/cursos?buscar=CAPACITACION&modalidad=VIRTUAL&tamanoPagina=2');
    assert.equal(filtro.json().total, 4); assert.equal(filtro.json().items.length, 2);
    assert.equal((await pedir(null, 'GET', '/api/publico/cursos?tamanoPagina=51')).statusCode, 422);
  } finally { env.cpppOrganizacionId = anterior; }
});


test('HU-16: curso con costo reserva vacante pendiente, sin confirmar ni duplicar', async () => {
  const curso = await crear({ titulo: 'HU16 · Reserva con costo', costo: 45, cupos: 1 });
  const sesion = (await pool.query<{ id: string }>(`insert into classes(organization_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar,curso_id)
    values($1,'Sesión pendiente',$2,'2031-04-01','08:00','09:00','Sala',$3) returning id::text`, [org, personas.get('docente')!.id, curso.id])).rows[0]!;
  const ruta = `/api/cursos/${curso.id}/inscribirme`;
  const primera = await pedir('a', 'POST', ruta, { estado: 'EN_CURSO' });
  assert.equal(primera.statusCode, 201, primera.body);
  assert.equal(primera.json().estado, 'PENDIENTE_PAGO');
  const repetida = await pedir('a', 'POST', ruta);
  assert.equal(repetida.statusCode, 200); assert.equal(repetida.json().estado, 'PENDIENTE_PAGO');
  assert.equal(repetida.json().yaInscrito, true);
  assert.equal((await pedir('b', 'POST', ruta)).statusCode, 409);
  const detalle = (await pedir('a', 'GET', `/api/cursos/${curso.id}`)).json();
  assert.equal(detalle.estadoInscripcion, 'PENDIENTE_PAGO'); assert.equal(detalle.cuposDisponibles, 0);
  const historial = (await pedir('a', 'GET', `/api/colegiados/${personas.get('a')!.id}/historial`)).json();
  const inscrito = historial.cursos.find((fila: { id: string }) => fila.id === curso.id);
  assert.equal(inscrito.estado, 'PENDIENTE_PAGO'); assert.equal(inscrito.pagoPendiente, true);
  const pdf = await pedir('a', 'GET', `/api/colegiados/${personas.get('a')!.id}/historial/pdf`);
  assert.equal(pdf.statusCode, 200);
  assert.ok(pdf.rawPayload.toString('ascii').includes(Buffer.from('Pendiente de pago', 'latin1').toString('hex')));
  await pool.query('update cursos set costo=0 where id=$1', [curso.id]);
  assert.equal((await pedir('a', 'POST', ruta)).json().estado, 'PENDIENTE_PAGO', 'Reintentar no modifica una reserva por el precio actual');
  assert.equal((await pool.query('select count(*)::int as total from enrollments where class_id=$1', [sesion.id])).rows[0].total, 0);
  assert.equal((await pool.query('select count(*)::int as total from inscripciones_curso where curso_id=$1', [curso.id])).rows[0].total, 1);
});
