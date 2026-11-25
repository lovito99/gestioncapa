import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { redis } from '../../src/shared/redis.js';

type Persona = { id: string; token: string };

let app: FastifyInstance;
let admin: Persona;
let instructor: Persona;
let ajeno: Persona;
let colegiado: Persona;
let curso: string;
let leccion: string;
let otraLeccion: string;
const personasCreadas: string[] = [];

async function crearPersona(role: string): Promise<Persona> {
  const { rows } = await pool.query<{ id: string }>(
    "insert into users(name,email,password_hash,role) values($1,$2,'sin-clave',$1) returning id::text",
    [role, `${randomUUID()}@hu19.test`]
  );
  const { id } = rows[0]!;
  personasCreadas.push(id);
  return { id, token: app.jwt.sign({ sub: id }) };
}

async function crearCurso(notaMinima?: number) {
  const { rows } = await pool.query<{ id: string }>(
    `insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado,estado,nota_minima)
     values($1,$2,'HU-19',12,'GRABADO',0,5,'APROBACION','PUBLICADO',coalesce($3::float8,14)) returning id::text`,
    [admin.id, instructor.id, notaMinima ?? null]
  );
  return rows[0]!.id;
}

async function crearVideo(cursoId: string) {
  const { rows } = await pool.query<{ id: string }>(
    `with modulo as (insert into modulos_curso(curso_id,titulo,orden) values($1,'Módulo',1) returning id)
     insert into materiales_curso(modulo_id,titulo,tipo,url)
     select id,'Lección','VIDEO','https://cursos.example/video.mp4' from modulo returning id::text`,
    [cursoId]
  );
  return rows[0]!.id;
}

before(async () => {
  await migrar(pool);
  app = await buildApp();
  admin = await crearPersona('admin');
  instructor = await crearPersona('instructor');
  ajeno = await crearPersona('instructor');
  colegiado = await crearPersona('agremiado');
  curso = await crearCurso();
  leccion = await crearVideo(curso);
  otraLeccion = await crearVideo(await crearCurso());
  await pool.query('insert into inscripciones_curso(curso_id,usuario_id) values($1,$2)', [curso, colegiado.id]);
});

after(async () => {
  try {
    if (admin) {
      await pool.query('delete from cursos where creador_id=$1', [admin.id]);
      await pool.query('delete from users where id=any($1::bigint[])', [personasCreadas]);
    }
  } finally {
    await app?.close();
    await pool.end();
    redis.disconnect();
  }
});

function pedir(persona: Persona | null, method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, payload?: object) {
  return app.inject({
    method, url,
    ...(persona && { headers: { authorization: `Bearer ${persona.token}` } }),
    ...(payload && { payload })
  });
}

const base = (id = curso) => `/api/cursos/${id}/evaluaciones`;
const politica = (id = curso) => `/api/cursos/${id}/politica-evaluacion`;
const preguntas = Array.from({ length: 3 }, (_, indice) => ({
  enunciado: `Pregunta ${indice + 1}`, opciones: ['Opción A', 'Opción B'], correcta: 0
}));
const borrador = () => ({ titulo: 'Cuestionario de salida', oficial: true, preguntas, leccionesIds: [leccion] });

test('HU19-02: política inicial y personalizada por curso, protegida por rol', async () => {
  const defecto = await pedir(admin, 'GET', politica());
  assert.equal(defecto.statusCode, 200, defecto.body);
  assert.deepEqual(defecto.json(), { notaMinima: 14, intentosMaximos: 2 });
  const previo = await crearCurso(16.5);
  assert.deepEqual((await pedir(admin, 'GET', politica(previo))).json(), { notaMinima: 16.5, intentosMaximos: 2 });
  const cambio = { notaMinima: 12.5, intentosMaximos: 3 };
  assert.equal((await pedir(instructor, 'PATCH', politica(previo), cambio)).statusCode, 403);
  assert.equal((await pedir(admin, 'PATCH', politica(previo), { ...cambio, intentosMaximos: 0 })).statusCode, 422);
  assert.equal((await pedir(admin, 'PATCH', politica(previo), cambio)).statusCode, 200);
  assert.deepEqual((await pedir(admin, 'GET', politica(previo))).json(), cambio);
});

test('HU19-01: solo el instructor asignado puede crear y editar borradores', async () => {
  for (const [persona, status] of [[null, 401], [colegiado, 403], [ajeno, 403]] as const) {
    assert.equal((await pedir(persona, 'POST', `${base()}/gestion`, borrador())).statusCode, status);
  }
  const creado = await pedir(instructor, 'POST', `${base()}/gestion`, { ...borrador(), preguntas: [] });
  assert.equal(creado.statusCode, 201, creado.body);
  assert.equal(creado.json().publicada, false);
  const id = creado.json().id as string;
  assert.equal((await pedir(ajeno, 'PUT', `${base()}/${id}`, borrador())).statusCode, 403);
  const editado = await pedir(instructor, 'PUT', `${base()}/${id}`, borrador());
  assert.equal(editado.statusCode, 200, editado.body);
  assert.deepEqual(editado.json().preguntas, preguntas);
  const gestion = await pedir(instructor, 'GET', `${base()}/gestion`);
  assert.deepEqual(gestion.json().lecciones.map((video: { id: string }) => video.id), [leccion]);
  assert.equal((await pedir(colegiado, 'GET', `${base()}/gestion`)).statusCode, 403);
});

async function crearBorrador(datos = borrador(), cursoId = curso) {
  const creado = await pedir(instructor, 'POST', `${base(cursoId)}/gestion`, datos);
  assert.equal(creado.statusCode, 201, creado.body);
  return creado.json().id as string;
}

const publicar = (id: string, cursoId = curso) => pedir(instructor, 'POST', `${base(cursoId)}/${id}/publicar`);

test('HU19-01/02/05: la publicación valida lecciones, fija la política e impide dos salidas', async () => {
  for (const variante of [
    { preguntas: [] }, { leccionesIds: [] }, { leccionesIds: [otraLeccion] }
  ]) {
    const invalida = await crearBorrador({ ...borrador(), ...variante });
    assert.equal((await publicar(invalida)).statusCode, 422);
  }
  const id = await crearBorrador();
  assert.equal((await pedir(ajeno, 'POST', `${base()}/${id}/publicar`)).statusCode, 403);
  const publicada = await publicar(id);
  assert.equal(publicada.statusCode, 200, publicada.body);
  assert.equal(publicada.json().publicada, true);
  assert.equal((await publicar(id)).statusCode, 200);
  assert.equal((await pedir(instructor, 'PUT', `${base()}/${id}`, borrador())).statusCode, 409);
  assert.equal((await publicar(await crearBorrador())).statusCode, 409);

  const cambio = await pedir(admin, 'PATCH', politica(), { notaMinima: 12, intentosMaximos: 4 });
  assert.equal(cambio.statusCode, 200, cambio.body);
  const fijada = await pool.query('select "notaMinima","intentosMaximos" from evaluaciones where id=$1', [id]);
  assert.deepEqual(fijada.rows[0], { notaMinima: 14, intentosMaximos: 2 });
});

async function prepararSalida(notaMinima?: number) {
  const cursoId = await crearCurso(notaMinima);
  const videoId = await crearVideo(cursoId);
  await pool.query('insert into inscripciones_curso(curso_id,usuario_id) values($1,$2)', [cursoId, colegiado.id]);
  const evaluacionId = await crearBorrador({ ...borrador(), leccionesIds: [videoId] }, cursoId);
  const respuesta = await publicar(evaluacionId, cursoId);
  assert.equal(respuesta.statusCode, 200, respuesta.body);
  return { cursoId, videoId, evaluacionId };
}

const completar = (cursoId: string, videoId: string) =>
  pedir(colegiado, 'POST', `${base(cursoId)}/lecciones/${videoId}/completar`);

test('HU19-05: el avance de grabados es persistente, del titular e idempotente', async () => {
  const { cursoId, videoId, evaluacionId } = await prepararSalida();
  const inicial = await pedir(colegiado, 'GET', base(cursoId));
  assert.equal(inicial.statusCode, 200, inicial.body);
  assert.deepEqual(inicial.json().lecciones.map((item: { completada: boolean }) => item.completada), [false]);
  assert.equal(inicial.json().evaluaciones[0].bloqueada, true);
  assert.equal((await completar(cursoId, otraLeccion)).statusCode, 404);
  assert.equal((await pedir(colegiado, 'GET', `${base(cursoId)}/${evaluacionId}`)).statusCode, 409);

  for (let vez = 0; vez < 2; vez++) {
    const respuesta = await completar(cursoId, videoId);
    assert.deepEqual(respuesta.json(), { completada: true });
  }
  const actualizado = await pedir(colegiado, 'GET', base(cursoId));
  assert.equal(actualizado.json().lecciones[0].completada, true);
  assert.equal(actualizado.json().evaluaciones[0].bloqueada, false);
  const tercero = await crearPersona('agremiado');
  assert.equal((await pedir(tercero, 'GET', base(cursoId))).statusCode, 403);
  assert.equal((await pedir(tercero, 'POST', `${base(cursoId)}/lecciones/${videoId}/completar`)).statusCode, 403);
});

test('HU19-03/05: la lectura exige acceso y omite la clave y los borradores', async () => {
  const { cursoId, videoId, evaluacionId } = await prepararSalida();
  const draftId = await crearBorrador({ ...borrador(), oficial: false, leccionesIds: [] }, cursoId);
  await completar(cursoId, videoId);
  const consulta = await pedir(colegiado, 'GET', `${base(cursoId)}/${evaluacionId}`);
  assert.equal(consulta.statusCode, 200, consulta.body);
  assert.equal(consulta.headers['cache-control'], 'no-store');
  for (const pregunta of consulta.json().preguntas) {
    assert.deepEqual(Object.keys(pregunta).sort(), ['enunciado', 'id', 'opciones']);
    assert.deepEqual(Object.keys(pregunta.opciones[0]).sort(), ['id', 'texto']);
  }
  assert.equal((await pedir(colegiado, 'GET', `${base(cursoId)}/${draftId}`)).statusCode, 404);
  await pool.query("update inscripciones_curso set estado='CANCELADA' where curso_id=$1 and usuario_id=$2", [cursoId, colegiado.id]);
  assert.equal((await pedir(colegiado, 'GET', `${base(cursoId)}/${evaluacionId}`)).statusCode, 403);
  assert.equal((await completar(cursoId, videoId)).statusCode, 403);
});

type PreguntaPublica = { id: string; opciones: { id: string }[] };

async function opcionesDe(cursoId: string, evaluacionId: string) {
  const respuesta = await pedir(colegiado, 'GET', `${base(cursoId)}/${evaluacionId}`);
  assert.equal(respuesta.statusCode, 200, respuesta.body);
  return respuesta.json<{ preguntas: PreguntaPublica[] }>().preguntas;
}

function responder(alternativas: PreguntaPublica[], correctas: number) {
  return alternativas.map((pregunta, indice) => ({
    preguntaId: pregunta.id, opcionId: pregunta.opciones[indice < correctas ? 0 : 1]!.id
  }));
}

test('HU19-03/04/06: califica, preserva la mejor nota y consume el último intento una sola vez', async () => {
  const { cursoId, videoId, evaluacionId } = await prepararSalida();
  const url = `${base(cursoId)}/${evaluacionId}/intentos`;
  assert.equal((await pedir(colegiado, 'POST', url, { operacionId: randomUUID(), respuestas: [
    { preguntaId: randomUUID(), opcionId: randomUUID() }
  ] })).statusCode, 409);
  await completar(cursoId, videoId);
  const alternativas = await opcionesDe(cursoId, evaluacionId);
  const respuestas = responder(alternativas, 2);
  for (const invalida of [
    respuestas.slice(1),
    [respuestas[0]!, ...respuestas.slice(0, -1)],
    [{ ...respuestas[0]!, opcionId: respuestas[1]!.opcionId }, ...respuestas.slice(1)]
  ]) {
    assert.equal((await pedir(colegiado, 'POST', url, { operacionId: randomUUID(), respuestas: invalida })).statusCode, 422);
  }

  const primerId = randomUUID();
  const primera = await pedir(colegiado, 'POST', url, { operacionId: primerId, respuestas });
  assert.equal(primera.statusCode, 200, primera.body);
  assert.deepEqual(primera.json(), {
    nota: 13.33, aprobado: false,
    estado: { mejorNota: 13.33, aprobado: false, intentosUsados: 1, intentosRestantes: 1, finalizado: false }
  });

  const todas = responder(alternativas, 3);
  const simultaneas = await Promise.all([randomUUID(), randomUUID()].map(operacionId =>
    pedir(colegiado, 'POST', url, { operacionId, respuestas: todas })
  ));
  assert.deepEqual(simultaneas.map(item => item.statusCode).sort(), [200, 409]);
  const exito = simultaneas.find(item => item.statusCode === 200)!.json();
  const agotado = simultaneas.find(item => item.statusCode === 409)!.json();
  assert.equal(exito.nota, 20);
  assert.deepEqual(agotado.details.estado, {
    mejorNota: 20, aprobado: true, intentosUsados: 2, intentosRestantes: 0, finalizado: false
  });
  const repetida = await pedir(colegiado, 'POST', url, { operacionId: primerId, respuestas: [...respuestas].reverse() });
  assert.deepEqual(repetida.json(), { nota: 13.33, aprobado: false, estado: agotado.details.estado });
  assert.equal((await pedir(colegiado, 'POST', url, { operacionId: primerId, respuestas: todas })).json().code, 'OPERACION_EN_CONFLICTO');
});

test('HU19-06: la nota en el mínimo aprueba y se conserva aunque el siguiente intento sea menor', async () => {
  const { cursoId, videoId, evaluacionId } = await prepararSalida(13.33);
  await completar(cursoId, videoId);
  const alternativas = await opcionesDe(cursoId, evaluacionId);
  const url = `${base(cursoId)}/${evaluacionId}/intentos`;
  const primera = await pedir(colegiado, 'POST', url, { operacionId: randomUUID(), respuestas: responder(alternativas, 2) });
  assert.equal(primera.json().aprobado, true);
  const segunda = await pedir(colegiado, 'POST', url, { operacionId: randomUUID(), respuestas: responder(alternativas, 0) });
  assert.equal(segunda.json().nota, 0);
  assert.equal(segunda.json().aprobado, false);
  assert.equal(segunda.json().estado.mejorNota, 13.33);
  assert.equal(segunda.json().estado.aprobado, true);
});
