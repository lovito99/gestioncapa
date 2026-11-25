import { z } from 'zod';

export const entradaIntento = z.object({
  medio: z.string().regex(/^[A-Z][A-Z0-9]{1,14}$/), clave: z.uuid(),
  token: z.string().min(10).max(100).optional(),
  instrumento: z.enum(['TARJETA', 'YAPE']).optional(),
  cotizacion: z.string().regex(/^\d{1,15}\.[a-f0-9]{64}$/).optional(),
}).strict();
export type EntradaIntento = z.infer<typeof entradaIntento>;
export const entradaEfectivo = z.object({ referencia: z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9 ./-]+$/) }).strict();

const referenciaBancaria = z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9 ./-]+$/)
  .transform(valor => valor.toUpperCase().replace(/\s+/g,' '));
export const entradaTransferencia = z.object({ destinoId:z.uuid(), clave:z.uuid(), referencia:referenciaBancaria, fechaOperacion:z.iso.date() }).strict();
export const entradaRevisionTransferencia = z.discriminatedUnion('decision',[
  z.object({decision:z.literal('CONFIRMAR'),referencia:referenciaBancaria,fechaOperacion:z.iso.date(),
    importeCentimos:z.number().int().min(1).max(999999999999),moneda:z.literal('PEN'),verificado:z.literal(true)}).strict(),
  z.object({decision:z.literal('RECHAZAR'),motivo:z.string().trim().min(5).max(500)}).strict(),
]);
export type DeclaracionTransferencia = z.infer<typeof entradaTransferencia>;
export type RevisionTransferencia = z.infer<typeof entradaRevisionTransferencia>;

export const entradaArchivoVoucher=z.object({tipo:z.enum(['image/png','image/jpeg','application/pdf']),
  contenidoBase64:z.string().min(4).max(6990508)}).strict();
export const entradaSubidaVoucher=entradaTransferencia.extend({voucher:entradaArchivoVoucher}).strict();
export const entradaReposicionVoucher=z.object({clave:z.uuid(),version:z.number().int().min(1),voucher:entradaArchivoVoucher}).strict();
export const entradaRecepcionEfectivo=entradaEfectivo.extend({importeCentimos:z.number().int().min(1).max(999999999999),fechaRecepcion:z.iso.date()}).strict();
export type RecepcionEfectivo=z.infer<typeof entradaRecepcionEfectivo>;


export const idOperacion = z.uuid();
export const rutaProveedor = z.string().regex(/^[a-z][a-z0-9-]{1,29}$/);
export const entradaConciliacion = z.object({ operacionId: z.uuid(), referencia: z.string().max(100).optional() }).strict();

/** Esquemas de las notificaciones de pasarela (IPN); su contenido es externo y no confiable. */
export const envolturaIzipay = z.object({ payloadHttp: z.string().max(131072), signature: z.string().max(100) });
export const ordenIzipay = z.string().regex(/^[A-Z0-9]{5,15}$/);
export const idTransaccion = z.uuid();
export const referenciaCargoCulqi = z.string().regex(/^chr_(test|live)_[A-Za-z0-9]+$/);
export const metadatosCargoCulqi = z.object({ metadata: z.object({ operacionId: z.uuid() }) });
