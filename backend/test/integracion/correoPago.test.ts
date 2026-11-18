import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { createServer,type Socket } from 'node:net';
import { randomUUID } from 'node:crypto';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/shared/database.js';
import { migrar } from '../../src/shared/migraciones.js';
import { confirmarOperacion, crearObligacion, iniciarOperacion, registrarEfectivo, obtenerPago } from '../../src/modules/pagos/pagos.repositorio.js';
import { enviarNotificacionesPago } from '../../src/modules/pagos/pagos.correo.js';
import { inscribirseEnCurso } from '../../src/modules/cursos/cursos.repositorio.js';
import { buildApp } from '../../src/app.js';
import { redis } from '../../src/shared/redis.js';
import { procesarColaCorreo } from '../../src/modules/notificaciones/correo.envio.js';

const mensajes:string[]=[];
const conexiones=new Set<Socket>();
let rechazar=true;
let codigoRechazo=451;
let bloquearEntrega=false;
let cursoId:string;
let admin:number;
let alumno:number;
const anterior={...env};
const servidor=createServer(conexion=>{
  conexiones.add(conexion);conexion.on('close',()=>conexiones.delete(conexion));
  conexion.setEncoding('utf8');conexion.write('220 localhost pruebas HU32\r\n');
  let pendiente='';let datos=false;let mensaje:string[]=[];
  conexion.on('data',trozo=>{
    pendiente+=trozo;
    let indice:number;
    while((indice=pendiente.indexOf('\r\n'))>=0) {
      const linea=pendiente.slice(0,indice);pendiente=pendiente.slice(indice+2);
      if(datos) {
        if(linea==='.') {datos=false;mensajes.push(mensaje.join('\r\n'));mensaje=[];if(!bloquearEntrega) conexion.write(rechazar?`${codigoRechazo} Rechazo de prueba\r\n`:'250 Aceptado localmente\r\n');}
        else mensaje.push(linea.startsWith('..')?linea.slice(1):linea);
      } else if(/^EHLO|^HELO/.test(linea)) conexion.write('250 localhost\r\n');
      else if(linea==='DATA') {datos=true;conexion.write('354 Enviar mensaje\r\n');}
      else if(linea==='QUIT') conexion.end('221 Fin\r\n');
      else conexion.write('250 OK\r\n');
    }
  });
});

test('HU29: una respuesta final perdida deja la entrega incierta y evita el reenvío', {timeout:2000},async()=>{
  const pago=await crearObligacion(pool,{cursoId,usuarioId:alumno,intentoId:randomUUID(),concepto:'CURSO',importeCentimos:15050,moneda:'PEN'});
  await registrarEfectivo(pago.id,admin,`CAJA-${randomUUID()}`);
  Object.assign(env,{correoPlazoEnvioMs:200,correoHabilitado:true});bloquearEntrega=true;
  try {
    assert.equal(await enviarNotificacionesPago(),0);
    const aviso=(await pool.query('select estado,intentos,"ultimoError" from "notificacionesPago" where "pagoId"=$1',[pago.id])).rows[0];
    assert.equal(aviso.estado,'INCIERTO');assert.equal(aviso.intentos,1);
    assert.equal(aviso.ultimoError,'SMTP_RESULTADO_INCIERTO');
    assert.equal(await enviarNotificacionesPago(),0);
    assert.equal((await obtenerPago(pago.id))?.estado,'PAGADO');
  } finally {bloquearEntrega=false;Object.assign(env,{correoPlazoEnvioMs:60000});}
});
before(async()=>{
  await migrar(pool);
  const personas=(await pool.query(`insert into users(name,email,password_hash,role) values('Admin',$1,'sin-acceso','admin'),('Alumno',$2,'sin-acceso','agremiado') returning id`,
    [`correo-admin-${randomUUID()}@prueba.local`,`correo-alumno-${randomUUID()}@prueba.local`])).rows;
  admin=Number(personas[0].id);alumno=Number(personas[1].id);
  cursoId=(await pool.query(`insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado)
    values($1,$1,'Correo HU32',24,'PRESENCIAL',150.50,5,'PARTICIPACION') returning id::text`,[admin])).rows[0].id;
  await new Promise<void>(resolver=>servidor.listen(0,'127.0.0.1',resolver));
  const direccion=servidor.address();assert.ok(direccion&&typeof direccion==='object');
  Object.assign(env,{correoServidor:'127.0.0.1',correoPuerto:direccion.port,correoRemitente:'pagos@prueba.local',correoSinTlsParaPruebas:true});
  env.correoOrigenPublico='https://aula.prueba.local';
});
after(async()=>{
  Object.assign(env,anterior);for(const conexion of conexiones) conexion.destroy();
  await new Promise<void>(resolver=>servidor.close(()=>resolver()));
  if(cursoId) {
    for(const tabla of ['auditoriaPagos','hechosPago','operacionesPago','obligacionesPago']) await pool.query(`delete from "${tabla}" where ${tabla==='obligacionesPago'?'"cursoId"=$1':'"pagoId" in (select id from "obligacionesPago" where "cursoId"=$1)'}`,[cursoId]);
    await pool.query('delete from cursos where id=$1',[cursoId]);await pool.query('delete from users where id=any($1::bigint[])',[[admin,alumno]]);
  }
  await pool.end();
});
test('HU32-07: SMTP local rechaza, reintenta y entrega un PDF; dos trabajadores no duplican el evento',async()=>{
  mensajes.length=0;
  const pago=await crearObligacion(pool,{cursoId,usuarioId:alumno,intentoId:randomUUID(),concepto:'CURSO',importeCentimos:15050,moneda:'PEN'});
  await registrarEfectivo(pago.id,admin,`CAJA-${randomUUID()}`);
  env.correoHabilitado=false;assert.equal(await enviarNotificacionesPago(),0);
  env.correoHabilitado=true;assert.equal(await enviarNotificacionesPago(),0);
  assert.equal((await obtenerPago(pago.id))?.estado,'PAGADO');
  const fallida=(await pool.query(`select estado,intentos,"ultimoError" from "notificacionesPago" where "pagoId"=$1`,[pago.id])).rows[0];
  assert.equal(fallida.estado,'PENDIENTE');assert.equal(fallida.intentos,1);assert.ok(fallida.ultimoError);
  rechazar=false;env.correoRemitente='pagos@otra-prueba.local';
  await pool.query('update "notificacionesPago" set "intentarEn"=clock_timestamp() where "pagoId"=$1',[pago.id]);
  const enviados=await Promise.all([enviarNotificacionesPago(),enviarNotificacionesPago()]);assert.equal(enviados.reduce((suma,total)=>suma+total,0),1);
  assert.equal(mensajes.length,2);
  const identificador=(mensaje:string)=>mensaje.match(/^Message-ID: (.+)$/mi)?.[1];
  assert.equal(identificador(mensajes[0]!),identificador(mensajes[1]!));
  assert.match(mensajes[1]!, /Content-Type: text\/html/);
  assert.ok(mensajes[1]!.includes(`https://aula.prueba.local/cursos/${cursoId}`));
  assert.match(mensajes[1]!,/Content-Type: application\/pdf/);
  const pdf=mensajes[1]!.slice(mensajes[1]!.indexOf('Content-Type: application/pdf')).split('\r\n\r\n')[1]!.split('\r\n--')[0]!.replace(/\s/g,'');
  assert.match(Buffer.from(pdf,'base64').toString(),/^%PDF-/);
  assert.equal(await enviarNotificacionesPago(),0);
  assert.equal((await pool.query('select estado from "notificacionesPago" where "pagoId"=$1',[pago.id])).rows[0].estado,'ENVIADO');
});

test('HU54-02: SMTP acepta el comprobante del importe realmente cobrado en línea', async () => {
  mensajes.length = 0;
  rechazar = false;
  env.correoHabilitado = true;
  const pago = await crearObligacion(pool, {
    cursoId, usuarioId: alumno, intentoId: randomUUID(), concepto: 'CURSO', importeCentimos: 15050, moneda: 'PEN',
  });
  const operacion = await iniciarOperacion(pago.id, alumno, {
    medio: 'IZIPAY', clave: randomUUID(), cargaHash: 'a'.repeat(64),
    cotizar: () => ({ instrumento: 'YAPE', comisionCentimos: 527, totalCentimos: 15577, comercio: 'PRUEBA', ordenExterna: 'GCSMTP54' }),
  });
  await confirmarOperacion(operacion.id, { referencia: `YAPE-${randomUUID()}`, importeCentimos: 15577, moneda: 'PEN' });
  assert.equal(await enviarNotificacionesPago(), 1);
  const [mensaje] = mensajes;
  assert.equal(mensajes.length, 1);
  assert.match(mensaje!, /155\.77/);
  const pdf = mensaje!.slice(mensaje!.indexOf('Content-Type: application/pdf')).split('\r\n\r\n')[1]!.split('\r\n--')[0]!.replace(/\s/g,'');
  assert.ok(Buffer.from(pdf, 'base64').toString().includes(Buffer.from('Total pagado: S/ 155.77 PEN').toString('hex')));
  assert.equal(await enviarNotificacionesPago(), 0);
});

test('HU29: una inscripción gratuita se confirma por correo una vez', async () => {
  await pool.query(`update cursos set estado='PUBLICADO',costo=0,"modalidadCobro"='GRATUITO' where id=$1`, [cursoId]);
  const resultados = await Promise.all([inscribirseEnCurso(cursoId, alumno), inscribirseEnCurso(cursoId, alumno)]);
  assert.deepEqual(resultados.sort(), ['INSCRITO', 'YA_INSCRITO']);
  const avisos = await pool.query(`select tipo,estado from "notificacionesCorreo" where "cursoId"=$1`, [cursoId]);
  assert.deepEqual(avisos.rows, [{ tipo: 'INSCRIPCION_CONFIRMADA', estado: 'PENDIENTE' }]);
  const enviados = await Promise.all([procesarColaCorreo('cursos'), procesarColaCorreo('cursos')]);
  assert.equal(enviados.reduce((total, cantidad) => total + cantidad), 1);
  assert.equal((await pool.query(`select estado from "notificacionesCorreo" where "cursoId"=$1`, [cursoId])).rows[0].estado, 'ENVIADO');
});

test('HU29: solo el administrador consulta resultados paginados sin datos de entrega privados', async () => {
  const app=await buildApp();
  try {
    const ruta='/api/admin/notificaciones/correo';
    const pedir=(usuario: number, url: string) => app.inject({method:'GET',url,headers:{authorization:`Bearer ${app.jwt.sign({sub:String(usuario)})}`}});
    assert.equal((await app.inject({method:'GET',url:ruta})).statusCode,401);
    assert.equal((await pedir(alumno,ruta)).statusCode,403);
    const respuesta=await pedir(admin,`${ruta}?tipo=COMPROBANTE&estado=INCIERTO&limite=1`);
    assert.equal(respuesta.statusCode,200,respuesta.body);
    assert.equal(respuesta.headers['cache-control'],'private, no-store');
    assert.equal(respuesta.json().items[0]?.ultimoError,'SMTP_RESULTADO_INCIERTO');
    assert.doesNotMatch(respuesta.body,/prueba.local|destinatario|"datos"|"texto"/);
    assert.equal((await pedir(admin,ruta+'?limite=10000')).statusCode,422);
  } finally {
    await app.close();
    redis.disconnect();
  }
});

test('HU29: agota reintentos, distingue un rechazo permanente y no redespacha envíos abandonados', async () => {
  async function pendiente() {
    const pago=await crearObligacion(pool,{cursoId,usuarioId:alumno,intentoId:randomUUID(),concepto:'CONSTANCIA',importeCentimos:100,moneda:'PEN'});
    await registrarEfectivo(pago.id,admin,`CAJA-${randomUUID()}`);
    return pago.id;
  }
  const abandonado=await pendiente();
  await pool.query(`update "notificacionesPago" set estado='ENVIANDO',"bloqueadoHasta"=clock_timestamp()-interval '1 second'
    where "pagoId"=$1`,[abandonado]);
  const agotado=await pendiente();
  await pool.query('update "notificacionesPago" set intentos=4 where "pagoId"=$1',[agotado]);
  rechazar=true;
  mensajes.length=0;
  try {
    assert.equal(await enviarNotificacionesPago(),0);
    assert.equal(mensajes.length,1);
    codigoRechazo=550;
    const permanente=await pendiente();
    assert.equal(await enviarNotificacionesPago(),0);
    const filas=(await pool.query(`select estado,"ultimoError" from "notificacionesPago"
      where "pagoId"=any($1::bigint[]) order by "pagoId"`,[[abandonado,agotado,permanente]])).rows;
    assert.deepEqual(filas,[
      {estado:'INCIERTO',ultimoError:'SMTP_RESULTADO_INCIERTO'},
      {estado:'FALLIDO',ultimoError:'SMTP_INTENTOS_AGOTADOS'},
      {estado:'FALLIDO',ultimoError:'SMTP_RECHAZADO'},
    ]);
  } finally { rechazar=false; codigoRechazo=451; }
});

test('HU29: omite un aviso si cambia el correo del titular antes de enviarlo', async () => {
  const nuevo=(await pool.query<{id:string}>(`insert into cursos
    (creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado,estado,"modalidadCobro")
    values($1,$1,'Cambio de destinatario HU29',8,'PRESENCIAL',0,5,'PARTICIPACION','PUBLICADO','GRATUITO') returning id::text`,[admin])).rows[0]!.id;
  const email=(await pool.query<{email:string}>('select email from users where id=$1',[alumno])).rows[0]!.email;
  try {
    assert.equal(await inscribirseEnCurso(nuevo,alumno),'INSCRITO');
    await pool.query('update users set email=$2 where id=$1',[alumno,`cambio-${randomUUID()}@prueba.local`]);
    const cantidad=mensajes.length;
    assert.equal(await procesarColaCorreo('cursos'),0);
    assert.equal(mensajes.length,cantidad);
    assert.deepEqual((await pool.query('select estado,"ultimoError" from "notificacionesCorreo" where "cursoId"=$1',[nuevo])).rows,
      [{estado:'OMITIDO',ultimoError:'DESTINATARIO_CAMBIADO'}]);
  } finally {
    await pool.query('update users set email=$2 where id=$1',[alumno,email]);
    await pool.query('delete from cursos where id=$1',[nuevo]);
  }
});
