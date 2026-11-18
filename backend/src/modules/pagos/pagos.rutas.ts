import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { pool } from '../../shared/database.js';
import { idCurso } from '../cursos/cursos.validacion.js';
import { ErrorPago, entradaIntento,entradaRevisionTransferencia } from './pagos.modelo.js';
import { obtenerPago, registrarEfectivo } from './pagos.repositorio.js';
import { iniciarPago, mediosDisponibles, opcionesEnLinea, recuperarPagoEnLinea } from './pagos.servicio.js';
import { conciliarOperacion, pasarelas } from './pagos.pasarelas.js';
import { buscarOperacion } from './pagos.repositorio.js';
import { z } from 'zod';
import { redis } from '../../shared/redis.js';
import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { ofrecerTransferencia,buscarDestinoTransferencia,declararTransferencia,revisarTransferencia,listarTransferencias,reponerVoucher } from './pagos.transferencias.js';
import { entradaSubidaVoucher,entradaRecepcionEfectivo,validarArchivoVoucher } from './pagos.voucher.js';
import { obtenerVoucher } from './pagos.archivos.js';
import { obtenerComprobante, pdfComprobante } from './pagos.correo.js';

type ConPago=FastifyRequest<{Params:{id:string}}>;
async function ejecutar(reply:FastifyReply,operacion:()=>Promise<unknown>) {
  try { return await operacion(); } catch(error) {
    if (error instanceof ErrorPago) return reply.code(error.statusCode).send({code:error.code,message:error.message});
    throw error;
  }
}
async function pagoAutorizado(request:ConPago) {
  const id=idCurso.parse(request.params.id);
  const pago=await obtenerPago(id);
  if (!pago) throw new ErrorPago(404,'PAGO_NO_EXISTE','La obligación no existe.');
  if (request.usuario!.role!=='admin' && String(pago.usuarioId)!==String(request.usuario!.id)) throw new ErrorPago(403,'SIN_PERMISO','No tienes permiso para consultar esta obligación.');
  return pago;
}
export async function registrarPagos(app:FastifyInstance) {
  app.post('/api/pagos/notificaciones/:proveedor',{bodyLimit:262144},async(request:FastifyRequest<{Params:{proveedor:string}}>,reply)=>ejecutar(reply,async()=>{
    const proveedor=z.string().regex(/^[a-z][a-z0-9-]{1,29}$/).parse(request.params.proveedor);
    const pasarela = pasarelas.porRuta(proveedor);
    if (!pasarela) throw new ErrorPago(404, 'PASARELA_NO_EXISTE', 'La pasarela no existe.');
    if (!pasarela.conciliacion()) throw new ErrorPago(503,'PASARELA_NO_CONFIGURADA','Esta pasarela todavía no está disponible.');
    const clave=`gestioncapa:${env.DB_NAME}:pagos:${proveedor}:${createHash('sha256').update(request.ip).digest('hex')}`;
    const usos=Number(await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",1,clave));
    if (usos>120) return reply.header('Retry-After','60').code(429).send({code:'LIMITE_NOTIFICACIONES',message:'Reintenta la notificación más tarde.'});
    const estado=await pasarela.notificar(request.body, request.headers);
    return {estado};
  }));
  app.post('/api/pagos/:id/conciliar',{bodyLimit:4096},async(request:ConPago,reply)=>ejecutar(reply,async()=>{
    const pago=await pagoAutorizado(request);
    const entrada=z.object({operacionId:z.uuid(),referencia:z.string().max(100).optional()}).strict().parse(request.body);
    const op=await buscarOperacion(entrada.operacionId);
    if (!op || op.pagoId!==pago.id) throw new ErrorPago(404,'OPERACION_NO_EXISTE','La operación no pertenece a esta obligación.');
    return {estado:await conciliarOperacion(op,entrada.referencia)};
  }));
  app.get('/api/pagos/:id',async (request:ConPago,reply)=>ejecutar(reply,async()=>{
    reply.header('Cache-Control','private, no-store');
    const pago=await pagoAutorizado(request);
    const contexto=(await pool.query(`select c.titulo as "cursoTitulo",u.name as "participanteNombre",t."venceEn",
      case when p.concepto='CURSO' then t.estado='PENDIENTE_PAGO' and t."venceEn">clock_timestamp() and i."intentoId"=t.id
        else exists(select 1 from "entregasConstancia" e where e."pagoId"=p.id and e.estado='RETENIDA') end as exigible
      from "obligacionesPago" p join cursos c on c.id=p."cursoId" join users u on u.id=p."usuarioId"
      left join "intentosInscripcion" t on t.id=p."intentoId" left join inscripciones_curso i on i.curso_id=c.id and i.usuario_id=u.id where p.id=$1`,[pago.id])).rows[0];
    const operaciones=(await pool.query(`select id,medio,estado,entorno,"referenciaExterna",clave,instrumento,
      (estado='INICIADO' and "sesionCifrada" is not null and "sesionVenceEn">clock_timestamp()
        and not exists(select 1 from "operacionesPago" tr where tr."pagoId"=$1 and tr.medio='TRANSFERENCIA' and tr.estado in ('INICIADO','INCIERTO','DECLARADO'))) as "sesionRecuperable"
      from "operacionesPago" where "pagoId"=$1 order by numero desc limit 10`,[pago.id])).rows;
    const incidencias=(await pool.query(`select motivo,referencia,"creadoEn" from "incidenciasPago" where "pagoId"=$1 order by id desc limit 10`,[pago.id])).rows;
    const destinoTransferencia=env.transferenciaHabilitada && pago.estado==='PENDIENTE' ? await ofrecerTransferencia(pago.id,{
      banco:env.transferenciaBanco!,titular:env.transferenciaTitular!,cuenta:env.transferenciaCuenta!,cci:env.transferenciaCci!,
    }):await buscarDestinoTransferencia(pago.id)??null;
    const notificaciones=(await pool.query(`select id,tipo,estado,intentos,"enviadoEn","ultimoError" from "notificacionesPago" where "pagoId"=$1 order by "creadoEn" desc limit 10`,[pago.id])).rows;
    const exigible = contexto?.exigible === true;
    const comprobante = pago.estado === 'PAGADO' ? await obtenerComprobante(pago.id) : undefined;
    return {...pago,...contexto,exigible,
      operaciones: operaciones.map(op => ({
        ...op, sesionRecuperable: op.sesionRecuperable && (pasarelas.porMedio(op.medio)?.altas() ?? false),
      })),
      incidencias,transferencias:await listarTransferencias(pago.id),destinoTransferencia,medios:mediosDisponibles(),notificaciones,
      opcionesEnLinea: exigible && pago.estado === 'PENDIENTE' ? opcionesEnLinea(pago) : [],
      comprobante: comprobante?.datos,
    };
  }));
  app.post('/api/pagos/:id/intentos',{bodyLimit:4096},async(request:ConPago,reply)=>ejecutar(reply,async()=>{
    reply.header('Cache-Control','private, no-store');
    const pago=await pagoAutorizado(request);
    if (String(pago.usuarioId)!==String(request.usuario!.id)) throw new ErrorPago(403,'SIN_PERMISO','Solo el propietario puede iniciar su pago.');
    const entrada=entradaIntento.parse(request.body);
    return iniciarPago(pago,request.usuario!.id,entrada);
  }));
  app.post('/api/pagos/:id/intentos/:operacionId/sesion',{bodyLimit:4096},async(
    request: FastifyRequest<{Params:{id:string;operacionId:string}}>, reply,
  )=>ejecutar(reply,async()=>{
    reply.header('Cache-Control','private, no-store');
    const pago = await pagoAutorizado(request);
    if (String(pago.usuarioId)!==String(request.usuario!.id)) throw new ErrorPago(403,'SIN_PERMISO','Solo el propietario puede recuperar la sesión.');
    const operacion = await buscarOperacion(z.uuid().parse(request.params.operacionId));
    if (!operacion || operacion.pagoId !== pago.id) throw new ErrorPago(404,'OPERACION_NO_EXISTE','La operación no pertenece a esta obligación.');
    return recuperarPagoEnLinea(operacion);
  }));
  app.get('/api/pagos/:id/comprobante',async(request: ConPago, reply)=>ejecutar(reply,async()=>{
    reply.header('Cache-Control','private, no-store');
    const pago = await pagoAutorizado(request);
    if (pago.estado !== 'PAGADO') throw new ErrorPago(409, 'PAGO_PENDIENTE', 'El comprobante estará disponible cuando se confirme el pago.');
    const comprobante = await obtenerComprobante(pago.id);
    if (!comprobante) throw new ErrorPago(409, 'COMPROBANTE_NO_DISPONIBLE', 'El comprobante requiere revisión del CPPP.');
    return reply.type('application/pdf').header('X-Content-Type-Options','nosniff')
      .header('Content-Disposition',`attachment; filename="comprobante-${pago.id}.pdf"`).send(pdfComprobante(comprobante.texto));
  }));
  app.post('/api/pagos/:id/efectivo',{bodyLimit:4096},async(request:ConPago,reply)=>ejecutar(reply,async()=>{
    const pago=await pagoAutorizado(request);
    const datos=entradaRecepcionEfectivo.parse(request.body);
    await registrarEfectivo(pago.id,request.usuario!.id,datos.referencia,datos);
    return reply.header('Cache-Control','private, no-store').send(await obtenerPago(pago.id));
  }));
  app.post('/api/pagos/:id/transferencias',{bodyLimit:8*1024*1024},async(request:ConPago,reply)=>ejecutar(reply,async()=>{
    reply.header('Cache-Control','private, no-store');
    const pago=await pagoAutorizado(request);
    const {voucher,...datos}=entradaSubidaVoucher.parse(request.body);
    const operacion=await declararTransferencia(pago.id,request.usuario!.id,datos,validarArchivoVoucher(voucher));
    return reply.code(operacion.nueva?201:200).send({operacionId:operacion.id,estado:operacion.estado});
  }));
  app.get('/api/pagos/:id/transferencias/:operacionId/voucher',async(request:FastifyRequest<{Params:{id:string;operacionId:string}}>,reply)=>ejecutar(reply,async()=>{
    reply.header('Cache-Control','private, no-store');
    const pago=await pagoAutorizado(request);const operacionId=z.uuid().parse(request.params.operacionId);
    const archivo=await obtenerVoucher(pago.id,operacionId);
    const extension=archivo.tipo==='application/pdf'?'pdf':archivo.tipo==='image/png'?'png':'jpg';
    return reply.type(archivo.tipo).header('Content-Disposition',`attachment; filename="voucher-${operacionId}.${extension}"`)
      .header('X-Content-Type-Options','nosniff').header('Content-Security-Policy',"sandbox; default-src 'none'").send(archivo.contenido);
  }));
  app.put('/api/pagos/:id/transferencias/:operacionId/voucher',{bodyLimit:8*1024*1024},async(request:FastifyRequest<{Params:{id:string;operacionId:string}}>,reply)=>ejecutar(reply,async()=>{
    reply.header('Cache-Control','private, no-store');const pago=await pagoAutorizado(request);
    return {voucherId:await reponerVoucher(pago.id,z.uuid().parse(request.params.operacionId),request.usuario!.id,request.body)};
  }));
  app.post('/api/pagos/:id/transferencias/:operacionId/revision',{bodyLimit:4096},async(request:FastifyRequest<{Params:{id:string;operacionId:string}}>,reply)=>ejecutar(reply,async()=>{
    reply.header('Cache-Control','private, no-store');
    const pago=await pagoAutorizado(request);
    return {estado:await revisarTransferencia(pago.id,z.uuid().parse(request.params.operacionId),request.usuario!.id,entradaRevisionTransferencia.parse(request.body))};
  }));
}
