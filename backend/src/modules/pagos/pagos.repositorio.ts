import { randomUUID, createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../../shared/database.js';
import { ErrorPago, type Pago, type OperacionPago, type DeclaracionTransferencia } from './pagos.modelo.js';
import { reservarReferenciaTransferencia,guardarVoucher } from './pagos.archivos.js';
import type { ArchivoVoucher,RecepcionEfectivo } from './pagos.voucher.js';
import { env } from '../../config/env.js';
import { encolarAvisoPago } from './pagos.avisos.js';
import { avisarInscripcionConfirmada } from '../notificaciones/correo.repositorio.js';

const columnasPago = `id::text,"cursoId"::text,"usuarioId"::text,"intentoId",concepto,"importeCentimos"::float8,moneda,estado,medio,"pagadoEn"::text`;
const columnasOperacion = `id,numero::text,"pagoId"::text,medio,clave,"cargaHash",estado,"referenciaExterna",entorno`;
export async function obtenerPago(id: string, cliente: Pick<PoolClient,'query'> = pool) {
  return (await cliente.query<Pago>(`select ${columnasPago} from "obligacionesPago" where id=$1`,[id])).rows[0];
}
export async function crearObligacion(cliente: Pick<PoolClient,'query'>, datos: Pick<Pago,'cursoId'|'intentoId'|'concepto'|'importeCentimos'|'moneda'> & { usuarioId: string | number }) {
  return (await cliente.query<Pago>(`insert into "obligacionesPago"("cursoId","usuarioId","intentoId",concepto,"importeCentimos",moneda)
    values($1,$2,$3,$4,$5,$6) returning ${columnasPago}`,
  [datos.cursoId,datos.usuarioId,datos.intentoId,datos.concepto,datos.importeCentimos,datos.moneda])).rows[0]!;
}
export async function conPago<T>(id: string, trabajo: (cliente: PoolClient, pago: Pago) => Promise<T>) {
  const cliente = await pool.connect();
  try {
    await cliente.query('begin');
    const inicial = await obtenerPago(id, cliente);
    if (!inicial) throw new ErrorPago(404,'PAGO_NO_EXISTE','La obligación no existe.');
    await cliente.query('select id from cursos where id=$1 for update',[inicial.cursoId]);
    await cliente.query('select id from "obligacionesPago" where id=$1 for update',[id]);
    const resultado = await trabajo(cliente, (await obtenerPago(id,cliente))!);
    await cliente.query('commit'); return resultado;
  } catch (error) {
    await cliente.query('rollback');
    if ((error as { code?: string }).code === '23505') throw new ErrorPago(409,'REFERENCIA_REUTILIZADA','La referencia o clave ya se utilizó. Consulta su estado.');
    throw error;
  }
  finally { cliente.release(); }
}
export async function iniciarOperacion(pagoId: string, usuarioId: number, entrada: { medio: 'IZIPAY'|'CULQI'|'TRANSFERENCIA'; clave: string; cargaHash: string; entorno?:'sandbox'|'produccion'; transferencia?:DeclaracionTransferencia; voucher?:ArchivoVoucher }) {
  return conPago(pagoId, async (cliente,pago) => {
    if (String(pago.usuarioId) !== String(usuarioId)) throw new ErrorPago(403,'SIN_PERMISO','No tienes permiso para este pago.');
    if (!(await cliente.query(`select id from users where id=$1 and active and role='agremiado' for share`,[usuarioId])).rowCount) throw new ErrorPago(403,'SIN_PERMISO','El participante no está disponible.');
    const anterior = (await cliente.query<OperacionPago>(`select ${columnasOperacion} from "operacionesPago" where "pagoId"=$1 and clave=$2`,[pagoId,entrada.clave])).rows[0];
    if (anterior) {
      if (anterior.cargaHash !== entrada.cargaHash || anterior.medio !== entrada.medio) throw new ErrorPago(409,'CLAVE_REUTILIZADA','La clave corresponde a otra solicitud.');
      return { ...anterior,nueva:false };
    }
    if (pago.estado === 'PAGADO' && entrada.medio!=='TRANSFERENCIA') throw new ErrorPago(409,'PAGO_CONFIRMADO','El pago ya está confirmado.');
    const condiciones=(await cliente.query<{valido:boolean}>(`select case when $2='CURSO' then t.estado='PENDIENTE_PAGO' and t."venceEn">clock_timestamp() and i."intentoId"=t.id
      else exists(select 1 from "entregasConstancia" e where e."intentoId"=t.id and e."pagoId"=$3 and e.estado='RETENIDA') end as valido
      from "intentosInscripcion" t left join inscripciones_curso i on i.curso_id=t."cursoId" and i.usuario_id=t."usuarioId" where t.id=$1`,[pago.intentoId,pago.concepto,pago.id])).rows[0];
    if (condiciones && !condiciones.valido && entrada.medio!=='TRANSFERENCIA') throw new ErrorPago(409,'RESERVA_NO_VIGENTE','La reserva venció o la obligación todavía no es exigible.');
    if (entrada.medio==='TRANSFERENCIA') {
      if (!(await cliente.query(`select 1 from "destinosTransferencia" where id=$1 and "pagoId"=$2`,[entrada.transferencia?.destinoId,pagoId])).rowCount) throw new ErrorPago(422,'DESTINO_INVALIDO','El destino no pertenece a esta obligación.');
      if (!(await cliente.query('select $1::date<=current_date as valida',[entrada.transferencia!.fechaOperacion])).rows[0].valida) throw new ErrorPago(422,'FECHA_INVALIDA','La fecha bancaria no puede estar en el futuro.');
    }
    if (entrada.medio!=='TRANSFERENCIA' && (await cliente.query('select 1 from "incidenciasPago" where "pagoId"=$1 limit 1',[pagoId])).rowCount) throw new ErrorPago(409,'PAGO_EN_CONCILIACION','Existe una incidencia financiera pendiente de revisión.');
    if ((await cliente.query(`select 1 from "operacionesPago" where "pagoId"=$1 and estado in ('INICIADO','INCIERTO','DECLARADO') and ($2<>'TRANSFERENCIA' or medio='TRANSFERENCIA')`,[pagoId,entrada.medio])).rowCount) throw new ErrorPago(409,'PAGO_EN_PROCESO','Existe una operación pendiente de conciliación.');
    const op=(await cliente.query<OperacionPago>(`insert into "operacionesPago"(id,"pagoId",medio,clave,"cargaHash",entorno,estado) values($1,$2,$3,$4,$5,$6,$7) returning ${columnasOperacion}`,
    [randomUUID(),pagoId,entrada.medio,entrada.clave,entrada.cargaHash,entrada.entorno??'sandbox',entrada.medio==='TRANSFERENCIA'?'DECLARADO':'INICIADO'])).rows[0]!;
    if (entrada.medio==='TRANSFERENCIA') {
      const transferencia=entrada.transferencia!;
      await reservarReferenciaTransferencia(cliente,op.id,transferencia.referencia);
      await cliente.query(`insert into "transferenciasPago"("operacionId","destinoId",referencia,"fechaOperacion") values($1,$2,$3,$4)`,[op.id,transferencia.destinoId,transferencia.referencia,transferencia.fechaOperacion]);
      if(entrada.voucher) await guardarVoucher(cliente,op.id,usuarioId,entrada.voucher,entrada.clave,env.voucherRetencionMeses);
      await cliente.query(`insert into "auditoriaPagos"("pagoId","actorId",accion,"operacionId") values($1,$2,'DECLARAR_TRANSFERENCIA',$3)`,[pagoId,usuarioId,op.id]);
    }
    return { ...op,nueva:true };
  });
}
export async function buscarOperacion(id: string) {
  return (await pool.query<OperacionPago>(`select ${columnasOperacion} from "operacionesPago" where id=$1`,[id])).rows[0];
}
async function registrarIncidencia(cliente: PoolClient, pago: Pago, op: OperacionPago, hecho: { referencia: string; importeCentimos: number; moneda: string }, motivo: 'IMPORTE'|'REFERENCIA') {
  await cliente.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`${op.medio}:${hecho.referencia}`]);
  await cliente.query(`insert into "incidenciasPago"("pagoId","operacionId",referencia,"importeCentimos",moneda,motivo) values($1,$2,$3,$4,$5,$6) on conflict do nothing`,
  [pago.id,op.id,hecho.referencia,hecho.importeCentimos,hecho.moneda,motivo]);
  await cliente.query(`update "operacionesPago" set estado='INCIERTO' where id=$1 and estado in ('INICIADO','INCIERTO')`,[op.id]);
  await cliente.query(`insert into "auditoriaPagos"("pagoId",accion,"operacionId") values($1,'INCIDENCIA',$2)`,[pago.id,op.id]);
  return 'CONCILIACION' as const;
}
export async function guardarHecho(cliente: PoolClient, pago: Pago, op: OperacionPago, hecho: { referencia: string; importeCentimos: number; moneda: string }, actorId: number | null) {
  // Serializa referencias entre obligaciones distintas sin cambiar el orden de locks.
  await cliente.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`${op.medio}:${hecho.referencia}`]);
  const incidencia = (await cliente.query<{ pagoId: string; operacionId: string }>(`select i."pagoId"::text as "pagoId",i."operacionId" from "incidenciasPago" i
    join "operacionesPago" o on o.id=i."operacionId" where o.medio=$1 and i.referencia=$2 order by i.id limit 1`,[op.medio,hecho.referencia])).rows[0];
  if (incidencia && (incidencia.pagoId !== pago.id || incidencia.operacionId !== op.id)) return registrarIncidencia(cliente,pago,op,hecho,'REFERENCIA');
  if (incidencia || hecho.importeCentimos !== pago.importeCentimos || hecho.moneda !== pago.moneda) return registrarIncidencia(cliente,pago,op,hecho,'IMPORTE');
  const existente = (await cliente.query<{ pagoId: string; operacionId: string }>('select "pagoId"::text as "pagoId","operacionId" from "hechosPago" where medio=$1 and referencia=$2',[op.medio,hecho.referencia])).rows[0];
  if (existente) {
    if (existente.pagoId !== pago.id || existente.operacionId !== op.id) return registrarIncidencia(cliente,pago,op,hecho,'REFERENCIA');
    return 'CONFIRMADO' as const;
  }
  await cliente.query(`insert into "hechosPago"("pagoId","operacionId",medio,referencia,"importeCentimos",moneda,"requiereConciliacion") values($1,$2,$3,$4,$5,$6,$7)`,
  [pago.id,op.id,op.medio,hecho.referencia,hecho.importeCentimos,hecho.moneda,pago.estado === 'PAGADO']);
  if(pago.estado==='PAGADO') await cliente.query(`insert into "incidenciasPago"("pagoId","operacionId",motivo,referencia,"importeCentimos",moneda)
    values($1,$2,'REFERENCIA',$3,$4,$5) on conflict do nothing`,[pago.id,op.id,hecho.referencia,hecho.importeCentimos,hecho.moneda]);
  await cliente.query(`update "operacionesPago" set estado='CONFIRMADO',"referenciaExterna"=coalesce("referenciaExterna",$2),"actualizadoEn"=clock_timestamp() where id=$1`,[op.id,hecho.referencia]);
  const reservaPendiente = pago.concepto === 'CURSO' && pago.estado === 'PENDIENTE'
    && (await cliente.query(`select 1 from "intentosInscripcion" where id=$1 and estado='PENDIENTE_PAGO'`, [pago.intentoId])).rowCount;
  await cliente.query(`update "obligacionesPago" set estado='PAGADO',medio=$2,"pagadoEn"=clock_timestamp() where id=$1 and estado='PENDIENTE'`,[pago.id,op.medio]);
  await cliente.query(`insert into "auditoriaPagos"("pagoId","actorId",accion,"operacionId") values($1,$2,'CONFIRMAR',$3)`,[pago.id,actorId,op.id]);
  await encolarAvisoPago(cliente,pago,op.id,'COMPROBANTE');
  if (reservaPendiente && (await cliente.query(`select 1 from "intentosInscripcion" where id=$1 and estado='EN_CURSO'`, [pago.intentoId])).rowCount) {
    await avisarInscripcionConfirmada(cliente, pago.cursoId, pago.usuarioId, pago.intentoId);
  }
  return 'CONFIRMADO' as const;
}
export async function confirmarOperacion(id: string, hecho: { referencia: string; importeCentimos: number; moneda: string }) {
  const operacion = await buscarOperacion(id);
  if (!operacion) throw new ErrorPago(404,'OPERACION_NO_EXISTE','La operación no existe.');
  if (operacion.medio === 'EFECTIVO' || operacion.medio==='TRANSFERENCIA') throw new ErrorPago(403,'SIN_PERMISO','El pago manual requiere registro administrativo.');
  return conPago(operacion.pagoId, (cliente,pago) => guardarHecho(cliente,pago,operacion,hecho,null));
}
export async function conservarRespuestaMultiple(id:string,hechos:{referencia:string;importeCentimos:number;moneda:string}[]) {
  const op=await buscarOperacion(id);
  if (!op || op.medio!=='IZIPAY') throw new ErrorPago(422,'OPERACION_INVALIDA','La respuesta no corresponde a Izipay.');
  return conPago(op.pagoId,async(cliente,pago)=>{
    // El contrato permite varias órdenes pero no acredita cómo repartirlas.
    // Se conserva cada referencia verificada sin asumir un cobro aplicable.
    for (const hecho of [...hechos].sort((a,b)=>a.referencia.localeCompare(b.referencia))) {
      await registrarIncidencia(cliente,pago,op,hecho,'REFERENCIA');
    }
    return 'CONCILIACION' as const;
  });
}
export async function cambiarEstadoOperacion(id: string, estado: 'INCIERTO'|'RECHAZADO') {
  if (estado === 'INCIERTO') {
    await pool.query(`update "operacionesPago" set estado=$2,"actualizadoEn"=clock_timestamp()
      where id=$1 and estado in ('INICIADO','INCIERTO')`, [id, estado]);
    return estado;
  }
  const operacion = await buscarOperacion(id);
  if (!operacion) throw new ErrorPago(404,'OPERACION_NO_EXISTE','La operación no existe.');
  return conPago(operacion.pagoId, async (cliente,pago) => {
    const cambio = await cliente.query(`update "operacionesPago" set estado='RECHAZADO',"actualizadoEn"=clock_timestamp()
      where id=$1 and medio in ('IZIPAY','CULQI') and estado in ('INICIADO','INCIERTO')`, [id]);
    if (cambio.rowCount) {
      await encolarAvisoPago(cliente, pago, id, 'RECHAZO', 'La pasarela rechazó el pago.');
      return 'RECHAZADO' as const;
    }
    return (await cliente.query<{ estado: OperacionPago['estado'] }>('select estado from "operacionesPago" where id=$1', [id])).rows[0]?.estado
      ?? 'RECHAZADO';
  });
}
export async function registrarEfectivo(pagoId: string, actorId: number, referencia: string, datos?:Pick<RecepcionEfectivo,'importeCentimos'|'fechaRecepcion'>) {
  return conPago(pagoId, async (cliente,pago) => {
    if (!(await cliente.query(`select id from users where id=$1 and role='admin' and active for share`,[actorId])).rowCount) throw new ErrorPago(403,'SIN_PERMISO','No tienes permiso para registrar efectivo.');
    if(datos&&datos.importeCentimos!==pago.importeCentimos) throw new ErrorPago(409,'IMPORTE_INVALIDO','El importe debe coincidir con el importe completo pendiente.');
    const fecha=datos?.fechaRecepcion??(await cliente.query('select current_date::text as fecha')).rows[0].fecha as string;
    if(!(await cliente.query('select $1::date<=current_date as valida',[fecha])).rows[0].valida) throw new ErrorPago(422,'FECHA_INVALIDA','La fecha de recepción no puede estar en el futuro.');
    const anterior = (await cliente.query(`select h."pagoId"::text as "pagoId",r."fechaRecepcion"::text as fecha,r."importeCentimos"::float8 as importe
      from "hechosPago" h left join "recepcionesEfectivo" r on r."operacionId"=h."operacionId" where h.medio='EFECTIVO' and h.referencia=$1`,[referencia])).rows[0];
    if (anterior?.pagoId === pagoId) {
      if(datos&&(anterior.fecha!==fecha||anterior.importe!==datos.importeCentimos)) throw new ErrorPago(409,'REFERENCIA_REUTILIZADA','La referencia corresponde a otra fecha o importe.');
      return;
    }
    if (anterior) throw new ErrorPago(409,'REFERENCIA_REUTILIZADA','La referencia ya se utilizó.');
    if ((await cliente.query('select 1 from "incidenciasPago" where "pagoId"=$1 limit 1',[pagoId])).rowCount) throw new ErrorPago(409,'PAGO_EN_CONCILIACION','Existe una incidencia financiera pendiente de revisión.');
    if (pago.estado === 'PAGADO' || (await cliente.query(`select 1 from "operacionesPago" where "pagoId"=$1 and estado in ('INICIADO','INCIERTO','DECLARADO')`,[pagoId])).rowCount) throw new ErrorPago(409,'PAGO_EN_PROCESO','El pago está confirmado o tiene una operación en proceso.');
    const op = (await cliente.query<OperacionPago>(`insert into "operacionesPago"(id,"pagoId",medio,clave,"cargaHash") values($1,$2,'EFECTIVO',$3,$4) returning ${columnasOperacion}`,
    [randomUUID(),pagoId,randomUUID(),createHash('sha256').update(referencia).digest('hex')])).rows[0]!;
    await cliente.query('insert into "recepcionesEfectivo"("operacionId","importeCentimos","fechaRecepcion") values($1,$2,$3)',[op.id,pago.importeCentimos,fecha]);
    await guardarHecho(cliente,pago,op,{ referencia, importeCentimos:pago.importeCentimos, moneda:pago.moneda },actorId);
  });
}
