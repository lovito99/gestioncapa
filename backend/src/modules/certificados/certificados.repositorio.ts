import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../../shared/database.js';
import { transaccion, obtenerCurso } from '../cursos/cursos.repositorio.js';
import type { UsuarioAutenticado } from '../../plugins/autorizacion.js';
import { ocultarDni } from '../historial/historial.modelo.js';
import { crearConstancia } from './certificados.pdf.js';
import { ErrorCertificado, type DatosDocumento, type FilaCierre } from './certificados.modelo.js';

export type CursoEmision = { id: string; estado: string; titulo: string; modalidad: string; costo: number; tipoCertificado: string; horasLectivas: number; instructorNombre: string };
export async function cursoAdministrable(cliente: PoolClient, id: string, actor: UsuarioAutenticado) {
  const curso = (await cliente.query<CursoEmision>(`select c.id::text,c.estado,c.titulo,c.modalidad,c.costo::float8,c.tipo_certificado as "tipoCertificado",
    c.horas_lectivas as "horasLectivas",i.name as "instructorNombre" from cursos c join users i on i.id=c.instructor_id
    join users a on a.id=$2 and a.organization_id=c.organization_id and a.role='admin' and a.active
    where c.id=$1 for update of c`, [id,actor.id])).rows[0];
  if (!curso) {
    const existe=(await cliente.query('select 1 from cursos where id=$1',[id])).rowCount;
    throw new ErrorCertificado(existe ? 403 : 404,existe ? 'SIN_PERMISO':'CURSO_NO_EXISTE',existe ? 'No tienes permiso para gestionar certificados de este curso.':'El curso no existe.');
  }
  return curso;
}
export function validarAlcance(curso: CursoEmision) {
  if (curso.modalidad!=='PRESENCIAL' || curso.tipoCertificado!=='PARTICIPACION' || curso.costo>0) {
    throw new ErrorCertificado(409,'CERTIFICACION_FUERA_ALCANCE','Esta entrega emite constancias presenciales gratuitas sin examen. Los cursos con costo requieren confirmación del pago en HU-32.');
  }
}
export async function filasCierre(cliente: PoolClient, cursoId: string): Promise<FilaCierre[]> {
  const filas = (await cliente.query<{ id: string; nombre: string; presentes: number; sesiones: number }>(`select u.id::text,u.name as nombre,
    count(s.id)::int as sesiones,count(a.id)::int as presentes
    from inscripciones_curso ins join users u on u.id=ins.usuario_id join cursos c on c.id=ins.curso_id and c.organization_id=u.organization_id
    left join classes s on s.curso_id=c.id and s.organization_id=c.organization_id and s.estado='PROGRAMADA'
    left join attendances a on a.class_id=s.id and a.user_id=u.id and a.organization_id=c.organization_id
    where c.id=$1 and ins.estado<>'PENDIENTE_PAGO' group by u.id order by u.name,u.id`,[cursoId])).rows;
  return filas.map(f => ({ agremiado:{id:f.id,nombre:f.nombre}, presentes:f.presentes,sesiones:f.sesiones,
    porcentaje:f.sesiones ? Math.round(f.presentes*10000/f.sesiones)/100 : 0, cumple:f.sesiones>0 && f.presentes*100>=f.sesiones*80 }));
}
export async function auditar(cliente: PoolClient, actor: UsuarioAutenticado, cursoId: string, accion: string, codigo: string | null = null, motivo: string | null = null) {
  await cliente.query('insert into "auditoriaCertificados"("actorId","cursoId",accion,codigo,motivo) values($1,$2,$3,$4,$5)',[actor.id,cursoId,accion,codigo,motivo]);
}
export async function emitir(cliente: PoolClient, curso: CursoEmision, usuarioId: string, actor: UsuarioAutenticado, motivo?: string, nombreCorregido?: string, anterior?: DatosDocumento) {
  const persona = (await cliente.query<{ nombre:string; dni:string|null }>('select name as nombre,dni from users where id=$1',[usuarioId])).rows[0]!;
  const fechas = (await cliente.query<{ inicio:string; fin:string }>(`select to_char(min(fecha),'YYYY-MM-DD') as inicio,to_char(max(fecha),'YYYY-MM-DD') as fin from classes where curso_id=$1 and estado='PROGRAMADA'`,[curso.id])).rows[0]!;
  const datos: DatosDocumento = { ...(anterior ?? { nombre:persona.nombre,dniEnmascarado:ocultarDni(persona.dni),curso:curso.titulo,modalidad:curso.modalidad,
    horasLectivas:curso.horasLectivas,fechaInicio:fechas.inicio,fechaFin:fechas.fin,instructorNombre:curso.instructorNombre,tipo:'PARTICIPACION',demo:true }),
    ...(nombreCorregido ? {nombre:nombreCorregido} : {}) };
  const codigo = `CPPP-${randomBytes(16).toString('hex').toUpperCase()}`;
  const emitidoEn = new Date().toISOString();
  const archivo = await crearConstancia(datos,codigo,emitidoEn);
  await cliente.query(`insert into certificados_curso(curso_id,usuario_id,codigo,tipo,emitido_en,archivo,datos,"porExcepcion") values($1,$2,$3,$4,$5,$6,$7,$8)`,
    [curso.id,usuarioId,codigo,datos.tipo,emitidoEn,archivo,datos,!!motivo]);
  await auditar(cliente,actor,curso.id,motivo ? 'EXCEPCION':'EMITIR',codigo,motivo);
  return {codigo,datos};
}
export async function vistaCierre(id: string, actor: UsuarioAutenticado, certificados = false) {
  return transaccion(async cliente => {
    const curso = await cursoAdministrable(cliente,id,actor);
    if (!certificados && curso.estado==='CERRADO') throw new ErrorCertificado(409,'CURSO_CERRADO','El curso ya está cerrado. Consulta sus certificados.');
    if (!certificados) validarAlcance(curso);
    if (!certificados && curso.estado!=='PUBLICADO') throw new ErrorCertificado(409,'CURSO_NO_PUBLICADO','Publica el curso antes de cerrarlo.');
    const filas = await filasCierre(cliente,id);
    const emitidos = (await cliente.query<{ usuarioId:string; codigo:string; estado:string; nombre:string; porExcepcion:boolean }>(`select usuario_id::text as "usuarioId",codigo,estado,coalesce(datos->>'nombre',u.name) as nombre,"porExcepcion" from certificados_curso cert join users u on u.id=cert.usuario_id where curso_id=$1 and estado<>'REEMPLAZADO'`,[id])).rows;
    return {curso:await obtenerCurso(id),requisitoAsistencia:80,filas:certificados ? filas.map(f=>{
      const certificado=emitidos.find(c=>c.usuarioId===f.agremiado.id);
      return {...f,porExcepcion:certificado?.porExcepcion ?? false,certificado:certificado ? {codigo:certificado.codigo,estado:certificado.estado,nombre:certificado.nombre}:null};
    }):filas};
  });
}
export async function cerrarCurso(id:string, actor:UsuarioAutenticado, excepciones:{agremiadoId:string;motivo:string}[]) {
  return transaccion(async cliente => {
    const curso=await cursoAdministrable(cliente,id,actor); validarAlcance(curso);
    if(curso.estado==='CERRADO') return {emitidos:(await cliente.query('select count(*)::int as total from certificados_curso where curso_id=$1 and estado<>\'REEMPLAZADO\'',[id])).rows[0].total,yaCerrado:true};
    if(curso.estado!=='PUBLICADO') throw new ErrorCertificado(409,'CURSO_NO_PUBLICADO','Publica el curso antes de cerrarlo.');
    await cliente.query('select id from classes where curso_id=$1 for update',[id]);
    const periodo=(await cliente.query<{ sesiones:number; terminado:boolean; enPlazo:boolean }>(`select count(*)::int as sesiones,
      max(fecha+hora_fin)<=(now() at time zone 'America/Lima') as terminado,
      max(fecha+hora_fin)+interval '7 days'>=(now() at time zone 'America/Lima') as "enPlazo"
      from classes where curso_id=$1 and estado='PROGRAMADA'`,[id])).rows[0]!;
    if(!periodo.sesiones || !periodo.terminado) throw new ErrorCertificado(409,'SESIONES_PENDIENTES','El curso debe tener sesiones y todas deben haber terminado para cerrarlo.');
    if(!periodo.enPlazo) throw new ErrorCertificado(409,'CIERRE_FUERA_PLAZO','El cierre automático de constancias debe realizarse dentro de los siete días siguientes a la última sesión.');
    const filas=await filasCierre(cliente,id); const razones=new Map(excepciones.map(e=>[e.agremiadoId,e.motivo]));
    if(razones.size!==excepciones.length || excepciones.some(e=>!filas.some(f=>f.agremiado.id===e.agremiadoId))) throw new ErrorCertificado(422,'EXCEPCION_INVALIDA','Cada excepción debe corresponder a un inscrito distinto del curso.');
    const anteriores=(await cliente.query<{usuarioId:string}>('select usuario_id::text as "usuarioId" from certificados_curso where curso_id=$1 and estado<>\'REEMPLAZADO\'',[id])).rows;
    const existentes=new Set(anteriores.map(c=>c.usuarioId));
    let emitidos=anteriores.length;
    for(const fila of filas) if(!existentes.has(fila.agremiado.id) && (fila.cumple || razones.has(fila.agremiado.id))) {
      await emitir(cliente,curso,fila.agremiado.id,actor,razones.get(fila.agremiado.id)); emitidos++;
    }
    await cliente.query(`update cursos set estado='CERRADO',"cerradoEn"=now() where id=$1`,[id]);
    await cliente.query(`update inscripciones_curso set estado='TERMINADO',terminado_en=now() where curso_id=$1 and estado='EN_CURSO'`,[id]);
    await auditar(cliente,actor,id,'CERRAR');
    return {emitidos};
  });
}
export async function excepcionCerrado(id:string, usuarioId:string, motivo:string, actor:UsuarioAutenticado) {
  return transaccion(async cliente=>{
    const curso=await cursoAdministrable(cliente,id,actor); validarAlcance(curso);
    if(curso.estado!=='CERRADO') throw new ErrorCertificado(409,'CURSO_NO_CERRADO','Cierra el curso antes de emitir una excepción posterior.');
    const filas=await filasCierre(cliente,id);
    if(!filas.some(f=>f.agremiado.id===usuarioId)) throw new ErrorCertificado(403,'SIN_PERMISO','El colegiado no pertenece a este curso.');
    if((await cliente.query('select id from certificados_curso where curso_id=$1 and usuario_id=$2',[id,usuarioId])).rowCount) throw new ErrorCertificado(409,'CERTIFICADO_EXISTENTE','Ya existe un certificado para este colegiado.');
    return emitir(cliente,curso,usuarioId,actor,motivo);
  });
}

export type RegistroCertificado = { id:string; cursoId:string; usuarioId:string; estado:string; codigo:string; reemplazadoPor:string|null; emitidoEn:string; datos:DatosDocumento; archivo:Buffer | null };
export async function buscarCertificado(codigo:string, cliente:Pick<PoolClient,'query'>=pool, incluirArchivo=false) {
  return (await cliente.query<RegistroCertificado>(`select cert.id::text,cert.curso_id::text as "cursoId",cert.usuario_id::text as "usuarioId",cert.estado,cert.codigo,cert."reemplazadoPor",
    to_char(cert.emitido_en at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as "emitidoEn",case when $2::boolean then cert.archivo else null end as archivo,
    coalesce(cert.datos,jsonb_build_object('nombre',u.name,'dniEnmascarado',null,'curso',c.titulo,'horasLectivas',c.horas_lectivas,'tipo',cert.tipo,
      'modalidad',c.modalidad,'fechaInicio',coalesce(c.fecha_inicio,(select min(fecha) from classes where curso_id=c.id))::text,'fechaFin',coalesce(c.fecha_fin,(select max(fecha) from classes where curso_id=c.id))::text,'instructorNombre',i.name,'demo',true)) as datos
    from certificados_curso cert join cursos c on c.id=cert.curso_id join users u on u.id=cert.usuario_id join users i on i.id=c.instructor_id where cert.codigo=$1`,[codigo,incluirArchivo])).rows[0];
}
export async function modificarCertificado(codigo:string, actor:UsuarioAutenticado, motivo:string, nombre?:string) {
  return transaccion(async cliente=>{
    const inicial=await buscarCertificado(codigo,cliente);
    if(!inicial) throw new ErrorCertificado(404,'CERTIFICADO_NO_EXISTE','No encontramos ese certificado.');
    const curso=await cursoAdministrable(cliente,inicial.cursoId,actor);
    const actual=await buscarCertificado(codigo,cliente);
    if(!actual || actual.estado!=='VALIDO') throw new ErrorCertificado(409,'CERTIFICADO_NO_VIGENTE','El certificado ya fue anulado o reemplazado.');
    if(!nombre) {
      await cliente.query(`update certificados_curso set estado='ANULADO' where codigo=$1`,[codigo]);
      await auditar(cliente,actor,curso.id,'ANULAR',codigo,motivo); return null;
    }
    validarAlcance(curso);
    // Se libera el índice parcial antes de insertar el reemplazo. El FK se comprueba al commit.
    const nuevoCodigo=`CPPP-${randomBytes(16).toString('hex').toUpperCase()}`;
    await cliente.query(`update certificados_curso set estado='REEMPLAZADO',"reemplazadoPor"=$2 where codigo=$1`,[codigo,nuevoCodigo]);
    const datos={...actual.datos,nombre}; const emitidoEn=new Date().toISOString();
    const archivo=await crearConstancia(datos,nuevoCodigo,emitidoEn);
    await cliente.query(`insert into certificados_curso(curso_id,usuario_id,codigo,tipo,emitido_en,archivo,datos,"porExcepcion")
      select curso_id,usuario_id,$2,tipo,$3,$4,$5,"porExcepcion" from certificados_curso where codigo=$1`,[codigo,nuevoCodigo,emitidoEn,archivo,datos]);
    await auditar(cliente,actor,curso.id,'CORREGIR',codigo,motivo);
    return {codigo:nuevoCodigo};
  });
}
