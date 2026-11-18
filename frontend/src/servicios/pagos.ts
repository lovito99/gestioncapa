import { api } from '@/lib/api'
import type { EstadoCorreo } from './notificacionesCorreo'

export type DestinoTransferencia = {id:string;banco:string;titular:string;cuenta:string;cci:string}
export type ArchivoVoucherEntrada={tipo:'image/png'|'image/jpeg'|'application/pdf';contenidoBase64:string}
export type VoucherPago={id:string;version:number;tipo:ArchivoVoucherEntrada['tipo'];tamano:number;hash:string;disponible:boolean;eliminarEn:string;eliminadoEn:string|null}
export type RecepcionEfectivo={referencia:string;importeCentimos:number;fechaRecepcion:string}
export type NotificacionPago={id:string;tipo:'COMPROBANTE'|'RECHAZO';estado:EstadoCorreo;intentos:number;enviadoEn:string|null}
export type InstrumentoPago = 'TARJETA' | 'YAPE'
export const nombreInstrumento: Record<InstrumentoPago, string> = { TARJETA: 'Tarjeta', YAPE: 'Yape' }
export type OpcionPagoEnLinea = {
  medio: string; nombre: string; instrumento: InstrumentoPago; cotizacion: string;
  baseCentimos: number; comisionCentimos: number; totalCentimos: number; moneda: 'PEN';
}
export type EstadoOperacion = 'INICIADO'|'INCIERTO'|'DECLARADO'|'RECHAZADO'|'CONFIRMADO'|'CANCELADO'
export type SesionPago = { medio: string; datos: unknown }
type ResultadoInicioPago = { operacionId: string; estado: EstadoOperacion; sesion?: SesionPago }
export type ComprobantePago = Pick<OpcionPagoEnLinea, 'baseCentimos'|'comisionCentimos'|'totalCentimos'|'moneda'> & {
  operacionId: string; medio: string; instrumento: InstrumentoPago | null; referencia: string;
  fecha: string; estadoCorreo: EstadoCorreo | null;
}
export type TransferenciaPago = Omit<DestinoTransferencia,'id'> & {
  operacionId:string;referencia:string;fechaOperacion:string;estado:'INICIADO'|'DECLARADO'|'INCIERTO'|'RECHAZADO'|'CONFIRMADO';motivoRechazo:string|null;voucher?:VoucherPago|null
  /** S3 8.1a: el backend avisa si el número de operación ya existe en otro pago. */
  operacionRepetida?:boolean;declaradaEn?:string
}
export type RevisionTransferencia = {decision:'RECHAZAR';motivo:string} | {
  decision:'CONFIRMAR';referencia:string;fechaOperacion:string;importeCentimos:number;moneda:'PEN';verificado:true
}
export type Pago = {
  id:string;cursoId:string;concepto:'CURSO'|'CONSTANCIA';importeCentimos:number;moneda:'PEN';estado:'PENDIENTE'|'PAGADO';
  cursoTitulo:string;participanteNombre:string;exigible:boolean;
  operaciones:{id:string;medio:string;estado:EstadoOperacion;referenciaExterna:string|null;clave?:string;sesionRecuperable?:boolean;instrumento?:InstrumentoPago|null;
    /** «Tarjeta Visa •••• 4242», «Yape», «Recibo 0158» (S3 7.1 aprobado) */ detalle?:string|null;confirmadoEn?:string|null}[];
  incidencias:{motivo:string;referencia:string}[];
  transferencias:TransferenciaPago[];destinoTransferencia:DestinoTransferencia|null;
  notificaciones?:NotificacionPago[];
  medios:{izipay:boolean;culqi:boolean;efectivo:boolean;transferencia:boolean;entorno:'sandbox'|'produccion'};
  /** S3 7.1: código que el agremiado escribe en el concepto de la transferencia, p. ej. ORD-2026-00482 */
  codigoOrden?:string;
  opcionesEnLinea?: OpcionPagoEnLinea[];
  comprobante?: ComprobantePago;
  /** Fecha límite de la reserva (ISO 8601) */
  venceEn?:string|null;
  /** Correo donde se envía el comprobante, enmascarado (m•••@gmail.com) */
  correoEnmascarado?:string|null;
}

/** Fila de la bandeja de pagos del administrador (S3 8.1). */
export type EstadoBandeja='EN_REVISION'|'CONFIRMADO'|'RECHAZADO'
export type ItemBandeja={pagoId:string;operacionId:string|null;codigoOrden:string;agremiado:{nombre:string;dniParcial:string|null};
  cursoTitulo:string;concepto:Pago['concepto'];importeCentimos:number;medio:'TRANSFERENCIA'|'IZIPAY'|'EFECTIVO';detalleMedio:string;
  referencia:string|null;fecha:string;estado:EstadoBandeja}
export type Bandeja={resumen:{enRevision:number;confirmadosMes:number;rechazadosMes:number};items:ItemBandeja[]}
/** Pagos pendientes de un agremiado, para registrar efectivo por DNI (S3 8.1d). */
export type PendientesPorDni={agremiado:{nombre:string;dniParcial:string|null};pagos:{pagoId:string;codigoOrden:string;cursoTitulo:string;concepto:Pago['concepto'];importeCentimos:number}[]}
/** Motivos de rechazo de un voucher (S3 8.1b); el texto llega al agremiado por correo. */
export const MOTIVOS_RECHAZO=['El monto no coincide','El voucher no se lee bien','El número de operación no coincide','El código de orden no aparece en el concepto','La cuenta destino no es la del CPPP','Otro motivo'] as const
/** «ORD-2026-00482» cuando el backend aún no envía `codigoOrden`. */
export const codigoOrdenDe=(pago:Pick<Pago,'id'|'codigoOrden'>)=>pago.codigoOrden??`ORD-${new Date().getFullYear()}-${pago.id.padStart(5,'0')}`
export type SesionIzipay = {token:string;keyRSA:string;comercio:string;orden:string;transaccionId:string;importe:string;urlIPN:string;entorno:'sandbox'|'produccion';instrumento?:InstrumentoPago}
export function pagoNecesitaActualizacion(pago:Pick<Pago,'estado'|'operaciones'|'notificaciones'>) {
  return pago.estado==='PENDIENTE'||pago.operaciones.some(op=>['INICIADO','INCIERTO','DECLARADO'].includes(op.estado))||pago.notificaciones?.some(aviso=>aviso.estado==='PENDIENTE'||aviso.estado==='ENVIANDO')===true
}
export const pagos = {
  obtener:async(id:string)=>(await api.get<Pago>(`/pagos/${id}`)).data,
  iniciar: async (id: string, entrada: Pick<OpcionPagoEnLinea, 'medio'|'instrumento'|'cotizacion'> & { clave: string }) =>
    (await api.post<ResultadoInicioPago>(`/pagos/${id}/intentos`, entrada)).data,
  recuperarSesion: async (id: string, operacionId: string) =>
    (await api.post<ResultadoInicioPago>(`/pagos/${id}/intentos/${operacionId}/sesion`)).data,
  efectivo:async(id:string,entrada:RecepcionEfectivo)=>(await api.post<Pago>(`/pagos/${id}/efectivo`,entrada)).data,
  declararTransferencia:async(id:string,entrada:{destinoId:string;referencia:string;fechaOperacion:string;clave:string;voucher:ArchivoVoucherEntrada})=>
    (await api.post<{operacionId:string;estado:string}>(`/pagos/${id}/transferencias`,entrada)).data,
  obtenerVoucher:async(id:string,operacionId:string)=>(await api.get<Blob>(`/pagos/${id}/transferencias/${operacionId}/voucher`,{responseType:'blob'})).data,
  reponerVoucher:async(id:string,operacionId:string,entrada:{clave:string;version:number;voucher:ArchivoVoucherEntrada})=>
    (await api.put(`/pagos/${id}/transferencias/${operacionId}/voucher`,entrada)).data,
  revisarTransferencia:async(id:string,operacionId:string,entrada:RevisionTransferencia)=>
    (await api.post<{estado:string}>(`/pagos/${id}/transferencias/${operacionId}/revision`,entrada)).data,
  conciliar:async(id:string,operacionId:string,referencia?:string)=>(await api.post(`/pagos/${id}/conciliar`,{operacionId,referencia})).data,
  comprobante:async(id:string)=>(await api.get<Blob>(`/pagos/${id}/comprobante`,{responseType:'blob'})).data,
  bandeja:async(filtros:{estado?:EstadoBandeja;buscar?:string})=>(await api.get<Bandeja>('/pagos/bandeja',{params:filtros})).data,
  pendientesPorDni:async(dni:string)=>(await api.get<PendientesPorDni>('/pagos/pendientes',{params:{dni}})).data,
}

export async function leerVoucher(archivo:FormDataEntryValue|null):Promise<ArchivoVoucherEntrada> {
  if(!(archivo instanceof File)||!['image/png','image/jpeg','application/pdf'].includes(archivo.type)||archivo.size===0||archivo.size>5*1024*1024) throw new Error('Selecciona un voucher JPG, PNG o PDF de hasta 5 MiB.');
  const contenidoBase64=await new Promise<string>((resolver,rechazar)=>{
    const lector=new FileReader();lector.onload=()=>resolver(String(lector.result).split(',')[1]!);
    lector.onerror=()=>rechazar(new Error('No pudimos leer el archivo. Vuelve a seleccionarlo.'));lector.readAsDataURL(archivo);
  });
  return {tipo:archivo.type as ArchivoVoucherEntrada['tipo'],contenidoBase64};
}
