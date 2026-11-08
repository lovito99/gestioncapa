import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { pool } from '../../shared/database.js';
import { textoObligatorio } from '../../shared/validacion.js';
import { cierreEntrada, ErrorCertificado, motivoCertificado } from './certificados.modelo.js';
import { buscarCertificado, cerrarCurso, excepcionCerrado, modificarCertificado, vistaCierre } from './certificados.repositorio.js';

type ConId = FastifyRequest<{Params:{id:string}}>;
type ConCodigo = FastifyRequest<{Params:{codigo:string}}>;
const codigoDe = (request:ConCodigo) => request.params.codigo.trim().toUpperCase().replace(/\s+/g,'');
function validarId(id:string) {
  if(!/^[1-9]\d{0,14}$/.test(id)) throw new ErrorCertificado(404,'CURSO_NO_EXISTE','El curso no existe.');
}
export async function registrarCertificados(app:FastifyInstance) {
  app.addHook('onRequest',async (request,reply)=>{ reply.header('Cache-Control','no-store'); });
  app.setErrorHandler((error,request,reply)=>{
    if(error instanceof ErrorCertificado) return reply.code(error.status).send({code:error.code,message:error.message});
    throw error;
  });
  app.get('/api/cursos/:id/cierre',async(request:ConId)=>{
    validarId(request.params.id); return vistaCierre(request.params.id,request.usuario!);
  });
  app.post('/api/cursos/:id/cerrar',async(request:ConId)=>{
    validarId(request.params.id); const datos=cierreEntrada.parse(request.body ?? {});
    return cerrarCurso(request.params.id,request.usuario!,datos.excepciones);
  });
  app.get('/api/cursos/:id/certificados',async(request:ConId)=>{
    validarId(request.params.id); return vistaCierre(request.params.id,request.usuario!,true);
  });
  app.post('/api/cursos/:id/excepciones',async(request:ConId,reply)=>{
    validarId(request.params.id);
    const datos=z.object({agremiadoId:z.string().regex(/^[1-9]\d{0,14}$/,'Selecciona un colegiado válido.'),motivo:motivoCertificado}).strict().parse(request.body);
    const certificado=await excepcionCerrado(request.params.id,datos.agremiadoId,datos.motivo,request.usuario!);
    return reply.code(201).send({codigo:certificado.codigo});
  });
  app.get('/api/certificados/:codigo',async(request:ConCodigo)=>{
    const codigo=codigoDe(request);
    if(!/^[A-Z0-9-]{4,100}$/.test(codigo)) throw new ErrorCertificado(404,'CERTIFICADO_NO_EXISTE','No encontramos un certificado con ese código.');
    const certificado=await buscarCertificado(codigo);
    if(!certificado) throw new ErrorCertificado(404,'CERTIFICADO_NO_EXISTE','No encontramos un certificado con ese código.');
    const {nombre,curso,horasLectivas,tipo,demo}=certificado.datos;
    return {codigo:certificado.codigo,estado:certificado.estado,reemplazadoPor:certificado.reemplazadoPor,nombre,curso,horasLectivas,tipo,emitidoEn:certificado.emitidoEn,demo};
  });
  for(const archivo of [false,true]) app.get(`/api/certificados/:codigo/${archivo ? 'archivo':'documento'}`,async(request:ConCodigo,reply)=>{
    const certificado=await buscarCertificado(codigoDe(request),pool,archivo);
    if(!certificado) throw new ErrorCertificado(404,'CERTIFICADO_NO_EXISTE','No encontramos ese certificado.');
    const actor=request.usuario!;
    const permiso=(await pool.query(`select 1 from users a join users u on true where a.id=$1 and u.id=$2 and (a.id=u.id or a.role='admin')`,[actor.id,certificado.usuarioId])).rowCount;
    if(!permiso) throw new ErrorCertificado(403,'SIN_PERMISO','No tienes permiso para descargar este certificado.');
    if(certificado.estado!=='VALIDO') throw new ErrorCertificado(409,'CERTIFICADO_NO_VIGENTE','El certificado fue anulado o reemplazado. Consulta su verificación pública.');
    if(archivo) return reply.type('application/pdf').header('Content-Disposition',`attachment; filename="constancia-${certificado.codigo}.pdf"`).send(certificado.archivo);
    return {...certificado.datos,codigo:certificado.codigo,estado:certificado.estado,reemplazadoPor:certificado.reemplazadoPor,emitidoEn:certificado.emitidoEn};
  });
  app.post('/api/certificados/:codigo/anular',async(request:ConCodigo,reply)=>{
    const datos=z.object({motivo:motivoCertificado}).strict().parse(request.body);
    await modificarCertificado(codigoDe(request),request.usuario!,datos.motivo);
    return reply.code(204).send();
  });
  app.post('/api/certificados/:codigo/corregir',async(request:ConCodigo,reply)=>{
    const datos=z.object({motivo:motivoCertificado,nombre:textoObligatorio('Ingresa el nombre corregido.').pipe(z.string().max(161,'El nombre debe tener como máximo 161 caracteres.'))}).strict().parse(request.body);
    return reply.code(201).send(await modificarCertificado(codigoDe(request),request.usuario!,datos.motivo,datos.nombre));
  });
}
