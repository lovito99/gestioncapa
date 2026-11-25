import type { PoolClient } from 'pg';
import { pool, type Consultor } from '../../shared/database.js';
import { conTransaccion } from '../../shared/transaccion.js';
import type { PublicUser } from '../../entities/auth/usuarioPublico.js';
import { aFilaCierre, type CursoEmision, type DatosDocumento, type FilaCierre, type RegistroCertificado } from '../../entities/certificados/certificado.js';
import { crearObligacion } from '../pagos/pagosRepository.js';
import { encolarAvisoCurso } from '../notificaciones/avisosCorreoRepository.js';

/** Transacción del cierre o la emisión; el curso se bloquea antes que sus sesiones e inscripciones. */
export const transaccion = <T>(trabajo: (cliente: PoolClient) => Promise<T>) => conTransaccion(pool, trabajo);
export type ClienteTransaccion = PoolClient;

/** Curso bloqueado si el actor es un administrador activo; undefined en otro caso. */
export async function bloquearCursoAdministrable(cliente: PoolClient, id: string, actorId: number | string) {
  return (await cliente.query<CursoEmision>(`select c.id::text,c.estado,c.titulo,c.modalidad,c.costo::float8,c.tipo_certificado as "tipoCertificado",
    c."modalidadCobro",c.horas_lectivas as "horasLectivas",i.name as "instructorNombre" from cursos c join users i on i.id=c.instructor_id
    join users a on a.id=$2 and a.role='admin' and a.active
    where c.id=$1 for update of c`, [id, actorId])).rows[0];
}
export async function existeCurso(cliente: PoolClient, id: string) {
  return Boolean((await cliente.query('select 1 from cursos where id=$1', [id])).rowCount);
}

/** Inscritos con acceso vigente y su asistencia a las sesiones programadas. */
export async function filasCierre(cliente: PoolClient, cursoId: string): Promise<FilaCierre[]> {
  const filas = (await cliente.query<{ id: string; nombre: string; presentes: number; sesiones: number }>(`select u.id::text,u.name as nombre,
    count(s.id)::int as sesiones,count(a.id)::int as presentes
    from inscripciones_curso ins join users u on u.id=ins.usuario_id join cursos c on c.id=ins.curso_id
    left join classes s on s.curso_id=c.id and s.estado='PROGRAMADA'
    left join attendances a on a.class_id=s.id and a.user_id=u.id
    where c.id=$1 and ins.estado in ('EN_CURSO','TERMINADO') and "tieneAccesoCurso"(c.id,u.id) group by u.id order by u.name,u.id`, [cursoId])).rows;
  return filas.map(aFilaCierre);
}

export async function auditar(cliente: PoolClient, actor: Pick<PublicUser, 'id'>, cursoId: string, accion: string, codigo: string | null = null, motivo: string | null = null) {
  await cliente.query('insert into "auditoriaCertificados"("actorId","cursoId",accion,codigo,motivo) values($1,$2,$3,$4,$5)', [actor.id, cursoId, accion, codigo, motivo]);
}

export async function persona(cliente: PoolClient, usuarioId: string) {
  return (await cliente.query<{ nombre: string; dni: string | null }>('select name as nombre,dni from users where id=$1', [usuarioId])).rows[0]!;
}
export async function fechasCurso(cliente: PoolClient, cursoId: string) {
  return (await cliente.query<{ inicio: string; fin: string }>(`select to_char(min(fecha),'YYYY-MM-DD') as inicio,to_char(max(fecha),'YYYY-MM-DD') as fin from classes where curso_id=$1 and estado='PROGRAMADA'`, [cursoId])).rows[0]!;
}

export async function insertarCertificado(cliente: PoolClient, datos: { cursoId: string; usuarioId: string; codigo: string; emitidoEn: string; archivo: Uint8Array; documento: DatosDocumento; porExcepcion: boolean }) {
  return (await cliente.query<{ id: string }>(`insert into certificados_curso
    (curso_id,usuario_id,codigo,tipo,emitido_en,archivo,datos,"porExcepcion")
    values($1,$2,$3,$4,$5,$6,$7,$8) returning id::text`,
  [datos.cursoId, datos.usuarioId, datos.codigo, datos.documento.tipo, datos.emitidoEn, datos.archivo, datos.documento, datos.porExcepcion])).rows[0]!;
}

export async function avisarConstancia(cliente: PoolClient, cursoId: string, usuarioId: string, eventoId: string, detalles: string[]) {
  await encolarAvisoCurso(cliente, { tipo: 'CONSTANCIA_EMITIDA', cursoId, usuarioId, eventoId, detalles });
}

export async function intentoInscripcion(cliente: PoolClient, cursoId: string, usuarioId: string) {
  return (await cliente.query<{ id: string; modalidadCobro: string; importeCentimos: number }>(`select t.id,t."modalidadCobro",t."importeCentimos"::float8 from inscripciones_curso i
    join "intentosInscripcion" t on t.id=i."intentoId" where i.curso_id=$1 and i.usuario_id=$2`, [cursoId, usuarioId])).rows[0];
}
export async function constanciaGratuitaLegada(cliente: PoolClient, cursoId: string, usuarioId: string) {
  return (await cliente.query<{ gratuita: boolean }>('select "constanciaGratuitaLegada" as gratuita from inscripciones_curso where curso_id=$1 and usuario_id=$2', [cursoId, usuarioId])).rows[0]?.gratuita === true;
}
export async function entregaAnterior(cliente: PoolClient, cursoId: string, usuarioId: string) {
  return (await cliente.query<{ pagoId: string }>('select "pagoId"::text from "entregasConstancia" where "cursoId"=$1 and "usuarioId"=$2', [cursoId, usuarioId])).rows[0];
}

/** Retiene la constancia hasta confirmar el pago: crea la obligación y la entrega pendiente. */
export async function retenerConstancia(cliente: PoolClient, datos: { cursoId: string; usuarioId: string; intentoId: string; importeCentimos: number; actorId: number | string; documento: DatosDocumento; motivo: string | null }) {
  const pago = await crearObligacion(cliente, { cursoId: datos.cursoId, usuarioId: datos.usuarioId, intentoId: datos.intentoId, concepto: 'CONSTANCIA', importeCentimos: datos.importeCentimos, moneda: 'PEN' });
  await cliente.query(`insert into "entregasConstancia"("cursoId","usuarioId","intentoId","pagoId","actorId",datos,motivo) values($1,$2,$3,$4,$5,$6,$7)`,
    [datos.cursoId, datos.usuarioId, datos.intentoId, pago.id, datos.actorId, datos.documento, datos.motivo]);
  await cliente.query('update "intentosInscripcion" set "pagoId"=$2 where id=$1', [datos.intentoId, pago.id]);
  return pago.id;
}

export async function entregasPagadasPendientes() {
  return (await pool.query<{ id: string; cursoId: string }>(`select e.id::text,e."cursoId"::text from "entregasConstancia" e
    join "obligacionesPago" p on p.id=e."pagoId" where e.estado='RETENIDA' and p.estado='PAGADO' order by e.id limit 100`)).rows;
}
export async function bloquearCurso(cliente: PoolClient, cursoId: string) {
  await cliente.query('select id from cursos where id=$1 for update', [cursoId]);
}
export async function entregaPagada(cliente: PoolClient, id: string) {
  return (await cliente.query<{ estado: string; usuarioId: string; actorId: string; datos: DatosDocumento; motivo: string | null }>(`select e.estado,e."usuarioId"::text,e."actorId"::text,e.datos,e.motivo from "entregasConstancia" e
      join "obligacionesPago" p on p.id=e."pagoId" where e.id=$1 and p.estado='PAGADO' for update of e`, [id])).rows[0];
}
export async function usuario(cliente: PoolClient, id: string) {
  return (await cliente.query<PublicUser>('select id,name,email,role from users where id=$1', [id])).rows[0]!;
}
export async function marcarEntregaEmitida(cliente: PoolClient, id: string, codigo: string) {
  await cliente.query(`update "entregasConstancia" set estado='EMITIDA',codigo=$2,"emitidoEn"=clock_timestamp() where id=$1`, [id, codigo]);
}

export async function certificadosDelCurso(cliente: PoolClient, cursoId: string) {
  return (await cliente.query<{ usuarioId: string; codigo: string; estado: string; nombre: string; porExcepcion: boolean }>(`select usuario_id::text as "usuarioId",codigo,estado,coalesce(datos->>'nombre',u.name) as nombre,"porExcepcion" from certificados_curso cert join users u on u.id=cert.usuario_id where curso_id=$1 and estado<>'REEMPLAZADO'`, [cursoId])).rows;
}
export async function entregasDelCurso(cliente: PoolClient, cursoId: string) {
  return (await cliente.query<{ usuarioId: string; estado: string; pagoId: string; estadoPago: string }>(`select e."usuarioId"::text,e.estado,e."pagoId"::text,p.estado as "estadoPago"
      from "entregasConstancia" e join "obligacionesPago" p on p.id=e."pagoId" where e."cursoId"=$1`, [cursoId])).rows;
}
export async function contarCertificados(cliente: PoolClient, cursoId: string) {
  return (await cliente.query('select count(*)::int as total from certificados_curso where curso_id=$1 and estado<>\'REEMPLAZADO\'', [cursoId])).rows[0].total as number;
}
export async function bloquearSesiones(cliente: PoolClient, cursoId: string) {
  await cliente.query('select id from classes where curso_id=$1 for update', [cursoId]);
}
/** Las sesiones deben haber terminado y el cierre ocurrir dentro de los 7 días siguientes a la última. */
export async function periodoCurso(cliente: PoolClient, cursoId: string) {
  return (await cliente.query<{ sesiones: number; terminado: boolean; enPlazo: boolean }>(`select count(*)::int as sesiones,
      max(fecha+hora_fin)<=(now() at time zone 'America/Lima') as terminado,
      max(fecha+hora_fin)+interval '7 days'>=(now() at time zone 'America/Lima') as "enPlazo"
      from classes where curso_id=$1 and estado='PROGRAMADA'`, [cursoId])).rows[0]!;
}
export async function titularesConCertificado(cliente: PoolClient, cursoId: string) {
  return (await cliente.query<{ usuarioId: string }>('select usuario_id::text as "usuarioId" from certificados_curso where curso_id=$1 and estado<>\'REEMPLAZADO\'', [cursoId])).rows;
}
export async function marcarCursoCerrado(cliente: PoolClient, cursoId: string) {
  await cliente.query(`update cursos set estado='CERRADO',"cerradoEn"=now() where id=$1`, [cursoId]);
  await cliente.query(`update inscripciones_curso set estado='TERMINADO',terminado_en=now() where curso_id=$1 and estado='EN_CURSO'`, [cursoId]);
  await cliente.query(`update "intentosInscripcion" set estado='TERMINADO' where "cursoId"=$1 and estado='EN_CURSO'`, [cursoId]);
}
export async function bloquearInscripcionCertificable(cliente: PoolClient, cursoId: string, usuarioId: string) {
  return Boolean((await cliente.query(`
    select 1 from inscripciones_curso i
    join users u on u.id=i.usuario_id and u.active and u.role='agremiado'
    where i.curso_id=$1 and i.usuario_id=$2 and "tieneAccesoCurso"(i.curso_id,i.usuario_id)
    for update of i`, [cursoId, usuarioId])).rowCount);
}
export async function marcarInscripcionTerminada(cliente: PoolClient, cursoId: string, usuarioId: string) {
  await cliente.query(`
    with finalizada as (
      update inscripciones_curso set estado='TERMINADO',terminado_en=now()
      where curso_id=$1 and usuario_id=$2 and estado='EN_CURSO' returning "intentoId"
    )
    update "intentosInscripcion" t set estado='TERMINADO' from finalizada f
    where t.id=f."intentoId" and t.estado='EN_CURSO'`, [cursoId, usuarioId]);
}
export async function certificadoActual(cliente: PoolClient, cursoId: string, usuarioId: string) {
  return (await cliente.query<{ codigo: string; estado: string }>(`
    select codigo,estado from certificados_curso
    where curso_id=$1 and usuario_id=$2 and estado<>'REEMPLAZADO'`, [cursoId, usuarioId])).rows[0];
}
export async function tieneCertificado(cliente: PoolClient, cursoId: string, usuarioId: string) {
  return Boolean((await cliente.query('select id from certificados_curso where curso_id=$1 and usuario_id=$2', [cursoId, usuarioId])).rowCount);
}

export async function buscarCertificado(codigo: string, cliente: Consultor = pool, incluirArchivo = false) {
  return (await cliente.query<RegistroCertificado>(`select cert.id::text,cert.curso_id::text as "cursoId",cert.usuario_id::text as "usuarioId",cert.estado,cert.codigo,cert."reemplazadoPor",
    to_char(cert.emitido_en at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as "emitidoEn",case when $2::boolean then cert.archivo else null end as archivo,
    coalesce(cert.datos,jsonb_build_object('nombre',u.name,'dniEnmascarado',null,'curso',c.titulo,'horasLectivas',c.horas_lectivas,'tipo',cert.tipo,
      'modalidad',c.modalidad,'fechaInicio',coalesce(c.fecha_inicio,(select min(fecha) from classes where curso_id=c.id))::text,'fechaFin',coalesce(c.fecha_fin,(select max(fecha) from classes where curso_id=c.id))::text,'instructorNombre',i.name,'demo',true)) as datos
    from certificados_curso cert join cursos c on c.id=cert.curso_id join users u on u.id=cert.usuario_id join users i on i.id=c.instructor_id where cert.codigo=$1`, [codigo, incluirArchivo])).rows[0];
}
export async function anularCertificado(cliente: PoolClient, codigo: string) {
  await cliente.query(`update certificados_curso set estado='ANULADO' where codigo=$1`, [codigo]);
}
/** Se libera el índice parcial antes de insertar el reemplazo. El FK se comprueba al commit. */
export async function reemplazarCertificado(cliente: PoolClient, codigo: string, nuevoCodigo: string, emitidoEn: string, archivo: Uint8Array, datos: DatosDocumento) {
  await cliente.query(`update certificados_curso set estado='REEMPLAZADO',"reemplazadoPor"=$2 where codigo=$1`, [codigo, nuevoCodigo]);
  await cliente.query(`insert into certificados_curso(curso_id,usuario_id,codigo,tipo,emitido_en,archivo,datos,"porExcepcion")
      select curso_id,usuario_id,$2,tipo,$3,$4,$5,"porExcepcion" from certificados_curso where codigo=$1`, [codigo, nuevoCodigo, emitidoEn, archivo, datos]);
}
/** El titular o un administrador pueden descargar el documento. */
export async function puedeDescargar(actorId: number | string, usuarioId: string) {
  return Boolean((await pool.query(`select 1 from users a join users u on true where a.id=$1 and u.id=$2 and (a.id=u.id or a.role='admin')`, [actorId, usuarioId])).rowCount);
}
