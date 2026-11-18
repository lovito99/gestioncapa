import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { buildApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { redis } from '../../src/shared/redis.js';

let app: FastifyInstance;
const personas = new Map<string, { id: string; token: string }>();
const clave = randomUUID();

before(async () => {
  await migrar(pool);
  app = await buildApp();
  for (const [nombre, rol] of [['admin', 'admin'], ['docente', 'instructor'], ['otro', 'instructor'], ['colegiado', 'agremiado']] as const) {
    const { rows: [persona] } = await pool.query<{ id: string }>(
      'insert into users(name,email,password_hash,role) values($1,$2,$3,$4) returning id::text',
      [nombre, `hu51-${clave}-${nombre}@prueba.local`, 'sin-clave', rol],
    );
    personas.set(nombre, { id: persona!.id, token: app.jwt.sign({ sub: persona!.id }) });
  }
});

after(async () => {
  if (personas.has('admin')) await pool.query('delete from cursos where creador_id=$1', [personas.get('admin')!.id]);
  await pool.query('delete from users where id=any($1::bigint[])', [[...personas.values()].map(persona => persona.id)]);
  await app?.close();
  await pool.end();
  redis.disconnect();
});

const pedir = (persona: string | null, method: 'GET' | 'PUT' | 'DELETE' | 'POST' | 'HEAD', url: string, payload?: object) =>
  app.inject({ url, method, ...(payload ? { payload } : {}), headers: persona ? { authorization: `Bearer ${personas.get(persona)!.token}` } : {} });

function datosCurso(otros: object = {}) {
  return {
    titulo: 'Portada HU-51 ' + clave, instructorId: personas.get('docente')!.id, horasLectivas: 12,
    modalidad: 'PRESENCIAL', costo: 0, cupos: 9, categoria: 'Tecnología',
    tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Módulo único' }], ...otros,
  };
}

async function imagen(fondo = '#27859c') {
  const png = await sharp({
    create: { width: 1600, height: 900, channels: 3, background: fondo },
  }).png().toBuffer();
  return { nombre: 'portada.png', tipo: 'image/png', contenidoBase64: png.toString('base64') };
}

async function crear(otros: object = {}) {
  const respuesta = await pedir('admin', 'POST', '/api/cursos', datosCurso(otros));
  assert.equal(respuesta.statusCode, 201, respuesta.body);
  return respuesta.json();
}

test('edita una portada con autorización por rol y por curso, incluso tras reiniciar', async () => {
  const curso = await crear();
  const ruta = `/api/cursos/${curso.id}/portada`;
  const portada = await imagen();
  assert.equal((await pedir(null, 'PUT', ruta, portada)).statusCode, 401);
  for (const persona of ['colegiado', 'docente', 'otro']) {
    assert.equal((await pedir(persona, 'PUT', ruta, portada)).statusCode, 403);
    assert.equal((await pedir(persona, 'DELETE', ruta)).statusCode, 403);
  }
  const cambio = await pedir('admin', 'PUT', ruta, portada);
  assert.equal(cambio.statusCode, 200, cambio.body);
  assert.match(cambio.json().portadaUrl, new RegExp(`^${ruta}`));

  const archivo = await pedir('admin', 'GET', ruta);
  assert.equal(archivo.statusCode, 200);
  assert.equal(archivo.headers['content-type'], 'image/jpeg');
  assert.equal(archivo.headers['cache-control'], 'private, no-store');
  assert.equal((await pedir('docente', 'GET', ruta)).statusCode, 200);
  assert.equal((await pedir('otro', 'GET', ruta)).statusCode, 403);
  assert.equal((await pedir('colegiado', 'GET', ruta)).statusCode, 403);
  assert.equal((await pedir(null, 'GET', ruta)).statusCode, 401);
  assert.equal((await pedir('admin', 'GET', '/api/cursos/0/portada')).statusCode, 404);

  await app.close();
  app = await buildApp();
  assert.deepEqual((await pedir('admin', 'GET', ruta)).rawPayload, archivo.rawPayload);
  const rechazo = await pedir('admin', 'PUT', ruta, { ...portada, tipo: 'image/webp' });
  assert.equal(rechazo.statusCode, 422);
  assert.ok(rechazo.json().fields.portada);
  assert.deepEqual((await pedir('admin', 'GET', ruta)).rawPayload, archivo.rawPayload);

  assert.equal((await pedir('admin', 'DELETE', ruta)).statusCode, 204);
  assert.equal((await pedir('admin', 'DELETE', ruta)).statusCode, 204);
  assert.equal((await pedir('admin', 'GET', ruta)).statusCode, 404);
});

test('dos reemplazos concurrentes dejan una portada completa', async () => {
  const curso = await crear();
  const ruta = `/api/cursos/${curso.id}/portada`;
  const [azul, rojo] = await Promise.all([imagen(), imagen('#a34433')]);
  const cambios = await Promise.all([pedir('admin', 'PUT', ruta, azul), pedir('admin', 'PUT', ruta, rojo)]);
  assert.deepEqual(cambios.map(cambio => cambio.statusCode), [200, 200]);
  const archivo = await pedir('admin', 'GET', ruta);
  assert.equal(archivo.statusCode, 200);
  const pixeles = await sharp(archivo.rawPayload).raw().toBuffer();
  const rojoDominante = pixeles[0]! > pixeles[2]!;
  for (let indice = 0; indice < pixeles.length; indice += 3) {
    assert.equal(pixeles[indice]! > pixeles[indice + 2]!, rojoDominante);
  }
});

test('crea curso y portada juntos y no deja borradores al rechazar el archivo', async () => {
  const cantidad = async () => (await pool.query<{ total: number }>(
    'select count(*)::int as total from cursos where creador_id=$1', [personas.get('admin')!.id],
  )).rows[0]!.total;
  const antes = await cantidad();
  const portada = await imagen();
  const invalida = await pedir('admin', 'POST', '/api/cursos', datosCurso({ portada: { ...portada, tipo: 'image/webp' } }));
  assert.equal(invalida.statusCode, 422);
  assert.ok(invalida.json().fields.portada);
  assert.equal(await cantidad(), antes);

  const borrador = await crear({ portada });
  assert.match(borrador.portadaUrl, new RegExp(`^/api/cursos/${borrador.id}/portada\\?v=`));
  assert.equal(borrador.estado, 'BORRADOR');
  assert.equal(await cantidad(), antes + 1);
  assert.equal((await pedir('admin', 'GET', borrador.portadaUrl)).statusCode, 200);
  assert.equal((await crear()).portadaUrl, null);
});

test('sirve la portada vigente solo de cursos publicados y la anuncia en catálogos y detalle', async () => {
  const curso = await crear({ portada: await imagen() });
  const cambiarEstado = (estado: string) => pool.query('update cursos set estado=$2 where id=$1', [curso.id, estado]);
  const version = new URL(curso.portadaUrl, 'http://local').searchParams.get('v')!;
  const publica = (variante: string, vigente = version) => `/api/publico/cursos/${curso.id}/portada/${vigente}/${variante}`;

  const oculta = await pedir(null, 'GET', publica('tarjeta'));
  assert.equal(oculta.statusCode, 404);
  assert.doesNotMatch(oculta.body, new RegExp(clave));

  await cambiarEstado('PUBLICADO');
  const fuentes = [{ url: publica('miniatura'), ancho: 352 }, { url: publica('tarjeta'), ancho: 704 }];
  const buscar = `?buscar=${encodeURIComponent(clave)}`;
  const listados = [
    (await pedir(null, 'GET', `/api/publico/cursos${buscar}`)).json().items,
    (await pedir('colegiado', 'GET', `/api/catalogo/cursos/pagina${buscar}`)).json().items,
    (await pedir('colegiado', 'GET', '/api/catalogo/cursos')).json(),
  ];
  for (const items of listados) {
    const item = items.find((otro: { id: string }) => otro.id === curso.id);
    assert.equal(item.portadaUrl, publica('grande'));
    assert.deepEqual(item.portadaFuentes, fuentes);
    assert.equal(item.portadaDatos, undefined);
  }
  assert.equal((await pedir('colegiado', 'GET', `/api/cursos/${curso.id}`)).json().portadaUrl, publica('grande'));
  assert.equal((await pedir(null, 'GET', `/api/publico/cursos/${curso.id}`)).json().portadaUrl, publica('grande'));
  const { vistaPrevia } = (await pedir(null, 'GET', `/api/publico/cursos/${curso.id}/compartir`)).json();
  assert.deepEqual(vistaPrevia.imagen, { url: new URL(publica('grande'), env.catalogoOrigenPublico ?? env.FRONTEND_URL).href, ancho: 1280, alto: 720, tipo: 'image/jpeg' });

  for (const [variante, tipo, ancho] of [['miniatura', 'image/webp', 352], ['tarjeta', 'image/webp', 704], ['grande', 'image/jpeg', 1280]] as const) {
    const archivo = await pedir(null, 'GET', publica(variante));
    assert.equal(archivo.statusCode, 200, variante);
    assert.equal(archivo.headers['content-type'], tipo);
    assert.equal(archivo.headers['x-content-type-options'], 'nosniff');
    assert.equal(archivo.headers['cache-control'], 'public, no-cache');
    assert.equal((await sharp(archivo.rawPayload).metadata()).width, ancho);
    const repetida = await app.inject({ url: publica(variante), headers: { 'if-none-match': String(archivo.headers.etag) } });
    assert.equal(repetida.statusCode, 304);
  }
  for (const ruta of [publica('original'), publica('grande', 'a'.repeat(64)), publica('grande', '../x'), `/api/publico/cursos/0/portada/${version}/grande`]) {
    assert.equal((await pedir(null, 'GET', ruta)).statusCode, 404, ruta);
  }

  const reemplazo = await pedir('admin', 'PUT', `/api/cursos/${curso.id}/portada`, await imagen('#a34433'));
  assert.equal(reemplazo.statusCode, 200);
  assert.equal((await pedir(null, 'GET', publica('grande'))).statusCode, 404);
  const nueva = new URL(reemplazo.json().portadaUrl, 'http://local').searchParams.get('v')!;
  assert.equal((await pedir(null, 'GET', publica('grande', nueva))).statusCode, 200);

  await cambiarEstado('CERRADO');
  assert.equal((await pedir(null, 'GET', publica('grande', nueva))).statusCode, 404);
  await cambiarEstado('PUBLICADO');
  assert.equal((await pedir('admin', 'DELETE', `/api/cursos/${curso.id}/portada`)).statusCode, 204);
  assert.equal((await pedir(null, 'GET', publica('grande', nueva))).statusCode, 404);
  const sinPortada = (await pedir(null, 'GET', `/api/publico/cursos${buscar}`)).json().items.find((otro: { id: string }) => otro.id === curso.id);
  assert.equal(sinPortada.portadaUrl, null);
  assert.equal(sinPortada.portadaFuentes, undefined);
});
