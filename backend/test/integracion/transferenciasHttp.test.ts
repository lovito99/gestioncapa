import assert from 'node:assert/strict';
import { before,after,test,mock } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/shared/database.js';
import { redis } from '../../src/shared/redis.js';
import { migrar } from '../../src/shared/migraciones.js';
import { vencerReservas } from '../../src/repositories/cursos/inscripcionesRepository.js';
import { crearPdfTexto } from '../../src/shared/pdf.js';

const voucher={tipo:'application/pdf',contenidoBase64:crearPdfTexto('Voucher ficticio',['Solo pruebas locales.']).toString('base64')};

let app:FastifyInstance;
const usuarios=new Map<string,{id:string;token:string}>();
const llamar=(actor:string|null,method:'GET'|'POST',url:string,payload?:object)=>app.inject({method,url,
  headers:actor?{authorization:`Bearer ${usuarios.get(actor)!.token}`}:{},...(payload?{payload}:{})});
const configuracionAnterior={...env};
before(async()=>{
  await migrar(pool);app=await buildApp();
  for(const [nombre,role] of [['admin','admin'],['alumno','agremiado'],['otro','agremiado'],['docente','instructor']]) {
    const persona=(await pool.query(`insert into users(name,email,password_hash,role) values($1,$2,'sin-acceso',$3) returning id::text`,[nombre,`t25-${randomUUID()}@prueba.local`,role])).rows[0];
    usuarios.set(nombre!,{id:persona.id,token:app.jwt.sign({sub:persona.id})});
  }
  Object.assign(env,{transferenciaHabilitada:true,transferenciaBanco:'BANCO PRUEBA',transferenciaTitular:'Entidad de prueba',transferenciaCuenta:'1234567890123',transferenciaCci:'00212345678901234567'});
});
after(async()=>{
  try {
    await pool.query('delete from "intentosInscripcion" where "cursoId" in (select id from cursos where creador_id=$1)',[usuarios.get('admin')?.id]);
    for(const tabla of ['transferenciasPago','destinosTransferencia','incidenciasPago','auditoriaPagos','hechosPago','operacionesPago','obligacionesPago']) {
      const pagos='select p.id from "obligacionesPago" p join cursos c on c.id=p."cursoId" where c.creador_id=$1';
      const filtro=tabla==='transferenciasPago'?`"operacionId" in (select id from "operacionesPago" where "pagoId" in (${pagos}))`:
        tabla==='obligacionesPago'?'"cursoId" in (select id from cursos where creador_id=$1)':`"pagoId" in (${pagos})`;
      await pool.query(`delete from "${tabla}" where ${filtro}`,[usuarios.get('admin')?.id]);
    }
    await pool.query('delete from cursos where creador_id=$1',[usuarios.get('admin')?.id]);
    await pool.query('delete from users where id=any($1::bigint[])',[[...usuarios.values()].map(persona=>persona.id)]);
  } finally { Object.assign(env,configuracionAnterior);await app?.close();await pool.end();redis.disconnect(); }
});
async function preparar() {
  const curso=await llamar('admin','POST','/api/cursos',{titulo:'Transferencia HTTP',instructorId:usuarios.get('docente')!.id,
    horasLectivas:24,modalidad:'PRESENCIAL',costo:150.50,modalidadCobro:'PREVIO',plazoPagoMinutos:60,cupos:1,tipoCertificado:'PARTICIPACION',modulos:[{titulo:'Contenido privado'}]});
  assert.equal(curso.statusCode,201,curso.body);const cursoId=curso.json().id;
  await llamar('admin','POST',`/api/cursos/${cursoId}/publicar`);
  const alta=await llamar('alumno','POST',`/api/cursos/${cursoId}/inscribirme`,{versionCobro:1});
  assert.equal(alta.statusCode,201,alta.body);
  const pagoId=alta.json().pagoId as string;
  const consulta=await llamar('alumno','GET',`/api/pagos/${pagoId}`);
  assert.equal(consulta.statusCode,200,consulta.body);
  return {cursoId,pagoId,destinoId:consulta.json().destinoTransferencia?.id as string,
    referencia:`ABONO-${randomUUID()}`,fechaOperacion:'2026-01-01'};
}
async function declarar(caso:Awaited<ReturnType<typeof preparar>>) {
  const {destinoId,referencia,fechaOperacion}=caso;
  const respuesta=await llamar('alumno','POST',`/api/pagos/${caso.pagoId}/transferencias`,{destinoId,referencia,fechaOperacion,clave:randomUUID(),voucher});
  assert.equal(respuesta.statusCode,201,respuesta.body);
  return respuesta.json().operacionId as string;
}
const confirmar=(caso:Awaited<ReturnType<typeof preparar>>)=>({decision:'CONFIRMAR',referencia:caso.referencia,fechaOperacion:caso.fechaOperacion,importeCentimos:15050,moneda:'PEN',verificado:true});

test('T25-I01: solo Izipay se ofrece para nuevos cobros, Culqi conserva su conciliación histórica',async()=>{
  const caso=await preparar();
  const ruta=`/api/pagos/${caso.pagoId}`;
  env.culqiHabilitado=true;
  try {
    const consulta=await llamar('alumno','GET',ruta);
    assert.equal(consulta.json().medios.culqi,false);
    assert.equal((await llamar('alumno','POST',`${ruta}/intentos`,{medio:'CULQI',clave:randomUUID(),token:'tkn_test_legacy'})).statusCode,503);
  } finally {env.culqiHabilitado=false;}
});

test('T25-I02/04: privacidad, destino persistido y permisos reales; declarar no habilita acceso',async()=>{
  const caso=await preparar();const ruta=`/api/pagos/${caso.pagoId}`;
  assert.ok(caso.destinoId);
  assert.equal((await llamar(null,'GET',ruta)).statusCode,401);
  assert.equal((await llamar('otro','GET',ruta)).statusCode,403);
  const entrada={destinoId:caso.destinoId,referencia:caso.referencia,fechaOperacion:caso.fechaOperacion,clave:randomUUID(),voucher};
  assert.equal((await llamar('otro','POST',`${ruta}/transferencias`,entrada)).statusCode,403);
  assert.equal((await llamar('docente','POST',`${ruta}/transferencias`,entrada)).statusCode,403);
  assert.equal((await llamar('alumno','POST',`${ruta}/transferencias`,{...entrada,fechaOperacion:'2999-01-01'})).statusCode,422);
  const op=await declarar(caso);
  const consulta=await llamar('alumno','GET',ruta);
  assert.equal(consulta.headers['cache-control'],'private, no-store');
  assert.equal(consulta.json().estado,'PENDIENTE');assert.equal(consulta.json().transferencias[0].operacionId,op);
  assert.equal((await llamar('alumno','GET',`/api/cursos/${caso.cursoId}`)).json().estadoInscripcion,'PENDIENTE_PAGO');
  assert.equal((await llamar('admin','POST',`${ruta}/efectivo`,{referencia:'CAJA-BLOQUEADA',importeCentimos:15050,fechaRecepcion:'2026-01-01'})).statusCode,409);
});

test('T25-I05/06: ADMIN confirma y aplica el acceso; rechaza roles y recepción no verificada',async()=>{
  const caso=await preparar();const operacionId=await declarar(caso);
  const ruta=`/api/pagos/${caso.pagoId}/transferencias/${operacionId}/revision`;
  assert.equal((await llamar('alumno','POST',ruta,confirmar(caso))).statusCode,403);
  assert.equal((await llamar('docente','POST',ruta,confirmar(caso))).statusCode,403);
  assert.equal((await llamar('admin','POST',ruta,{...confirmar(caso),verificado:false})).statusCode,422);
  assert.equal((await llamar('admin','POST',ruta,{...confirmar(caso),importeCentimos:1})).statusCode,409);
  const respuesta=await llamar('admin','POST',ruta,confirmar(caso));
  assert.equal(respuesta.statusCode,200,respuesta.body);
  assert.equal((await llamar('alumno','GET',`/api/cursos/${caso.cursoId}`)).json().estadoInscripcion,'EN_CURSO');
  assert.equal((await llamar('admin','POST',ruta,confirmar(caso))).statusCode,200);
});

test('T25-I07: declaración y confirmación tardías conservan el abono sin recuperar el último cupo',async()=>{
  const caso=await preparar();
  await pool.query(`update "intentosInscripcion" set "venceEn"=clock_timestamp()-interval '1 second' where "pagoId"=$1`,[caso.pagoId]);
  await vencerReservas();
  assert.equal((await llamar('otro','POST',`/api/cursos/${caso.cursoId}/inscribirme`,{versionCobro:1})).statusCode,201);
  const operacionId=await declarar(caso);
  const respuesta=await llamar('admin','POST',`/api/pagos/${caso.pagoId}/transferencias/${operacionId}/revision`,confirmar(caso));
  assert.equal(respuesta.statusCode,200,respuesta.body);
  const pago=(await llamar('alumno','GET',`/api/pagos/${caso.pagoId}`)).json();
  assert.equal(pago.estado,'PAGADO');assert.ok(pago.incidencias.some((incidencia:{motivo:string})=>incidencia.motivo==='TARDIO'));
  assert.equal((await llamar('alumno','GET',`/api/cursos/${caso.cursoId}`)).json().estadoInscripcion,'CANCELADA');
});

test('T25-I02: recargar conserva cuenta ofrecida; deshabilitar no pierde abonos a destinos históricos',async()=>{
  const caso=await preparar();const anterior={...env};
  try {
    Object.assign(env,{transferenciaCuenta:'2222222222222',transferenciaCci:'00222222222222222222'});
    const recarga=(await llamar('alumno','GET',`/api/pagos/${caso.pagoId}`)).json();
    assert.equal(recarga.destinoTransferencia.id,caso.destinoId);
    assert.equal(recarga.destinoTransferencia.cci,anterior.transferenciaCci);
    env.transferenciaHabilitada=false;
    const historico=(await llamar('alumno','GET',`/api/pagos/${caso.pagoId}`)).json();
    assert.equal(historico.medios.transferencia,false);assert.equal(historico.destinoTransferencia.id,caso.destinoId);
    const nueva=await preparar();assert.equal(nueva.destinoId,undefined);
    assert.equal((await llamar('alumno','POST',`/api/pagos/${nueva.pagoId}/transferencias`,{destinoId:caso.destinoId,referencia:'AJENA',fechaOperacion:'2026-01-01',clave:randomUUID()})).statusCode,422);
    assert.ok(await declarar(caso));
  } finally {Object.assign(env,anterior);}
});

test('T25-I05: carreras entre cursos no reutilizan abono y la confirmación original sigue idempotente',async()=>{
  const casos=await Promise.all([preparar(),preparar()]);
  const referencia=`ABONO-COMPARTIDO-${randomUUID()}`;
  casos.forEach(caso=>{caso.referencia=referencia});
  const respuestas=await Promise.all(casos.map(caso=>llamar('alumno','POST',`/api/pagos/${caso.pagoId}/transferencias`,{destinoId:caso.destinoId,referencia,fechaOperacion:caso.fechaOperacion,clave:randomUUID(),voucher})));
  assert.deepEqual(respuestas.map(respuesta=>respuesta.statusCode).sort(),[201,409]);
  const ganador=respuestas.findIndex(respuesta=>respuesta.statusCode===201);
  const operacionId=respuestas[ganador]!.json().operacionId;
  const ruta=`/api/pagos/${casos[ganador]!.pagoId}/transferencias/${operacionId}/revision`;
  assert.equal((await llamar('admin','POST',ruta,confirmar(casos[ganador]!))).statusCode,200);
  assert.equal((await llamar('admin','POST',ruta,confirmar(casos[ganador]!))).statusCode,200);
  const perdedor=casos[1-ganador]!;
  assert.equal((await pool.query('select 1 from "operacionesPago" where "pagoId"=$1',[perdedor.pagoId])).rowCount,0);
});

test('T25-I04: no entrega sesión Izipay recuperada ni nueva si ya se declaró transferencia',async()=>{
  const anterior={...env,izipayComisionTarjeta:env.izipayComisionTarjeta};
  Object.assign(env,{izipayHabilitado:true,izipayComisionTarjeta:0,izipayCodigoComercio:'PRUEBA',izipayClavePublica:'clave-publica-prueba',izipayRsaPublica:'rsa-publica-solo-prueba',pagosUrlPublica:'https://comercio.example'});
  async function cotizar(ruta: string) {
    const [opcion] = (await llamar('alumno','GET',ruta)).json().opcionesEnLinea;
    return { medio: 'IZIPAY', clave: randomUUID(), instrumento: 'TARJETA', cotizacion: opcion.cotizacion };
  }
  let durante:Awaited<ReturnType<typeof preparar>>|undefined;
  const llamada=mock.method(globalThis,'fetch',async()=>{
    if(durante) await declarar(durante);
    return new Response(JSON.stringify({code:'00',response:{token:'token-ficticio-solo-pruebas'}}),{status:200});
  });
  try {
    const caso=await preparar();const ruta=`/api/pagos/${caso.pagoId}`;const entrada=await cotizar(ruta);
    const intento = (await llamar('alumno','POST',`${ruta}/intentos`,entrada)).json();
    assert.ok(intento.izipay);
    await declarar(caso);
    assert.equal((await llamar('alumno','GET',ruta)).json().operaciones.find((op:{medio:string})=>op.medio==='IZIPAY').sesionRecuperable,false);
    assert.equal((await llamar('alumno','POST',`${ruta}/intentos`,entrada)).json().izipay,undefined);
    assert.equal((await llamar('alumno','POST',`${ruta}/intentos/${intento.operacionId}/sesion`)).json().sesion,undefined);
    durante=await preparar();
    const rutaDurante = `/api/pagos/${durante.pagoId}`;
    const respuesta=await llamar('alumno','POST',`${rutaDurante}/intentos`,await cotizar(rutaDurante));
    assert.equal(respuesta.statusCode,200,respuesta.body);assert.equal(respuesta.json().izipay,undefined);
  } finally {llamada.mock.restore();Object.assign(env,anterior);}
});
