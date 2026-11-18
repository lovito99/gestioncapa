import assert from 'node:assert/strict';
import { after, before, test, type TestContext } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { redis } from '../../src/shared/redis.js';

let app: FastifyInstance;
let administrador: string;
let instructorId: string;
const politicaOriginal = env.inscripcionExternaHabilitada;

before(async () => {
  assert.equal(env.NODE_ENV, 'test', 'HU-43 requiere una base aislada de pruebas.');
  env.inscripcionExternaHabilitada = false;
  await migrar(pool);
  app = await buildApp();
  const { rows } = await pool.query<{ id: string; role: string }>(
    `insert into users(name,email,password_hash,role) values
     ('Admin HU43','admin-hu43@prueba.local','sin-clave','admin'),
     ('Instructor HU43','instructor-hu43@prueba.local','sin-clave','instructor')
     on conflict(email) do update set active=true returning id::text, role`,
  );
  administrador = app.jwt.sign({ sub: rows.find(usuario => usuario.role === 'admin')!.id });
  instructorId = rows.find(usuario => usuario.role === 'instructor')!.id;
});

after(async () => {
  env.inscripcionExternaHabilitada = politicaOriginal;
  await app?.close();
  await pool.end();
  redis.disconnect();
});

function pedir(method: 'POST' | 'PATCH' | 'GET', url: string, payload?: object, token?: string) {
  return app.inject({ method, url, ...(payload ? { payload } : {}), headers: token ? { authorization: `Bearer ${token}` } : {} });
}

function altaCurso(datos: object = {}) {
  return pedir('POST', '/api/cursos', {
    instructorId, titulo: 'HU43 · Evaluación pedagógica', horasLectivas: 8, modalidad: 'PRESENCIAL',
    costo: 42.35, modalidadCobro: 'PREVIO', plazoPagoMinutos: 60, cupos: 5,
    tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Evaluación' }], ...datos,
  }, administrador);
}

async function publicar(datos: object = {}) {
  const alta = await altaCurso(datos);
  assert.equal(alta.statusCode, 201, alta.body);
  const curso = alta.json() as { id: string; versionCobro: number };
  const respuesta = await pedir('POST', `/api/cursos/${curso.id}/publicar`, {}, administrador);
  assert.equal(respuesta.statusCode, 200, respuesta.body);
  return curso;
}

async function docente(nombre: string, dni: string | null) {
  const { rows: [usuario] } = await pool.query<{ id: string }>(`insert into users(name,email,password_hash,role,dni)
    values($1,$2,'sin-clave','agremiado',$3)
    on conflict(email) do update set active=true returning id::text`, [nombre, `${nombre}-hu43@prueba.local`, dni]);
  return { id: usuario!.id, token: app.jwt.sign({ sub: usuario!.id }) };
}

function activar(contexto: TestContext) {
  const anterior = env.inscripcionExternaHabilitada;
  env.inscripcionExternaHabilitada = true;
  contexto.after(() => { env.inscripcionExternaHabilitada = anterior });
}

async function cargarPadron(contexto: TestContext, afiliados: { dni: string; habilitado: boolean; usuarioId?: string }[], vencido = false) {
  await pool.query(`insert into "controlPadronCppp"(id,"validadoEn","vigenteHasta") values(
    1, statement_timestamp()-interval '2 days', statement_timestamp()+$1::interval)`, [vencido ? '-1 day' : '1 day']);
  contexto.after(async () => {
    await pool.query('delete from "padronCppp" where dni=any($1::varchar[])', [afiliados.map(afiliado => afiliado.dni)]);
    await pool.query('delete from "controlPadronCppp" where id=1');
  });
  for (const afiliado of afiliados) {
    await pool.query(`insert into "padronCppp"(dni, habilitado, "usuarioIdVerificado") values ($1,$2,$3)`,
      [afiliado.dni, afiliado.habilitado, afiliado.usuarioId ?? null]);
  }
}

test('HU43-01: el administrador guarda ambos precios y el catálogo los lee', async () => {
  const alta = await altaCurso({ precioGeneral: 69.29 });
  assert.equal(alta.statusCode, 201, alta.body);
  const curso = alta.json();
  assert.equal(curso.costo, 42.35);
  assert.equal(curso.precioGeneral, 69.29);
  assert.equal((await pedir('POST', `/api/cursos/${curso.id}/publicar`, {}, administrador)).statusCode, 200);
  assert.equal((await pedir('GET', `/api/publico/cursos/${curso.id}`)).json().precioGeneral, 69.29);

  const cobro = { modalidadCobro: 'PREVIO', costo: 42.35, precioGeneral: 42.35, plazoPagoMinutos: 60, versionCobro: curso.versionCobro };
  const cambio = await pedir('PATCH', `/api/cursos/${curso.id}/cobro`, cobro, administrador);
  assert.equal(cambio.statusCode, 200, cambio.body);
  assert.equal(cambio.json().precioGeneral, 42.35);
  assert.equal(cambio.json().versionCobro, curso.versionCobro + 1);
  assert.equal((await pedir('PATCH', `/api/cursos/${curso.id}/cobro`, cobro, administrador)).statusCode, 409);
});

test('HU43-01: el precio general respeta la modalidad y la omisión histórica', async () => {
  for (const precioGeneral of [0, -1, 20.001]) {
    const alta = await altaCurso({ precioGeneral });
    assert.equal(alta.statusCode, 422);
    assert.ok(alta.json().fields.precioGeneral);
  }
  assert.equal((await altaCurso({ modalidadCobro: 'GRATUITO', costo: 0, plazoPagoMinutos: null, precioGeneral: 1 })).statusCode, 422);
  const gratis = await altaCurso({ modalidadCobro: 'GRATUITO', costo: 0, plazoPagoMinutos: null, precioGeneral: 0 });
  assert.equal(gratis.statusCode, 201, gratis.body);
  assert.equal(gratis.json().precioGeneral, 0);
  const anterior = await altaCurso();
  assert.equal(anterior.statusCode, 201, anterior.body);
  assert.equal(anterior.json().precioGeneral, null);
});

test('HU43-02: no se cotiza la inscripción con el padrón sin cargar', async (contexto) => {
  const curso = await publicar({ precioGeneral: 69.29 });
  const persona = await docente('externo', '55004301');
  const ruta = `/api/cursos/${curso.id}`;
  const apagado = await pedir('GET', ruta, undefined, persona.token);
  assert.equal(apagado.statusCode, 200);
  assert.equal(apagado.json().miPrecio, undefined);
  activar(contexto);
  const detalle = await pedir('GET', ruta, undefined, persona.token);
  assert.equal(detalle.statusCode, 200, detalle.body);
  assert.equal(detalle.json().impedimentoInscripcion?.codigo, 'PADRON_NO_DISPONIBLE');
  const sinDni = await docente('sin-dni', null);
  assert.equal((await pedir('GET', ruta, undefined, sinDni.token)).json().impedimentoInscripcion?.codigo, 'DNI_REQUERIDO');
});

test('HU43-02: el titular ve la tarifa asignada y se protege el padrón', async (contexto) => {
  activar(contexto);
  const externa = await docente('externo', '55004301');
  const colegiado = await docente('colegiado', '55004302');
  const noVerificado = await docente('no-verificado', '55004303');
  const inhabilitado = await docente('inhabilitado', '55004304');
  await cargarPadron(contexto, [
    { dni: '55004302', habilitado: true, usuarioId: colegiado.id },
    { dni: '55004303', habilitado: true },
    { dni: '55004304', habilitado: false, usuarioId: inhabilitado.id },
  ]);
  const curso = await publicar({ precioGeneral: 69.29 });
  const ruta = `/api/cursos/${curso.id}`;
  const externaDetalle = await pedir('GET', ruta, undefined, externa.token);
  assert.deepEqual(externaDetalle.json().miPrecio, { tipo: 'GENERAL', importe: 69.29, dniParcial: '•••• 4301', enPadron: false });
  assert.deepEqual((await pedir('GET', ruta, undefined, colegiado.token)).json().miPrecio,
    { tipo: 'COLEGIADO', importe: 42.35, dniParcial: '•••• 4302', enPadron: true });
  assert.equal((await pedir('GET', ruta, undefined, noVerificado.token)).json().impedimentoInscripcion.codigo, 'AFILIACION_NO_VERIFICADA');
  assert.equal((await pedir('GET', ruta, undefined, inhabilitado.token)).json().impedimentoInscripcion.codigo, 'AFILIACION_INHABILITADA');
  const publico = await pedir('GET', `/api/publico/cursos/${curso.id}`);
  assert.equal(publico.json().admiteExternos, true);
  assert.equal(publico.json().miPrecio, undefined);
  assert.doesNotMatch(publico.body, /5500430[1-4]/);
  assert.equal((await pedir('GET', ruta, undefined, administrador)).json().miPrecio, undefined);
  const incompleto = await publicar();
  assert.equal((await pedir('GET', `/api/cursos/${incompleto.id}`, undefined, externa.token)).json().impedimentoInscripcion.codigo, 'PRECIO_GENERAL_NO_CONFIGURADO');
});

test('HU43-03: la reserva y la deuda congelan la tarifa elegida en una sola inscripción', async (contexto) => {
  activar(contexto);
  const externa = await docente('externo', '55004301');
  const colegiado = await docente('colegiado', '55004302');
  await cargarPadron(contexto, [{ dni: '55004302', habilitado: true, usuarioId: colegiado.id }]);
  const curso = await publicar({ precioGeneral: 69.29 });
  const ruta = `/api/cursos/${curso.id}/inscribirme`;
  const versionCobro = curso.versionCobro;
  assert.equal((await pedir('POST', ruta, { versionCobro, tipoPrecio: 'COLEGIADO' }, externa.token)).statusCode, 409);
  const generales = await Promise.all([externa, externa].map(persona =>
    pedir('POST', ruta, { versionCobro, tipoPrecio: 'GENERAL' }, persona.token)));
  assert.deepEqual(generales.map(item => item.statusCode).sort(), [200, 201]);
  assert.equal(generales[0]!.json().pagoId, generales[1]!.json().pagoId);
  const miembro = await pedir('POST', ruta, { versionCobro, tipoPrecio: 'COLEGIADO' }, colegiado.token);
  assert.equal(miembro.statusCode, 201, miembro.body);
  const { rows } = await pool.query(`select t."tipoPrecio",t."importeCentimos"::int as intento,
    p."importeCentimos"::int as deuda from "intentosInscripcion" t join "obligacionesPago" p on p.id=t."pagoId"
    where t."cursoId"=$1 order by t."tipoPrecio"`, [curso.id]);
  assert.deepEqual(rows, [{ tipoPrecio: 'COLEGIADO', intento: 4235, deuda: 4235 }, { tipoPrecio: 'GENERAL', intento: 6929, deuda: 6929 }]);
  const cambio = await pedir('PATCH', `/api/cursos/${curso.id}/cobro`, {
    modalidadCobro: 'PREVIO', costo: 50, precioGeneral: 100, plazoPagoMinutos: 60, versionCobro,
  }, administrador);
  assert.equal(cambio.statusCode, 200, cambio.body);
  const otroExterno = await docente('otro-externo', '55004305');
  const desactualizado = await pedir('POST', ruta, { versionCobro, tipoPrecio: 'GENERAL' }, otroExterno.token);
  assert.equal(desactualizado.statusCode, 409);
  assert.equal(desactualizado.json().code, 'COBRO_MODIFICADO');
  const detalle = await pedir('GET', `/api/cursos/${curso.id}`, undefined, externa.token);
  assert.equal(detalle.json().miPrecio.importe, 69.29);
  assert.equal(detalle.json().miPrecio.tipo, 'GENERAL');
});

test('HU43-03: una clasificación que cambia, un padrón vencido y un afiliado inhabilitado bloquean el cobro', async (contexto) => {
  activar(contexto);
  const persona = await docente('colegiado', '55004302');
  await cargarPadron(contexto, [{ dni: '55004302', habilitado: true, usuarioId: persona.id }]);
  const curso = await publicar({ precioGeneral: 69.29 });
  const ruta = `/api/cursos/${curso.id}/inscribirme`;
  const confirmar = () => pedir('POST', ruta, { versionCobro: curso.versionCobro, tipoPrecio: 'COLEGIADO' }, persona.token);
  await pool.query('update "padronCppp" set habilitado=false where dni=$1', ['55004302']);
  assert.equal((await confirmar()).json().code, 'AFILIACION_INHABILITADA');
  await pool.query(`update "controlPadronCppp" set "vigenteHasta"=statement_timestamp()-interval '1 day' where id=1`);
  const vencido = await confirmar();
  assert.equal(vencido.statusCode, 503);
  assert.equal(vencido.json().code, 'PADRON_NO_DISPONIBLE');
  assert.equal((await pool.query('select 1 from "intentosInscripcion" where "cursoId"=$1', [curso.id])).rowCount, 0);
});

test('HU43-03: la tarifa general por constancia conserva el importe al cerrar el curso', async (contexto) => {
  activar(contexto);
  const externa = await docente('externo', '55004301');
  await cargarPadron(contexto, [{ dni: '55004302', habilitado: true }]);
  const curso = await publicar({ modalidadCobro: 'CERTIFICADO', precioGeneral: 69.29, plazoPagoMinutos: null });
  const alta = await pedir('POST', `/api/cursos/${curso.id}/inscribirme`, { versionCobro: curso.versionCobro, tipoPrecio: 'GENERAL' }, externa.token);
  assert.equal(alta.statusCode, 201, alta.body);
  assert.equal(alta.json().pagoId, null);
  await pool.query(`insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)
    values($1,'Elegibilidad HU43',$2,current_date-1,'08:00','09:00','Sala')`, [curso.id, instructorId]);
  const cambio = await pedir('PATCH', `/api/cursos/${curso.id}/cobro`, {
    modalidadCobro: 'CERTIFICADO', costo: 50, precioGeneral: 100, plazoPagoMinutos: null, versionCobro: curso.versionCobro,
  }, administrador);
  assert.equal(cambio.statusCode, 200, cambio.body);
  const cierre = await pedir('POST', `/api/cursos/${curso.id}/cerrar`, {
    excepciones: [{ agremiadoId: externa.id, motivo: 'Elegibilidad documentada en el expediente de prueba.' }],
  }, administrador);
  assert.equal(cierre.statusCode, 200, cierre.body);
  assert.equal(cierre.json().retenidos, 1);
  const { rows } = await pool.query(`select concepto,"importeCentimos"::int as importe
    from "obligacionesPago" where "cursoId"=$1`, [curso.id]);
  assert.deepEqual(rows, [{ concepto: 'CONSTANCIA', importe: 6929 }]);
});
