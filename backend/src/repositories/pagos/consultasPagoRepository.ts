import { pool } from '../../shared/database.js';
import { redis } from '../../shared/redis.js';
import type { InstrumentoPago, OperacionPago } from '../../entities/pagos/pago.js';

type Entorno = OperacionPago['entorno'];
export type FilaComprobante = {
    operacionId: string; medio: string; instrumento: InstrumentoPago | null; referencia: string;
    fecha: string; baseCentimos: number; totalCentimos: number; curso: string; concepto: string;
    estadoCorreo: string | null; texto: string | null;
  };

/** Contexto de la obligación: curso, participante y si todavía se puede cobrar. */
export async function contextoPago(pagoId: string) {
  return (await pool.query(`select c.titulo as "cursoTitulo",u.name as "participanteNombre",t."venceEn",
      case when p.concepto='CURSO' then t.estado='PENDIENTE_PAGO' and t."venceEn">clock_timestamp() and i."intentoId"=t.id
        else exists(select 1 from "entregasConstancia" e where e."pagoId"=p.id and e.estado='RETENIDA') end as exigible
      from "obligacionesPago" p join cursos c on c.id=p."cursoId" join users u on u.id=p."usuarioId"
      left join "intentosInscripcion" t on t.id=p."intentoId" left join inscripciones_curso i on i.curso_id=c.id and i.usuario_id=u.id where p.id=$1`,[pagoId])).rows[0];
}
export async function operacionesRecientes(pagoId: string) {
  return (await pool.query<{ id: string; medio: string; estado: string; sesionRecuperable: boolean } & Record<string, unknown>>(`select id,medio,estado,entorno,"referenciaExterna",clave,instrumento,
      (estado='INICIADO' and "sesionCifrada" is not null and "sesionVenceEn">clock_timestamp()
        and not exists(select 1 from "operacionesPago" tr where tr."pagoId"=$1 and tr.medio='TRANSFERENCIA' and tr.estado in ('INICIADO','INCIERTO','DECLARADO'))) as "sesionRecuperable"
      from "operacionesPago" where "pagoId"=$1 order by numero desc limit 10`,[pagoId])).rows;
}
export async function incidenciasPago(pagoId: string) {
  return (await pool.query(`select motivo,referencia,"creadoEn" from "incidenciasPago" where "pagoId"=$1 order by id desc limit 10`,[pagoId])).rows;
}
export async function notificacionesPago(pagoId: string) {
  return (await pool.query(`select id,tipo,estado,intentos,"enviadoEn","ultimoError" from "notificacionesPago" where "pagoId"=$1 order by "creadoEn" desc limit 10`,[pagoId])).rows;
}

export async function intentoExiste(intentoId: string) {
  return Boolean((await pool.query('select id from "intentosInscripcion" where id=$1', [intentoId])).rowCount);
}

/** La vigencia oficial de la sesión de Izipay es 15 min; se reserva un margen para transporte y reloj. */
export async function guardarSesionCifrada(operacionId: string, sesionCifrada: string) {
  await pool.query(`update "operacionesPago" set "sesionCifrada"=$2,"sesionVenceEn"=clock_timestamp()+interval '14 minutes'
    where id=$1 and estado='INICIADO'`,[operacionId,sesionCifrada]);
}
/** Sesión cifrada solo si la operación y su obligación siguen siendo cobrables. */
export async function leerSesionCifrada(operacionId: string, entorno: Entorno) {
  return (await pool.query<{sesionCifrada:string}>(`select o."sesionCifrada" from "operacionesPago" o
    join "obligacionesPago" p on p.id=o."pagoId"
    join "intentosInscripcion" t on t.id=p."intentoId"
    left join inscripciones_curso ins on ins.curso_id=t."cursoId" and ins.usuario_id=t."usuarioId"
    where o.id=$1 and o.entorno=$2 and o.estado='INICIADO' and p.estado='PENDIENTE' and o."sesionVenceEn">clock_timestamp()
    and (case when p.concepto='CURSO' then t.estado='PENDIENTE_PAGO' and t."venceEn">clock_timestamp() and ins."intentoId"=t.id
      else exists(select 1 from "entregasConstancia" e where e."pagoId"=p.id and e.estado='RETENIDA') end)
    and not exists(select 1 from "incidenciasPago" i where i."pagoId"=o."pagoId")
    and not exists(select 1 from "operacionesPago" tr where tr."pagoId"=o."pagoId" and tr.medio='TRANSFERENCIA' and tr.estado in ('INICIADO','INCIERTO','DECLARADO'))`,[operacionId,entorno])).rows[0]?.sesionCifrada;
}

export async function limpiarSesionesVencidas() {
  await pool.query(`update "operacionesPago" set "sesionCifrada"=null,"sesionVenceEn"=null
    where "sesionCifrada" is not null and (estado='CONFIRMADO' or "sesionVenceEn"<=clock_timestamp())`);
}
/** Lote de operaciones a conciliar; los casos que necesitan referencia manual no consumen el lote. */
export async function operacionesPorConciliar(entorno: Entorno, medios: string[], mediosConReferencia: string[]) {
  return (await pool.query<{ id: string }>(`
    select id from "operacionesPago"
    where estado in ('INICIADO','INCIERTO') and entorno=$1
      and "creadoEn"<clock_timestamp()-interval '30 seconds'
      and medio=any($2::varchar[]) and ("referenciaExterna" is not null or medio<>all($3::varchar[]))
    order by "actualizadoEn",numero limit 3`,
  [entorno, medios, mediosConReferencia])).rows;
}
/** Incluso una consulta fallida cede su turno al siguiente lote. */
export async function cederTurno(operacionId: string) {
  await pool.query('update "operacionesPago" set "actualizadoEn"=clock_timestamp() where id=$1', [operacionId]);
}
export async function contarPendientes(entorno: Entorno) {
  return (await pool.query<{ total: number }>(`
    select count(*)::int as total from "operacionesPago"
    where estado in ('INICIADO','INCIERTO') and entorno=$1`, [entorno])).rows[0]!.total;
}

export async function guardarReferenciaExterna(operacionId: string, referencia: string) {
  await pool.query('update "operacionesPago" set "referenciaExterna"=coalesce("referenciaExterna",$2) where id=$1',[operacionId,referencia]);
}

export async function leerComprobante(pagoId: string) {
  return (await pool.query<FilaComprobante>(`select h."operacionId",h.medio,o.instrumento,h.referencia,
      coalesce(r."fechaRecepcion"::text,t."fechaOperacion"::text,h."verificadoEn"::text) as fecha,
      p."importeCentimos"::float8 as "baseCentimos",h."importeCentimos"::float8 as "totalCentimos",
      c.titulo as curso,p.concepto,n.estado as "estadoCorreo",n.texto
    from "obligacionesPago" p join cursos c on c.id=p."cursoId"
    join "hechosPago" h on h."pagoId"=p.id and h.medio=p.medio
    join "operacionesPago" o on o.id=h."operacionId"
    left join "recepcionesEfectivo" r on r."operacionId"=o.id
    left join "transferenciasPago" t on t."operacionId"=o.id
    left join "notificacionesPago" n on n."operacionId"=o.id and n.tipo='COMPROBANTE'
    where p.id=$1 and p.estado='PAGADO' order by h.id limit 1`, [pagoId])).rows[0];
}

/** Cuenta las notificaciones de una pasarela por origen en ventanas de 60 s; devuelve el total de la ventana. */
export async function contarNotificaciones(clave: string) {
  return Number(await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",1,clave));
}
