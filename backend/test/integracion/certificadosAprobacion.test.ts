import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { liberarRetenidas } from '../../src/routes/certificados.routes.js';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { redis } from '../../src/shared/redis.js';

type Persona = { id: string; token: string };
type Pregunta = { id: string; opciones: { id: string }[] };
type CursoPrueba = { id: string; leccionId: string | null; cuestionario: string };
let app: FastifyInstance;
const personas = new Map<string, Persona>();
const correo = randomUUID();
const persona = (nombre: string) => personas.get(nombre)!;

function pedir(nombre: string | null, method: 'GET' | 'POST', url: string, payload?: object) {
  return app.inject({ method, url, headers: nombre ? { authorization: `Bearer ${persona(nombre).token}` } : {},
    ...(payload && { payload }) });
}

async function prepararCurso(
  modalidad: 'GRABADO' | 'PRESENCIAL',
  costo = 0,
  modalidadCobro = costo ? 'CERTIFICADO' : 'GRATUITO'
): Promise<CursoPrueba> {
  const creado = await pedir('admin', 'POST', '/api/cursos', {
    titulo: `HU19 certificación ${modalidad}`, instructorId: persona('docente').id, horasLectivas: 8, modalidad,
    costo, modalidadCobro, plazoPagoMinutos: modalidadCobro === 'PREVIO' ? 60 : null, cupos: 10, tipoCertificado: 'APROBACION',
    modulos: [{ titulo: 'Módulo inicial' }]
  });
  assert.equal(creado.statusCode, 201, creado.body);
  const curso = creado.json<{ id: string; modulos: { id: string }[] }>();
  const ruta = `/api/cursos/${curso.id}`;
  let leccionId: string | null = null;
  if (modalidad === 'GRABADO') {
    const material = await pedir('docente', 'POST', `${ruta}/modulos/${curso.modulos[0]!.id}/materiales`, {
      titulo: 'Lección obligatoria', tipo: 'VIDEO', url: 'https://cursos.example/leccion.mp4'
    });
    assert.equal(material.statusCode, 201, material.body);
    leccionId = material.json<{ id: string }>().id;
  }
  const publicado = await pedir('admin', 'POST', `${ruta}/publicar`);
  assert.equal(publicado.statusCode, 200, publicado.body);
  const evaluacion = await pedir('docente', 'POST', `${ruta}/evaluaciones/gestion`, {
    titulo: 'Evaluación oficial', oficial: true, leccionesIds: leccionId ? [leccionId] : [],
    preguntas: Array.from({ length: 4 }, (_, numero) => ({
      enunciado: `Pregunta ${numero + 1}`, opciones: ['Primera', 'Segunda'], correcta: 0
    }))
  });
  assert.equal(evaluacion.statusCode, 201, evaluacion.body);
  const cuestionario = `${ruta}/evaluaciones/${evaluacion.json<{ id: string }>().id}`;
  const salida = await pedir('docente', 'POST', `${cuestionario}/publicar`);
  assert.equal(salida.statusCode, 200, salida.body);
  return { id: curso.id, leccionId, cuestionario };
}

async function inscribir(curso: CursoPrueba, ...inscritos: string[]) {
  for (const inscrito of inscritos) {
    const respuesta = await pedir(inscrito, 'POST', `/api/cursos/${curso.id}/inscribirme`, { versionCobro: 1 });
    assert.equal(respuesta.statusCode, 201, respuesta.body);
  }
}

async function completarLeccion(curso: CursoPrueba, titular: string) {
  const respuesta = await pedir(titular, 'POST', `/api/cursos/${curso.id}/evaluaciones/lecciones/${curso.leccionId}/completar`);
  assert.equal(respuesta.statusCode, 200, respuesta.body);
}

async function entregar(curso: CursoPrueba, titular: string, correctas: number) {
  const vista = await pedir(titular, 'GET', curso.cuestionario);
  assert.equal(vista.statusCode, 200, vista.body);
  const { preguntas } = vista.json<{ preguntas: Pregunta[] }>();
  return pedir(titular, 'POST', `${curso.cuestionario}/intentos`, {
    operacionId: randomUUID(),
    respuestas: preguntas.map((pregunta, indice) => ({
      preguntaId: pregunta.id,
      opcionId: pregunta.opciones[indice < correctas ? 0 : 1]!.id
    }))
  });
}

const evaluar = (curso: CursoPrueba, titular: string, actor: string | null = 'admin') =>
  pedir(actor, 'POST', `/api/cursos/${curso.id}/evaluar-inscripcion`, { agremiadoId: persona(titular).id });

before(async () => {
  await migrar(pool);
  app = await buildApp();
  for (const [nombre, rol] of [
    ['admin', 'admin'], ['docente', 'instructor'], ['primera', 'agremiado'], ['segunda', 'agremiado'], ['tercera', 'agremiado']
  ]) {
    const { rows: [creada] } = await pool.query<{ id: string }>(
      "insert into users(name,email,password_hash,role) values($1,$2,'sin-clave',$3) returning id::text",
      [nombre, `${correo}-${nombre}@hu19.example`, rol]
    );
    personas.set(nombre!, { id: creada!.id, token: app.jwt.sign({ sub: creada!.id }) });
  }
});

after(async () => {
  try {
    const admin = personas.get('admin')?.id;
    if (!admin) return;
    const propios = 'select id from cursos where creador_id=$1';
    await pool.query(`delete from "entregasConstancia" where "cursoId" in (${propios})`, [admin]);
    await pool.query(`delete from "auditoriaCertificados" where "cursoId" in (${propios})`, [admin]);
    await pool.query(`delete from classes where curso_id in (${propios})`, [admin]);
    await pool.query(`delete from "intentosInscripcion" where "cursoId" in (${propios})`, [admin]);
    const pagos = `select id from "obligacionesPago" where "cursoId" in (${propios})`;
    for (const tabla of ['incidenciasPago', 'auditoriaPagos', 'hechosPago', 'operacionesPago']) {
      await pool.query(`delete from "${tabla}" where "pagoId" in (${pagos})`, [admin]);
    }
    await pool.query(`delete from "obligacionesPago" where id in (${pagos})`, [admin]);
    await pool.query(`delete from cursos where creador_id=$1`, [admin]);
    await pool.query('delete from users where id=any($1::bigint[])', [[...personas.values()].map(item => item.id)]);
  } finally {
    await app?.close();
    await pool.end();
    redis.disconnect();
  }
});

test('HU19-07/08: el grabado emite una vez la mejor nota y conserva la privacidad del QR', async () => {
  const curso = await prepararCurso('GRABADO');
  await inscribir(curso, 'primera', 'segunda');
  assert.equal((await evaluar(curso, 'primera', null)).statusCode, 401);
  assert.equal((await evaluar(curso, 'primera', 'docente')).statusCode, 403);
  assert.equal((await evaluar(curso, 'tercera')).statusCode, 403);
  assert.equal((await evaluar(curso, 'primera')).json().code, 'AVANCE_INCOMPLETO');
  await completarLeccion(curso, 'primera');
  assert.equal((await evaluar(curso, 'primera')).json().code, 'EVALUACION_NO_APROBADA');
  const mejor = await entregar(curso, 'primera', 4);
  assert.equal(mejor.statusCode, 200, mejor.body);
  assert.equal(mejor.json().nota, 20);
  const ultimo = await entregar(curso, 'primera', 3);
  assert.equal(ultimo.statusCode, 200, ultimo.body);
  assert.equal(ultimo.json().nota, 15);
  const [emision, repeticion] = await Promise.all([evaluar(curso, 'primera'), evaluar(curso, 'primera')]);
  assert.equal(emision.statusCode, 200, emision.body);
  assert.equal(repeticion.statusCode, 200, repeticion.body);
  assert.deepEqual(repeticion.json(), emision.json());
  const { codigo } = emision.json<{ codigo: string }>();
  const filas = (await pedir('admin', 'GET', `/api/cursos/${curso.id}/certificados`)).json();
  assert.equal(filas.evaluacionIndividual, true);
  assert.equal(filas.curso.estado, 'PUBLICADO');
  assert.equal(filas.filas.length, 2);
  assert.equal(filas.filas.find((fila: { agremiado: { id: string } }) => fila.agremiado.id === persona('segunda').id).certificado, null);
  const documento = await pedir('primera', 'GET', `/api/certificados/${codigo}/documento`);
  assert.equal(documento.json().nota, 20);
  assert.equal(documento.json().tipo, 'APROBACION');
  assert.equal(documento.json().modalidad, 'GRABADO');
  const pdf = await pedir('primera', 'GET', `/api/certificados/${codigo}/archivo`);
  assert.equal(pdf.statusCode, 200, pdf.body);
  assert.equal(pdf.rawPayload.subarray(0, 5).toString(), '%PDF-');
  assert.equal((await pedir('segunda', 'GET', `/api/certificados/${codigo}/archivo`)).statusCode, 403);
  const qr = (await pedir(null, 'GET', `/api/certificados/${codigo}`)).json();
  assert.equal(qr.estado, 'VALIDO');
  assert.equal(qr.tipo, 'APROBACION');
  assert.ok(!('nota' in qr || 'dniEnmascarado' in qr));
  const historial = (await pedir('primera', 'GET', `/api/colegiados/${persona('primera').id}/historial`)).json();
  const entrada = historial.cursos.find((item: { id: string }) => item.id === curso.id);
  assert.equal(entrada.estado, 'TERMINADO');
  assert.equal(entrada.certificados[0].nota, 20);

  const correccion = await pedir('admin', 'POST', `/api/certificados/${codigo}/corregir`, {
    nombre: 'Nombre corregido', motivo: 'Corregir el nombre del titular'
  });
  assert.equal(correccion.statusCode, 201, correccion.body);
  const nuevo = correccion.json<{ codigo: string }>().codigo;
  const original = (await pedir(null, 'GET', `/api/certificados/${codigo}`)).json();
  assert.equal(original.estado, 'REEMPLAZADO');
  assert.equal(original.reemplazadoPor, nuevo);
  assert.equal((await pedir('primera', 'GET', `/api/certificados/${nuevo}/documento`)).json().nota, 20);
});

test('HU19-07: la aprobación con cobro conserva su nota al quedar retenida y al liberarse', async () => {
  const curso = await prepararCurso('GRABADO', 30);
  await inscribir(curso, 'primera');
  await completarLeccion(curso, 'primera');
  assert.equal((await entregar(curso, 'primera', 3)).statusCode, 200);
  const emision = await evaluar(curso, 'primera');
  assert.equal(emision.statusCode, 200, emision.body);
  const retenida = emision.json<{ codigo: null; retenida: boolean; pagoId: string }>();
  assert.equal(retenida.retenida, true);
  assert.equal(retenida.codigo, null);
  assert.deepEqual((await evaluar(curso, 'primera')).json(), retenida);
  assert.equal((await entregar(curso, 'primera', 4)).statusCode, 409);
  assert.equal((await pool.query('select 1 from certificados_curso where curso_id=$1', [curso.id])).rowCount, 0);
  const pago = await pedir('admin', 'POST', `/api/pagos/${retenida.pagoId}/efectivo`, {
    referencia: `HU19-${curso.id}`, importeCentimos: 3000, fechaRecepcion: '2026-01-01'
  });
  assert.equal(pago.statusCode, 200, pago.body);
  await liberarRetenidas();
  await liberarRetenidas();
  const confirmada = (await evaluar(curso, 'primera')).json<{ codigo: string; retenida: boolean }>();
  assert.equal(confirmada.retenida, false);
  const documento = (await pedir('primera', 'GET', `/api/certificados/${confirmada.codigo}/documento`)).json();
  assert.equal(documento.nota, 15);
  assert.equal((await pool.query('select 1 from certificados_curso where curso_id=$1', [curso.id])).rowCount, 1);
});

test('HU19-07: el cierre de aprobación requiere nota y asistencia, sin excepción académica', async () => {
  const curso = await prepararCurso('PRESENCIAL');
  await inscribir(curso, 'primera', 'segunda', 'tercera');
  const clase = (await pool.query<{ id: string }>(`
    insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)
    values($1,'Sesión oficial',$2,current_date-1,'08:00','09:00','Sala') returning id::text`,
  [curso.id, persona('docente').id])).rows[0]!;
  for (const titular of ['primera', 'tercera']) {
    await pool.query('insert into enrollments(class_id,user_id) values($1,$2)', [clase.id, persona(titular).id]);
    await pool.query('insert into attendances(class_id,user_id,created_by) values($1,$2,$3)',
      [clase.id, persona(titular).id, persona('admin').id]);
  }
  for (const titular of ['primera', 'segunda']) assert.equal((await entregar(curso, titular, 4)).statusCode, 200);
  const ruta = `/api/cursos/${curso.id}`;
  const vista = (await pedir('admin', 'GET', `${ruta}/cierre`)).json();
  assert.equal(vista.filas.filter((fila: { cumple: boolean }) => fila.cumple).length, 1);
  const excepcion = await pedir('admin', 'POST', `${ruta}/cerrar`, {
    excepciones: [{ agremiadoId: persona('segunda').id, motivo: 'Dato que no sustituye la asistencia' }]
  });
  assert.equal(excepcion.statusCode, 422, excepcion.body);
  assert.equal(excepcion.json().code, 'EXCEPCION_NO_DISPONIBLE');
  const cierre = await pedir('admin', 'POST', `${ruta}/cerrar`, {});
  assert.equal(cierre.statusCode, 200, cierre.body);
  assert.equal(cierre.json().emitidos, 1);
  const certificados = await pool.query('select usuario_id::text as usuario,tipo,datos from certificados_curso where curso_id=$1', [curso.id]);
  assert.equal(certificados.rowCount, 1);
  assert.equal(certificados.rows[0].usuario, persona('primera').id);
  assert.equal(certificados.rows[0].tipo, 'APROBACION');
  assert.equal(certificados.rows[0].datos.nota, 20);
});

test('HU19-05: pagar antes de acceder es requisito también para el aula y la evaluación grabada', async () => {
  const curso = await prepararCurso('GRABADO', 30, 'PREVIO');
  await inscribir(curso, 'primera');
  for (const ruta of [curso.cuestionario, `/api/cursos/${curso.id}/evaluaciones`]) {
    assert.equal((await pedir('primera', 'GET', ruta)).statusCode, 403);
  }
  assert.equal((await pedir('primera', 'POST', `/api/cursos/${curso.id}/evaluaciones/lecciones/${curso.leccionId}/completar`)).statusCode, 403);
  assert.equal((await evaluar(curso, 'primera')).statusCode, 403);
});

test('HU19-06/07: el certificado refleja solo intentos aceptados antes de finalizar la inscripción', async () => {
  const curso = await prepararCurso('GRABADO');
  await inscribir(curso, 'primera');
  await completarLeccion(curso, 'primera');
  assert.equal((await entregar(curso, 'primera', 3)).statusCode, 200);
  const [otroIntento, emision] = await Promise.all([entregar(curso, 'primera', 4), evaluar(curso, 'primera')]);
  assert.equal(emision.statusCode, 200, emision.body);
  assert.ok([200, 409].includes(otroIntento.statusCode), otroIntento.body);
  const { codigo } = emision.json<{ codigo: string }>();
  const documento = await pedir('primera', 'GET', `/api/certificados/${codigo}/documento`);
  assert.equal(documento.json().nota, otroIntento.statusCode === 200 ? 20 : 15);
  assert.equal((await entregar(curso, 'primera', 4)).json().code, 'RESULTADO_FINALIZADO');
});
