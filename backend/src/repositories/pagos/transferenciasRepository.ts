import { createHash,randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../../shared/database.js';
import { ErrorPago } from '../../shared/errorPago.js';
import type { ArchivoVoucher, DestinoTransferencia, OperacionPago, RevisionTransferencia } from '../../entities/pagos/pago.js';
import { conPago,guardarHecho } from './pagosRepository.js';
import { comprobarVoucherVigente,fecharRetencionVoucher,guardarVoucher } from './vouchersRepository.js';
import { encolarAvisoPago } from './avisosPagoRepository.js';

export async function buscarDestinoTransferencia(pagoId:string,cliente:Pick<PoolClient,'query'>=pool) {
  return (await cliente.query<DestinoTransferencia & {id:string}>(`select id,banco,titular,cuenta,cci from "destinosTransferencia" where "pagoId"=$1 order by "creadoEn",id limit 1`,[pagoId])).rows[0];
}
/** Crea el destino de la obligación; si otra solicitud ya lo creó, devuelve ese. */
export async function crearDestinoTransferencia(pagoId:string,destino:DestinoTransferencia) {
  return conPago(pagoId,async(cliente)=>{
    const existente=await buscarDestinoTransferencia(pagoId,cliente);
    if(existente) return existente;
    return (await cliente.query<DestinoTransferencia & {id:string}>(`insert into "destinosTransferencia"(id,"pagoId",banco,titular,cuenta,cci)
      values($1,$2,$3,$4,$5,$6) returning id,banco,titular,cuenta,cci`,[randomUUID(),pagoId,destino.banco,destino.titular,destino.cuenta,destino.cci])).rows[0]!;
  });
}
export async function listarTransferencias(pagoId:string) {
  return (await pool.query<DestinoTransferencia & {operacionId:string;referencia:string;fechaOperacion:string;estado:string;motivoRechazo:string|null}>(`
    select t."operacionId",t.referencia,to_char(t."fechaOperacion",'YYYY-MM-DD') as "fechaOperacion",o.estado,
      d.banco,d.titular,d.cuenta,d.cci,t."motivoRechazo",t."revisadoEn"::text,t."revisadoPor"::text,
      case when v.id is null then null else jsonb_build_object('id',v.id,'version',v.version,'tipo',v.tipo,'tamano',v.tamano,'hash',v.hash,
        'eliminarEn',v."eliminarEn",'eliminadoEn',v."eliminadoEn",'disponible',v.contenido is not null and v."eliminarEn">clock_timestamp()) end as voucher
    from "transferenciasPago" t join "operacionesPago" o on o.id=t."operacionId"
    join "destinosTransferencia" d on d.id=t."destinoId"
    left join lateral(select * from "vouchersPago" where "operacionId"=o.id order by version desc limit 1) v on true
    where o."pagoId"=$1 order by o.numero desc limit 10`,[pagoId])).rows;
}
/** Repone el último voucher vencido de una transferencia declarada; solo el propietario. */
export async function reponerVoucher(pagoId:string,operacionId:string,actorId:number,datos:{clave:string;version:number},archivo:ArchivoVoucher) {
  return conPago(pagoId,async(cliente,pago)=>{
    if(pago.usuarioId!==String(actorId)||!(await cliente.query(`select id from users where id=$1 and active and role='agremiado' for share`,[actorId])).rowCount) throw new ErrorPago(403,'SIN_PERMISO','Solo el propietario puede reponer su voucher.');
    const operacion=(await cliente.query<{estado:string}>(`select estado from "operacionesPago" where id=$1 and "pagoId"=$2 and medio='TRANSFERENCIA'`,[operacionId,pagoId])).rows[0];
    if(!operacion) throw new ErrorPago(404,'TRANSFERENCIA_NO_EXISTE','La transferencia no pertenece a esta obligación.');
    const repetida=(await cliente.query<{id:string;hash:string;tipo:string}>(`select id,hash,tipo from "vouchersPago" where "operacionId"=$1 and clave=$2`,[operacionId,datos.clave])).rows[0];
    if(repetida) {
      if(repetida.hash!==archivo.hash||repetida.tipo!==archivo.tipo) throw new ErrorPago(409,'CLAVE_REUTILIZADA','La clave corresponde a otro archivo.');
      return repetida.id;
    }
    const anterior=(await cliente.query<{version:number;mesesRetencion:number;vigente:boolean}>(`select version,"mesesRetencion",contenido is not null and "eliminarEn">clock_timestamp() as vigente
      from "vouchersPago" where "operacionId"=$1 order by version desc limit 1 for update`,[operacionId])).rows[0];
    if(!anterior) throw new ErrorPago(404,'VOUCHER_NO_EXISTE','Este trámite no tiene un voucher para reponer.');
    if(operacion.estado!=='DECLARADO'||anterior.vigente||anterior.version!==datos.version) throw new ErrorPago(409,'REPOSICION_NO_DISPONIBLE','Solo se repone el último archivo vencido de un trámite pendiente. Consulta su estado.');
    await cliente.query(`update "vouchersPago" set contenido=null,"eliminadoEn"=clock_timestamp() where "operacionId"=$1 and contenido is not null and "eliminarEn"<=clock_timestamp()`,[operacionId]);
    const id=await guardarVoucher(cliente,operacionId,actorId,archivo,datos.clave,anterior.mesesRetencion);
    await cliente.query(`insert into "auditoriaPagos"("pagoId","actorId",accion,"operacionId") values($1,$2,'REPONER_VOUCHER',$3)`,[pagoId,actorId,operacionId]);
    return id;
  });
}
/** Confirma o rechaza una transferencia; repetir la misma revisión devuelve el estado sin cambios. */
export async function revisarTransferencia(pagoId:string,operacionId:string,actorId:number,datos:RevisionTransferencia,revisionHash:string) {
  return conPago(pagoId,async(cliente,pago)=>{
    if (!(await cliente.query(`select id from users where id=$1 and active and role='admin' for share`,[actorId])).rowCount) throw new ErrorPago(403,'SIN_PERMISO','No tienes permiso para revisar transferencias.');
    const registro=(await cliente.query<{referencia:string;fechaOperacion:string;cci:string;revisionHash:string|null}>(`
      select t.referencia,to_char(t."fechaOperacion",'YYYY-MM-DD') as "fechaOperacion",d.cci,t."revisionHash"
      from "transferenciasPago" t join "operacionesPago" o on o.id=t."operacionId" join "destinosTransferencia" d on d.id=t."destinoId"
      where o.id=$1 and o."pagoId"=$2 and o.medio='TRANSFERENCIA'`,[operacionId,pagoId])).rows[0];
    if (!registro) throw new ErrorPago(404,'TRANSFERENCIA_NO_EXISTE','La transferencia no pertenece a esta obligación.');
    const op=(await cliente.query<OperacionPago>(`select id,"pagoId"::text as "pagoId",medio,estado from "operacionesPago" where id=$1`,[operacionId])).rows[0]!;
    if (registro.revisionHash===revisionHash) return op.estado;
    if (op.estado!=='INICIADO' && op.estado!=='DECLARADO') throw new ErrorPago(409,'TRANSFERENCIA_REVISADA','La transferencia ya fue revisada.');
    if (datos.decision==='RECHAZAR') {
      await cliente.query(`update "operacionesPago" set estado='RECHAZADO',"actualizadoEn"=clock_timestamp() where id=$1`,[op.id]);
      await cliente.query(`insert into "auditoriaPagos"("pagoId","actorId",accion,"operacionId") values($1,$2,'RECHAZAR_TRANSFERENCIA',$3)`,[pagoId,actorId,op.id]);
    } else {
      await comprobarVoucherVigente(cliente,op.id);
      if (datos.importeCentimos!==pago.importeCentimos) throw new ErrorPago(409,'IMPORTE_INVALIDO','El importe debe coincidir con el importe completo pendiente.');
      if (datos.referencia!==registro.referencia || datos.fechaOperacion!==registro.fechaOperacion) throw new ErrorPago(409,'REFERENCIA_INVALIDA','La referencia y fecha deben coincidir con la declaración.');
      const referencia=createHash('sha256').update(JSON.stringify([registro.cci,datos.fechaOperacion,datos.referencia])).digest('hex');
      await cliente.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`TRANSFERENCIA:${referencia}`]);
      if ((await cliente.query(`select 1 from "hechosPago" where medio='TRANSFERENCIA' and referencia=$1`,[referencia])).rowCount) throw new ErrorPago(409,'REFERENCIA_REUTILIZADA','La referencia bancaria ya se utilizó.');
      await guardarHecho(cliente,pago,op,{referencia,importeCentimos:datos.importeCentimos,moneda:datos.moneda},actorId);
    }
    await cliente.query(`update "transferenciasPago" set "revisadoPor"=$2,"revisadoEn"=clock_timestamp(),"revisionHash"=$3,"motivoRechazo"=$4 where "operacionId"=$1`,
      [op.id,actorId,revisionHash,datos.decision==='RECHAZAR'?datos.motivo:null]);
    await fecharRetencionVoucher(cliente,op.id);
    if(datos.decision==='RECHAZAR') await encolarAvisoPago(cliente,pago,op.id,'RECHAZO',datos.motivo);
    return datos.decision==='RECHAZAR'?'RECHAZADO':'CONFIRMADO';
  });
}
