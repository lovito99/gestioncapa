import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../../shared/database.js';
import { ErrorPago } from '../../shared/errorPago.js';
import { normalizarNumeroOperacion, type ArchivoVoucher } from '../../entities/pagos/pago.js';

export async function reservarReferenciaTransferencia(cliente:PoolClient,operacionId:string,referencia:string) {
  const numero=normalizarNumeroOperacion(referencia);
  if (!numero) throw new ErrorPago(422, 'OPERACION_INVALIDA', 'Indica un número de operación válido.');
  await cliente.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`numeroTransferencia:${numero}`]);
  const anterior=(await cliente.query<{operacionId:string|null}>('select "operacionId" from "referenciasTransferencia" where numero=$1',[numero])).rows[0];
  if(anterior&&anterior.operacionId!==operacionId) throw new ErrorPago(409,'OPERACION_BANCARIA_REPETIDA','Ese número de operación ya está registrado. Consulta con el CPPP.');
  if(!anterior) await cliente.query('insert into "referenciasTransferencia"(numero,"operacionId") values($1,$2)',[numero,operacionId]);
}
export async function guardarVoucher(cliente:PoolClient,operacionId:string,actorId:number,archivo:ArchivoVoucher,clave:string,meses:number) {
  const anterior=(await cliente.query<{id:string;hash:string;tipo:string}>(`select id,hash,tipo from "vouchersPago" where "operacionId"=$1 and clave=$2`,[operacionId,clave])).rows[0];
  if(anterior) {
    if(anterior.hash!==archivo.hash||anterior.tipo!==archivo.tipo) throw new ErrorPago(409,'CLAVE_REUTILIZADA','La clave corresponde a otro archivo.');
    return anterior.id;
  }
  const id=randomUUID();
  await cliente.query(`insert into "vouchersPago"(id,"operacionId",version,clave,"cargadoPor",tipo,contenido,tamano,hash,"mesesRetencion","eliminarEn")
    select $1,$2,coalesce(max(version),0)+1,$3,$4,$5,$6,$7,$8,$9::integer,clock_timestamp()+make_interval(months=>$9::integer)
    from "vouchersPago" where "operacionId"=$2`,[id,operacionId,clave,actorId,archivo.tipo,archivo.contenido,archivo.tamano,archivo.hash,meses]);
  return id;
}
export async function comprobarVoucherVigente(cliente:PoolClient,operacionId:string) {
  const voucher=(await cliente.query<{vigente:boolean}>(`select contenido is not null and "eliminarEn">clock_timestamp() as vigente
    from "vouchersPago" where "operacionId"=$1 order by version desc limit 1 for update`,[operacionId])).rows[0];
  if(voucher&&!voucher.vigente) throw new ErrorPago(409,'VOUCHER_VENCIDO','El voucher venció. Debe reponerse en este mismo trámite antes de aprobarlo.');
}
export async function fecharRetencionVoucher(cliente:PoolClient,operacionId:string) {
  await cliente.query(`update "vouchersPago" set "eliminarEn"=clock_timestamp()+make_interval(months=>"mesesRetencion")
    where "operacionId"=$1 and contenido is not null and "eliminarEn">clock_timestamp()`,[operacionId]);
}
export async function obtenerVoucher(pagoId:string,operacionId:string) {
  const fila=(await pool.query<{contenido:Buffer|null;tipo:ArchivoVoucher['tipo'];vigente:boolean}>(`select v.contenido,v.tipo,v."eliminarEn">clock_timestamp() as vigente
    from "vouchersPago" v join "operacionesPago" o on o.id=v."operacionId" where o."pagoId"=$1 and o.id=$2 order by v.version desc limit 1`,[pagoId,operacionId])).rows[0];
  if(!fila) throw new ErrorPago(404,'VOUCHER_NO_EXISTE','El voucher no pertenece a esta obligación.');
  if(!fila.vigente||!fila.contenido) throw new ErrorPago(410,'VOUCHER_ELIMINADO','El archivo ya no está disponible por su política de retención.');
  return {contenido:fila.contenido,tipo:fila.tipo};
}
export async function eliminarVouchersVencidos() {
  const resultado=await pool.query(`with vencidos as (select id from "vouchersPago" where contenido is not null and "eliminarEn"<=clock_timestamp()
    order by "eliminarEn" for update skip locked limit 20)
    update "vouchersPago" v set contenido=null,"eliminadoEn"=clock_timestamp() from vencidos where v.id=vencidos.id`);
  return resultado.rowCount??0;
}
