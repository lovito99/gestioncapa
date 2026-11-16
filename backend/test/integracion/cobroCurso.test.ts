import assert from 'node:assert/strict';
import { before, after, test, mock } from 'node:test';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/shared/database.js';
import { redis } from '../../src/shared/redis.js';
import { migrar } from '../../src/shared/migraciones.js';
import type { FastifyInstance } from 'fastify';
import { crearObligacion,obtenerPago } from '../../src/modules/pagos/pagos.repositorio.js';
import { iniciarPago } from '../../src/modules/pagos/pagos.servicio.js';
import { randomUUID, createHmac } from 'node:crypto';
import { env } from '../../src/config/env.js';
import { iniciarOperacion } from '../../src/modules/pagos/pagos.repositorio.js';
import { estaInscrito } from '../../src/modules/asistencia/asistencia.repositorio.js';
import { inscribir } from '../../src/modules/clases/clases.repositorio.js';
import { liberarRetenidas } from '../../src/modules/certificados/certificados.repositorio.js';
import { recuperarOperaciones } from '../../src/modules/pagos/pagos.procesador.js';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { iniciarProcesosCobro } from '../../src/cobro.procesos.js';
import { vencerReservas } from '../../src/modules/cursos/inscripciones.vencimiento.js';

let app: FastifyInstance;
const usuarios = new Map<string, { id: string; token: string }>();
const marca = `hu53-${Date.now()}`;
const llamar = (actor: string | null, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) => app.inject({ method, url,
  headers: actor ? { authorization: `Bearer ${usuarios.get(actor)!.token}` } : {}, ...(payload ? { payload } : {}) });
const datos = (cambios: object = {}) => ({ titulo: 'HU53 cobro', instructorId: usuarios.get('docente')!.id,
  horasLectivas: 24, modalidad: 'PRESENCIAL', costo: 150.50, modalidadCobro: 'PREVIO', plazoPagoMinutos: 60,
  cupos: 1, tipoCertificado: 'PARTICIPACION', modulos: [{ titulo: 'Inicio' }], ...cambios });
async function crear(cambios: object = {}) {
  const respuesta = await llamar('admin', 'POST', '/api/cursos', datos(cambios));
  assert.equal(respuesta.statusCode, 201, respuesta.body);
  return respuesta.json();
}
before(async () => {
  await migrar(pool); app = await buildApp();
  for (const [nombre, role] of [['admin', 'admin'], ['docente', 'instructor'], ['alumno', 'agremiado'], ['otro', 'agremiado']]) {
    const persona = (await pool.query<{ id: string }>("insert into users(name,email,password_hash,role) values($1,$2,'sin-acceso',$3) returning id::text", [nombre, `${marca}-${nombre}@prueba.local`, role])).rows[0]!;
    usuarios.set(nombre!, { id: persona.id, token: app.jwt.sign({ sub: persona.id }) });
  }
});
after(async () => {
  try {
  if ((await pool.query('select to_regclass(\'"entregasConstancia"\') as tabla')).rows[0].tabla) await pool.query('delete from "entregasConstancia" where "cursoId" in (select id from cursos where creador_id=$1)',[usuarios.get('admin')?.id]);
  const reunionesPropias='select r.identificador from reuniones r join classes cl on cl.id=r."claseIdentificador" join cursos c on c.id=cl.curso_id where c.creador_id=$1';
  for (const tabla of ['notificacionesReunion','participantesReunion']) await pool.query(`delete from "${tabla}" where "reunionIdentificador" in (${reunionesPropias})`,[usuarios.get('admin')?.id]);
  await pool.query(`delete from reuniones where identificador in (${reunionesPropias})`,[usuarios.get('admin')?.id]);
  await pool.query('delete from classes where curso_id in (select id from cursos where creador_id=$1)',[usuarios.get('admin')?.id]);
  await pool.query('delete from "intentosInscripcion" where "cursoId" in (select id from cursos where creador_id=$1)',[usuarios.get('admin')?.id]);
  for (const tabla of ['incidenciasPago','auditoriaPagos','hechosPago','operacionesPago','obligacionesPago']) {
    const filtro = tabla === 'obligacionesPago' ? '"cursoId" in (select id from cursos where creador_id=$1)' : '"pagoId" in (select p.id from "obligacionesPago" p join cursos c on c.id=p."cursoId" where c.creador_id=$1)';
    await pool.query(`delete from "${tabla}" where ${filtro}`,[usuarios.get('admin')?.id]);
  }
  await pool.query('delete from cursos where creador_id=$1', [usuarios.get('admin')?.id]);
  await pool.query('delete from users where id=any($1::bigint[])', [[...usuarios.values()].map(p => p.id)]);
  } finally {
  await app?.close(); await pool.end(); redis.disconnect();
  }
});

test('HU53-06/08: consulta privada y registro de efectivo reales; pasarelas sin cuenta no cobran', async () => {
  const curso = await crear();
  const pago = await crearObligacion(pool,{ cursoId:curso.id,usuarioId:Number(usuarios.get('alumno')!.id),intentoId:randomUUID(),concepto:'CURSO',importeCentimos:15050,moneda:'PEN' });
  const ruta = `/api/pagos/${pago.id}`;
  assert.equal((await llamar(null,'GET',ruta)).statusCode,401);
  assert.equal((await llamar('otro','GET',ruta)).statusCode,403);
  const consulta=await llamar('alumno','GET',ruta);
  assert.equal(consulta.statusCode,200,consulta.body);
  assert.equal(consulta.json().importeCentimos,15050);
  assert.equal((await llamar('alumno','POST',`${ruta}/intentos`,{medio:'CULQI',clave:randomUUID(),token:'tkn_test_sinCuenta'})).statusCode,503);
  assert.equal((await llamar('alumno','POST',`${ruta}/efectivo`,{referencia:'CAJA-HTTP',importeCentimos:15050,fechaRecepcion:'2026-01-01'})).statusCode,403);
  assert.equal((await llamar('admin','POST',`${ruta}/efectivo`,{referencia:'CAJA-HTTP',importeCentimos:15050,fechaRecepcion:'2026-01-01'})).statusCode,200);
  assert.equal((await llamar('alumno','GET',ruta)).json().estado,'PAGADO');
});

test('HU53-01: crea las tres modalidades y recupera condiciones persistidas', async () => {
  for (const modalidadCobro of ['PREVIO', 'CERTIFICADO', 'GRATUITO']) {
    const costo = modalidadCobro === 'GRATUITO' ? 0 : 150.50;
    const plazoPagoMinutos = modalidadCobro === 'PREVIO' ? 60 : null;
    const curso = await crear({ modalidadCobro, costo, plazoPagoMinutos });
    const leido = (await llamar('admin', 'GET', `/api/cursos/${curso.id}`)).json();
    assert.equal(leido.modalidadCobro, modalidadCobro);
    assert.equal(leido.plazoPagoMinutos, plazoPagoMinutos);
    assert.equal(leido.costo, costo);
    assert.equal(leido.versionCobro, 1);
  }
});

test('HU53-01: validación real rechaza política incoherente y otros roles', async () => {
  for (const cambio of [{ modalidadCobro: 'GRATUITO' }, { plazoPagoMinutos: null }, { costo: 0 }, { plazoPagoMinutos: -1 }]) {
    assert.equal((await llamar('admin', 'POST', '/api/cursos', datos(cambio))).statusCode, 422);
  }
  assert.equal((await llamar('alumno', 'POST', '/api/cursos', datos())).statusCode, 403);
});

test('HU53-02: edición real de cobro controla permisos y versión', async () => {
  const curso = await crear();
  const ruta = `/api/cursos/${curso.id}/cobro`;
  const cambio = { modalidadCobro: 'CERTIFICADO', costo: 90, plazoPagoMinutos: null, versionCobro: curso.versionCobro };
  assert.equal((await llamar('alumno', 'PATCH', ruta, cambio)).statusCode, 403);
  const respuesta = await llamar('admin', 'PATCH', ruta, cambio);
  assert.equal(respuesta.statusCode, 200, respuesta.body);
  assert.equal(respuesta.json().modalidadCobro, 'CERTIFICADO');
  assert.equal(respuesta.json().versionCobro, 2);
  assert.equal(respuesta.json().titulo, curso.titulo);
  assert.equal((await llamar('admin', 'PATCH', ruta, cambio)).statusCode, 409);
  assert.equal((await llamar('admin', 'GET', `/api/cursos/${curso.id}`)).json().costo, 90);
  await pool.query("update cursos set estado='CERRADO' where id=$1", [curso.id]);
  assert.equal((await llamar('admin', 'PATCH', ruta, { ...cambio, versionCobro: 2 })).statusCode, 409);
});

test('HU53-09/12: reserva congela condiciones y el efectivo confirma el acceso sin segundo cupo', async () => {
  const curso=await crear();
  await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  const ruta=`/api/cursos/${curso.id}/inscribirme`;
  const alta=await llamar('alumno','POST',ruta,{versionCobro:1});
  assert.equal(alta.statusCode,201,alta.body);
  assert.equal(alta.json().estado,'PENDIENTE_PAGO');
  const detalle=(await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json();
  assert.equal(detalle.miInscripcion.importeCentimos,15050);
  assert.equal(new Date(detalle.miInscripcion.venceEn).getTime()-new Date(detalle.miInscripcion.inscritoEn).getTime(),60*60000);
  const repetida=await llamar('alumno','POST',ruta,{versionCobro:1});
  assert.equal(repetida.json().intentoId,alta.json().intentoId);
  await llamar('admin','PATCH',`/api/cursos/${curso.id}/cobro`,{modalidadCobro:'CERTIFICADO',costo:20,plazoPagoMinutos:null,versionCobro:1});
  const previo=(await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().miInscripcion;
  assert.equal(previo.modalidadCobro,'PREVIO'); assert.equal(previo.importeCentimos,15050);
  const pago=await llamar('admin','POST',`/api/pagos/${previo.pagoId}/efectivo`,{referencia:`CAJA-${curso.id}`,importeCentimos:15050,fechaRecepcion:'2026-01-01'});
  assert.equal(pago.statusCode,200,pago.body);
  const confirmado=(await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json();
  assert.equal(confirmado.estadoInscripcion,'EN_CURSO');
  assert.equal(confirmado.cuposDisponibles,0);
});

test('HU53-11/13: vencimiento libera cupo y un pago tardío no reactiva la reserva', async () => {
  const curso=await crear(); await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  const ruta=`/api/cursos/${curso.id}/inscribirme`;
  const primera=(await llamar('alumno','POST',ruta,{versionCobro:1})).json();
  await pool.query('update "intentosInscripcion" set "venceEn"=clock_timestamp()-interval \'1 second\' where id=$1',[primera.intentoId]);
  const catalogo=await llamar('alumno','GET','/api/catalogo/cursos/pagina?buscar=HU53&tamanoPagina=12');
  assert.equal(catalogo.statusCode,200,catalogo.body);
  assert.equal(catalogo.json().items.find((item:{id:string})=>item.id===curso.id).inscrito,false);
  const segunda=await llamar('otro','POST',ruta,{versionCobro:1});
  assert.equal(segunda.statusCode,201,segunda.body);
  await llamar('admin','POST',`/api/pagos/${primera.pagoId}/efectivo`,{referencia:`TARDIO-${curso.id}`,importeCentimos:15050,fechaRecepcion:'2026-01-01'});
  assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().estadoInscripcion,'CANCELADA');
  assert.equal((await llamar('otro','GET',`/api/cursos/${curso.id}`)).json().estadoInscripcion,'PENDIENTE_PAGO');
  assert.equal((await llamar('alumno','GET',`/api/pagos/${primera.pagoId}`)).json().incidencias[0].motivo,'TARDIO');
});

test('HU53-14/17: certificado y gratuito confirman sin cobrar la inscripción', async () => {
  for (const modalidadCobro of ['CERTIFICADO','GRATUITO']) {
    const curso=await crear({modalidadCobro,costo:modalidadCobro==='GRATUITO'?0:30,plazoPagoMinutos:null});
    await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
    const respuesta=await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:1});
    assert.equal(respuesta.statusCode,201,respuesta.body);
    assert.equal(respuesta.json().estado,'EN_CURSO');
    assert.equal(respuesta.json().pagoId,null);
  }
});

test('HU53-10: ni materiales ni asistencia se habilitan mediante una fila manual de clase', async () => {
  const curso=await crear(); await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:1});
  const ruta=`/api/cursos/${curso.id}/modulos/${curso.modulos[0].id}/materiales`;
  const material=await llamar('docente','POST',ruta,{titulo:'Privado',tipo:'PDF',contenidoBase64:Buffer.from('%PDF-1.4\n%%EOF').toString('base64')});
  assert.equal(material.statusCode,201,material.body);
  const archivo=`${ruta}/${material.json().id}/archivo`;
  assert.equal((await llamar('alumno','GET',archivo)).statusCode,403);
  assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().modulos.length,0);
  // Sesión «ambas» (HU-36): admite sala virtual además del aula.
  const clase=(await pool.query<{id:string}>(`insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar,modalidad)
    values($1,'Sesión HU53',$2,current_date,'08:00','09:00','Sala','AMBAS') returning id::text`,[curso.id,usuarios.get('docente')!.id])).rows[0]!;
  assert.equal(await inscribir(Number(clase.id),usuarios.get('alumno')!.id),false);
  await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[clase.id,usuarios.get('alumno')!.id]);
  assert.equal(await estaInscrito(Number(clase.id),Number(usuarios.get('alumno')!.id)),false);
  const reunion=await llamar('admin','POST','/api/reuniones',{claseIdentificador:clase.id,titulo:'Reunión HU53',inicioProgramado:new Date().toISOString(),finProgramado:new Date(Date.now()+3600000).toISOString()});
  assert.equal(reunion.statusCode,201,reunion.body);
  const rutaReunion=`/api/reuniones/${reunion.json().identificador}`;
  assert.equal((await llamar('alumno','GET',rutaReunion)).statusCode,403);
  assert.equal((await llamar('alumno','POST',`${rutaReunion}/credencial`)).statusCode,403);
  assert.equal((await llamar('alumno','GET','/api/reuniones')).json().some((item:{identificador:string})=>item.identificador===reunion.json().identificador),false);
  const propio=(await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().miInscripcion;
  await llamar('admin','POST',`/api/pagos/${propio.pagoId}/efectivo`,{referencia:`ACCESO-${curso.id}`,importeCentimos:15050,fechaRecepcion:'2026-01-01'});
  assert.equal((await llamar('alumno','GET',archivo)).statusCode,200);
  assert.equal(await estaInscrito(Number(clase.id),Number(usuarios.get('alumno')!.id)),true);
  assert.equal((await llamar('alumno','GET',rutaReunion)).statusCode,200);
});

test('HU53-14/15/16: retiene constancia elegible y la entrega tras pago sin reabrir el curso', async () => {
  const curso=await crear({modalidadCobro:'CERTIFICADO',costo:30,plazoPagoMinutos:null});
  await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:1});
  const clase=(await pool.query<{id:string}>(`insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)
    values($1,'Elegibilidad HU53',$2,current_date-1,'08:00','09:00','Sala') returning id::text`,[curso.id,usuarios.get('docente')!.id])).rows[0]!;
  assert.equal(await inscribir(Number(clase.id),usuarios.get('alumno')!.id),true);
  await pool.query('insert into attendances(class_id,user_id,created_by) values($1,$2,$2)',[clase.id,usuarios.get('alumno')!.id]);
  const cierre=await llamar('admin','POST',`/api/cursos/${curso.id}/cerrar`,{excepciones:[]});
  assert.equal(cierre.statusCode,200,cierre.body);
  assert.equal(cierre.json().retenidos,1); assert.equal(cierre.json().emitidos,0);
  assert.equal((await pool.query('select 1 from certificados_curso where curso_id=$1',[curso.id])).rowCount,0);
  const detalle=(await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json();
  assert.equal(detalle.miInscripcion.estadoEntrega,'RETENIDA');
  const pagoId=detalle.miInscripcion.pagoId;
  const administracion=(await llamar('admin','GET',`/api/cursos/${curso.id}/certificados`)).json();
  assert.equal(administracion.filas[0].entrega.estado,'RETENIDA');
  assert.equal(administracion.filas[0].entrega.pagoId,pagoId);
  const historial=(await llamar('alumno','GET',`/api/colegiados/${usuarios.get('alumno')!.id}/historial`)).json();
  const fila=historial.cursos.find((c:{id:string})=>c.id===curso.id);
  assert.equal(fila.pagoPendiente,true);
  assert.equal(fila.estadoEntrega,'RETENIDA');
  assert.equal(fila.pagoId,pagoId);
  await pool.query('update classes set fecha=current_date-30 where id=$1',[clase.id]);
  await pool.query('update cursos set titulo=\'Título posterior\' where id=$1',[curso.id]);
  await llamar('admin','POST',`/api/pagos/${pagoId}/efectivo`,{referencia:`CONSTANCIA-${curso.id}`,importeCentimos:3000,fechaRecepcion:'2026-01-01'});
  await liberarRetenidas(); await liberarRetenidas();
  const documentos=await pool.query('select codigo,datos from certificados_curso where curso_id=$1',[curso.id]);
  assert.equal(documentos.rowCount,1);
  assert.equal(documentos.rows[0].datos.curso,curso.titulo);
  assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().miInscripcion.estadoEntrega,'EMITIDA');
  assert.equal((await llamar(null,'GET',`/api/certificados/${documentos.rows[0].codigo}`)).statusCode,200);
});

test('HU53-04/08: IPN Izipay firmado confirma y una firma falsa no altera la reserva', async () => {
  const anterior={izipayHabilitado:env.izipayHabilitado,izipayCodigoComercio:env.izipayCodigoComercio,izipayClaveHash:env.izipayClaveHash};
  const clave='clave-de-firma-solo-para-pruebas-32';
  Object.assign(env,{izipayHabilitado:true,izipayCodigoComercio:'PRUEBA',izipayClaveHash:clave});
  try {
    const curso=await crear(); await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
    const alta=(await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:1})).json();
    const op=await iniciarOperacion(alta.pagoId,Number(usuarios.get('alumno')!.id),{medio:'IZIPAY',clave:randomUUID(),cargaHash:'a'.repeat(64)});
    const payloadHttp=JSON.stringify({code:'00',transactionId:op.id,response:{merchant:{merchantCode:'PRUEBA'},order:[{orderNumber:op.numero.padStart(10,'0'),amount:'150.50',currency:'PEN',uniqueId:`IPN${curso.id}`,codeAuth:'123456',stateMessage:'Autorizado'}]}});
    const firma=createHmac('sha256',clave).update(payloadHttp).digest('base64');
    const ruta='/api/pagos/notificaciones/izipay';
    assert.equal((await llamar(null,'POST',ruta,{payloadHttp,signature:'falsa'})).statusCode,422);
    assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().estadoInscripcion,'PENDIENTE_PAGO');
    assert.equal((await llamar(null,'POST',ruta,{payloadHttp,signature:firma})).statusCode,200);
    assert.equal((await llamar(null,'POST',ruta,{payloadHttp,signature:firma})).statusCode,200);
    assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().estadoInscripcion,'EN_CURSO');
  } finally { Object.assign(env,anterior); }
});

test('HU53-19: una oferta histórica de costo cero permite nuevas inscripciones gratuitas', async () => {
  const curso=await crear({costo:0,modalidadCobro:'GRATUITO',plazoPagoMinutos:null});
  await pool.query('update cursos set "modalidadCobro"=null where id=$1',[curso.id]);
  await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  const alta=await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`);
  assert.equal(alta.statusCode,201,alta.body);
  assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().miInscripcion.modalidadCobro,'GRATUITO');
});

test('HU53-05/08: Culqi consulta el cargo y no confía en los datos del webhook', async () => {
  const anterior={culqiHabilitado:env.culqiHabilitado,culqiClaveSecreta:env.culqiClaveSecreta};
  Object.assign(env,{culqiHabilitado:true,culqiClaveSecreta:'sk_test_soloPruebasSinCuenta'});
  let consultaValida=false;
  let llamada:ReturnType<typeof mock.method>|undefined;
  try {
    const curso=await crear();await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
    const alta=(await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:1})).json();
    const op=await iniciarOperacion(alta.pagoId,Number(usuarios.get('alumno')!.id),{medio:'CULQI',clave:randomUUID(),cargaHash:'a'.repeat(64)});
    const idCargo=`chr_test_C${curso.id}`;
    llamada=mock.method(globalThis,'fetch',async(url:unknown)=>{
      assert.equal(String(url),`https://api.culqi.com/v2/charges/${idCargo}`);
      return new Response(JSON.stringify({object:'charge',id:idCargo,amount:15050,currency_code:'PEN',response_code:consultaValida?'venta_exitosa':'venta_denegada',metadata:{operacionId:op.id,pagoId:alta.pagoId}}),{status:200});
    });
    const cuerpo={data:{id:idCargo,paid:true,amount:15050,response_code:'venta_exitosa'}};
    assert.notEqual((await llamar(null,'POST','/api/pagos/notificaciones/culqi',cuerpo)).statusCode,200);
    assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().estadoInscripcion,'PENDIENTE_PAGO');
    consultaValida=true;
    assert.equal((await llamar(null,'POST','/api/pagos/notificaciones/culqi',cuerpo)).statusCode,200);
    assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().estadoInscripcion,'EN_CURSO');
  } finally {llamada?.mock.restore();Object.assign(env,anterior);}
});

test('HU53-02/19: cambiar una oferta gratuita a certificado conserva el derecho histórico gratuito', async () => {
  const curso=await crear({costo:0,modalidadCobro:'GRATUITO',plazoPagoMinutos:null,cupos:2});
  await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  await pool.query("insert into inscripciones_curso(curso_id,usuario_id,estado) values($1,$2,'EN_CURSO')",[curso.id,usuarios.get('alumno')!.id]);
  const cambio=await llamar('admin','PATCH',`/api/cursos/${curso.id}/cobro`,{modalidadCobro:'CERTIFICADO',costo:30,plazoPagoMinutos:null,versionCobro:1});
  assert.equal(cambio.statusCode,200,cambio.body);
  assert.equal((await llamar('otro','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:2})).statusCode,201);
  const clase=(await pool.query<{id:string}>(`insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)
    values($1,'Legado gratuito HU53',$2,current_date-1,'08:00','09:00','Sala') returning id::text`,[curso.id,usuarios.get('docente')!.id])).rows[0]!;
  for (const nombre of ['alumno','otro']) {
    await inscribir(Number(clase.id),usuarios.get(nombre)!.id);
    await pool.query('insert into attendances(class_id,user_id,created_by) values($1,$2,$2)',[clase.id,usuarios.get(nombre)!.id]);
  }
  const cierre=await llamar('admin','POST',`/api/cursos/${curso.id}/cerrar`,{excepciones:[]});
  assert.equal(cierre.statusCode,200,cierre.body);
  assert.equal(cierre.json().emitidos,1);assert.equal(cierre.json().retenidos,1);
  assert.equal((await pool.query('select 1 from "obligacionesPago" where "cursoId"=$1 and "usuarioId"=$2',[curso.id,usuarios.get('alumno')!.id])).rowCount,0);
});

test('HU53-19: cambiar una oferta pagada a gratuita no inventa condiciones del inscrito histórico', async () => {
  const curso=await crear();await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  await pool.query("insert into inscripciones_curso(curso_id,usuario_id,estado) values($1,$2,'EN_CURSO')",[curso.id,usuarios.get('alumno')!.id]);
  await llamar('admin','PATCH',`/api/cursos/${curso.id}/cobro`,{modalidadCobro:'GRATUITO',costo:0,plazoPagoMinutos:null,versionCobro:1});
  const clase=(await pool.query<{id:string}>(`insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)
    values($1,'Histórico desconocido',$2,current_date-1,'08:00','09:00','Sala') returning id::text`,[curso.id,usuarios.get('docente')!.id])).rows[0]!;
  await inscribir(Number(clase.id),usuarios.get('alumno')!.id);
  await pool.query('insert into attendances(class_id,user_id,created_by) values($1,$2,$2)',[clase.id,usuarios.get('alumno')!.id]);
  const cierre=await llamar('admin','POST',`/api/cursos/${curso.id}/cerrar`,{excepciones:[]});
  assert.equal(cierre.statusCode,409,cierre.body);
  await llamar('admin','PATCH',`/api/cursos/${curso.id}/cobro`,{modalidadCobro:'CERTIFICADO',costo:30,plazoPagoMinutos:null,versionCobro:2});
  assert.equal((await pool.query('select "constanciaGratuitaLegada" as gratuita from inscripciones_curso where curso_id=$1',[curso.id])).rows[0].gratuita,false);
  assert.equal((await pool.query('select 1 from certificados_curso where curso_id=$1',[curso.id])).rowCount,0);
});

test('HU53-07: conserva referencia Culqi si falla la consulta y concilia sin cobrar otra vez', async () => {
  const anterior={culqiHabilitado:env.culqiHabilitado,culqiClaveSecreta:env.culqiClaveSecreta};
  Object.assign(env,{culqiHabilitado:true,culqiClaveSecreta:'sk_test_soloPruebasSinCuenta'});
  let restaurar:(()=>void)|undefined;
  try {
    const curso=await crear();await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
    const alta=(await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:1})).json();
    const referencia=`chr_test_R${curso.id}`;let cargos=0;let permitirConsulta=false;
    let metadata:unknown;
    const llamada=mock.method(globalThis,'fetch',async(url:unknown,opciones?:RequestInit)=>{
      if (opciones?.method==='POST') {
        assert.equal(String(url),'https://api.culqi.com/v2/charges');cargos++;
        metadata=JSON.parse(String(opciones.body)).metadata;
        return new Response(JSON.stringify({id:referencia}),{status:201});
      }
      if (!permitirConsulta) throw new Error('interrupción simulada');
      return new Response(JSON.stringify({object:'charge',id:referencia,amount:15050,currency_code:'PEN',response_code:'venta_exitosa',metadata}),{status:200});
    });restaurar=()=>llamada.mock.restore();
    // Simula una operación histórica anterior a la elección T-25. La API del
    // participante ya no crea cargos Culqi; sí debe conciliar los existentes.
    await assert.rejects(iniciarPago((await obtenerPago(alta.pagoId))!,Number(usuarios.get('alumno')!.id),
      {medio:'CULQI',clave:randomUUID(),token:'tkn_test_soloPruebas'}),{statusCode:503});
    const operacion=(await llamar('alumno','GET',`/api/pagos/${alta.pagoId}`)).json().operaciones[0];
    assert.equal(operacion.referenciaExterna,referencia);
    assert.equal(operacion.estado,'INCIERTO');
    permitirConsulta=true;
    assert.equal((await llamar('admin','POST',`/api/pagos/${alta.pagoId}/conciliar`,{operacionId:operacion.id})).statusCode,200);
    assert.equal(cargos,1);
    assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().estadoInscripcion,'EN_CURSO');
  } finally {restaurar?.();Object.assign(env,anterior);}
});

test('HU53-07: operaciones sin referencia no bloquean la recuperación automática de otros pagos', async () => {
  const anterior={culqiHabilitado:env.culqiHabilitado,culqiClaveSecreta:env.culqiClaveSecreta};
  Object.assign(env,{culqiHabilitado:true,culqiClaveSecreta:'sk_test_soloPruebasSinCuenta'});
  let restaurar:(()=>void)|undefined;
  try {
    const curso=await crear();
    const recuperables=new Map<string,{operacionId:string;pagoId:string}>();
    for (let numero=0;numero<5;numero++) {
      const pago=await crearObligacion(pool,{cursoId:curso.id,usuarioId:Number(usuarios.get('alumno')!.id),intentoId:randomUUID(),concepto:'CURSO',importeCentimos:15050,moneda:'PEN'});
      const op=await iniciarOperacion(pago.id,Number(usuarios.get('alumno')!.id),{medio:'CULQI',clave:randomUUID(),cargaHash:'a'.repeat(64)});
      const referencia=numero<2?null:`chr_test_Recuperar${op.numero}`;
      await pool.query('update "operacionesPago" set "creadoEn"=clock_timestamp()-interval \'1 minute\',"actualizadoEn"=clock_timestamp()-interval \'1 minute\',"referenciaExterna"=$2 where id=$1',[op.id,referencia]);
      if (referencia) recuperables.set(referencia,{operacionId:op.id,pagoId:pago.id});
    }
    const llamada=mock.method(globalThis,'fetch',async(url:unknown)=>{
      const referencia=String(url).split('/').at(-1)!;
      const metadata=recuperables.get(referencia);assert.ok(metadata);
      return new Response(JSON.stringify({object:'charge',id:referencia,amount:15050,currency_code:'PEN',response_code:'venta_exitosa',metadata}),{status:200});
    });restaurar=()=>llamada.mock.restore();
    const resultado=await recuperarOperaciones();
    assert.equal(resultado.confirmadas,3);
    assert.equal(resultado.pendientes,2);
  } finally {restaurar?.();Object.assign(env,anterior);}
});

test('HU53-07: recupera la sesión original Izipay sin generar otro token', async () => {
  const anterior={...env};let restaurar:(()=>void)|undefined;
  Object.assign(env,{izipayHabilitado:true,izipayCodigoComercio:'PRUEBA',izipayClavePublica:'clave-publica-prueba',izipayRsaPublica:'rsa-publica-solo-prueba',pagosUrlPublica:'https://comercio.example'});
  try {
    const curso=await crear();await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
    const alta=(await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:1})).json();
    let tokens=0;
    const llamada=mock.method(globalThis,'fetch',async()=>{tokens++;return new Response(JSON.stringify({code:'00',response:{token:'token-efimero-solo-para-pruebas'}}),{status:200})});
    restaurar=()=>llamada.mock.restore();
    const entrada={medio:'IZIPAY',clave:randomUUID()};
    const primero=await llamar('alumno','POST',`/api/pagos/${alta.pagoId}/intentos`,entrada);
    assert.equal(primero.statusCode,200,primero.body);
    const segundo=await llamar('alumno','POST',`/api/pagos/${alta.pagoId}/intentos`,entrada);
    assert.deepEqual(segundo.json().izipay,primero.json().izipay);
    assert.equal(tokens,1);
    const sesion=(await pool.query('select "sesionCifrada" from "operacionesPago" where id=$1',[primero.json().operacionId])).rows[0].sesionCifrada;
    assert.ok(sesion);assert.equal(sesion.includes('token-efimero-solo-para-pruebas'),false);
    await pool.query('update "intentosInscripcion" set "venceEn"=clock_timestamp()-interval \'1 second\' where id=$1',[alta.intentoId]);
    const vencida=await llamar('alumno','POST',`/api/pagos/${alta.pagoId}/intentos`,entrada);
    assert.equal(vencida.json().izipay,undefined);
    assert.equal(tokens,1);
  } finally {restaurar?.();Object.assign(env,anterior);}
});

test('HU53-07: una respuesta Izipay múltiple se conserva para revisión sin habilitar acceso', async () => {
  const anterior={...env};const clave='clave-de-firma-solo-para-pruebas-32';
  Object.assign(env,{izipayHabilitado:true,izipayCodigoComercio:'PRUEBA',izipayClaveHash:clave});
  try {
    const curso=await crear();await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
    const alta=(await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:1})).json();
    const op=await iniciarOperacion(alta.pagoId,Number(usuarios.get('alumno')!.id),{medio:'IZIPAY',clave:randomUUID(),cargaHash:'a'.repeat(64)});
    const orden={orderNumber:op.numero.padStart(10,'0'),amount:'150.50',currency:'PEN',codeAuth:'123456',stateMessage:'Autorizado'};
    const payloadHttp=JSON.stringify({code:'00',transactionId:op.id,response:{merchant:{merchantCode:'PRUEBA'},order:[{...orden,uniqueId:`MULTIA${curso.id}`},{...orden,uniqueId:`MULTIB${curso.id}`}]}});
    const respuesta=await llamar(null,'POST','/api/pagos/notificaciones/izipay',{payloadHttp,signature:createHmac('sha256',clave).update(payloadHttp).digest('base64')});
    assert.equal(respuesta.statusCode,200,respuesta.body);
    assert.equal((await llamar('alumno','GET',`/api/pagos/${alta.pagoId}`)).json().estado,'PENDIENTE');
    assert.equal((await pool.query('select 1 from "incidenciasPago" where "pagoId"=$1',[alta.pagoId])).rowCount,2);
  } finally {Object.assign(env,anterior);}
});

test('HU53-18: tras reinscribirse conserva consulta de condiciones y pago del intento anterior',async()=>{
  const curso=await crear();await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  const ruta=`/api/cursos/${curso.id}/inscribirme`;
  const anterior=(await llamar('alumno','POST',ruta,{versionCobro:1})).json();
  await pool.query('update "intentosInscripcion" set "venceEn"=clock_timestamp()-interval \'1 second\' where id=$1',[anterior.intentoId]);
  const nueva=await llamar('alumno','POST',ruta,{versionCobro:1});assert.equal(nueva.statusCode,201,nueva.body);
  await llamar('admin','POST',`/api/pagos/${anterior.pagoId}/efectivo`,{referencia:`HISTORIAL-${curso.id}`,importeCentimos:15050,fechaRecepcion:'2026-01-01'});
  const historial=(await llamar('alumno','GET',`/api/colegiados/${usuarios.get('alumno')!.id}/historial`)).json();
  const fila=historial.cursos.find((item:{id:string})=>item.id===curso.id);
  assert.equal(fila.pagoId,nueva.json().pagoId);
  assert.equal(fila.intentosAnteriores.length,1);
  assert.equal(fila.intentosAnteriores[0].intentoId,anterior.intentoId);
  assert.equal(fila.intentosAnteriores[0].importeCentimos,15050);
  assert.equal(fila.intentosAnteriores[0].estado,'CANCELADA');
  assert.equal(fila.intentosAnteriores[0].estadoFinanciero,'PAGADO');
  assert.equal(fila.intentosAnteriores[0].pagoId,anterior.pagoId);
});

test('HU53-07: termina el proceso durante la consulta Culqi y recupera sin crear otro cargo',async()=>{
  const curso=await crear();await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  const alta=(await llamar('alumno','POST',`/api/cursos/${curso.id}/inscribirme`,{versionCobro:1})).json();
  const referencia=`chr_test_Caida${curso.id}`;
  const codigo=`
    import { env } from './backend/src/config/env.ts';
    import { obtenerPago } from './backend/src/modules/pagos/pagos.repositorio.ts';
    import { iniciarPago } from './backend/src/modules/pagos/pagos.servicio.ts';
    import { randomUUID } from 'node:crypto';
    Object.assign(env,{culqiHabilitado:true,culqiClaveSecreta:'sk_test_soloPruebas'});
    setInterval(()=>{},1000);
    globalThis.fetch=async(url,opciones)=>{
      if(opciones?.method==='POST') return new Response(JSON.stringify({id:process.argv[3]}),{status:201});
      process.stdout.write('consulta-iniciada\\n');
      return new Promise(()=>{});
    };
    await iniciarPago(await obtenerPago(process.argv[1]),Number(process.argv[2]),{medio:'CULQI',clave:randomUUID(),token:'tkn_test_soloPruebas'});
  `;
  const hijo=spawn(process.execPath,['--import','tsx','--input-type=module','-e',codigo,alta.pagoId,usuarios.get('alumno')!.id,referencia],{cwd:new URL('../../../',import.meta.url),stdio:['ignore','pipe','pipe']});
  try {
    await new Promise<void>((resolver,rechazar)=>{
      const limite=setTimeout(()=>rechazar(new Error('El proceso no alcanzó la consulta de prueba.')),10000);
      hijo.once('error',rechazar);
      hijo.stdout.once('data',()=>{clearTimeout(limite);resolver()});
      hijo.once('exit',()=>{clearTimeout(limite);rechazar(new Error('El proceso terminó antes de la consulta.'))});
    });
    const salida=once(hijo,'exit');hijo.kill('SIGKILL');
    assert.equal((await salida)[1],'SIGKILL');
    const operacion=(await pool.query('select id,"referenciaExterna" from "operacionesPago" where "pagoId"=$1',[alta.pagoId])).rows[0];
    assert.equal(operacion.referenciaExterna,referencia);
    assert.equal((await pool.query('select 1 from "hechosPago" where "pagoId"=$1',[alta.pagoId])).rowCount,0);
    const anterior={...env};Object.assign(env,{culqiHabilitado:true,culqiClaveSecreta:'sk_test_soloPruebas'});
    const llamada=mock.method(globalThis,'fetch',async(url:unknown,opciones?:RequestInit)=>{
      assert.notEqual(opciones?.method,'POST');assert.equal(String(url),`https://api.culqi.com/v2/charges/${referencia}`);
      return new Response(JSON.stringify({object:'charge',id:referencia,amount:15050,currency_code:'PEN',response_code:'venta_exitosa',metadata:{operacionId:operacion.id,pagoId:alta.pagoId}}),{status:200});
    });
    try {
      const resultado=await llamar('admin','POST',`/api/pagos/${alta.pagoId}/conciliar`,{operacionId:operacion.id});
      assert.equal(resultado.statusCode,200,resultado.body);
      assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().estadoInscripcion,'EN_CURSO');
      assert.equal((await pool.query('select 1 from "hechosPago" where "pagoId"=$1',[alta.pagoId])).rowCount,1);
    } finally {llamada.mock.restore();Object.assign(env,anterior);}
  } finally { if(hijo.exitCode===null && hijo.signalCode===null) hijo.kill('SIGKILL'); }
});

test('HU53-11: dos procesadores recuperan vencidos al arrancar y cancelan en el ciclo real',async()=>{
  const curso=await crear();await llamar('admin','POST',`/api/cursos/${curso.id}/publicar`);
  const ruta=`/api/cursos/${curso.id}/inscribirme`;
  const expirar=async(intentoId:string)=>pool.query('update "intentosInscripcion" set "venceEn"=clock_timestamp()-interval \'1 second\' where id=$1',[intentoId]);
  const esperarCancelacion=async(intentoId:string)=>{
    const limite=Date.now()+35000;
    let fila;
    do {
      fila=(await pool.query('select estado,"canceladoEn"::text from "intentosInscripcion" where id=$1',[intentoId])).rows[0];
      if (fila.estado==='CANCELADA') return fila;
      await new Promise(resolver=>setTimeout(resolver,100));
    } while (Date.now()<limite);
    assert.equal(fila.estado,'CANCELADA');return fila;
  };
  const primera=(await llamar('alumno','POST',ruta,{versionCobro:1})).json();await expirar(primera.intentoId);
  const procesos=await buildApp();
  try {
    iniciarProcesosCobro(procesos);iniciarProcesosCobro(procesos);await procesos.ready();
    await esperarCancelacion(primera.intentoId);
    const segunda=(await llamar('alumno','POST',ruta,{versionCobro:1})).json();await expirar(segunda.intentoId);
    const final=await esperarCancelacion(segunda.intentoId);
    await Promise.all([vencerReservas(),vencerReservas()]);
    assert.equal((await pool.query('select "canceladoEn"::text from "intentosInscripcion" where id=$1',[segunda.intentoId])).rows[0].canceladoEn,final.canceladoEn);
    assert.equal((await llamar('alumno','GET',`/api/cursos/${curso.id}`)).json().cuposDisponibles,1);
  } finally {await procesos.close();}
});
