/** Comisión redondeada al céntimo más cercano; los importes se manejan en céntimos para evitar decimales binarios. */
export function cotizarImporte(baseCentimos: number, puntosBase: number) {
  const comisionCentimos = Number((BigInt(baseCentimos) * BigInt(puntosBase) + 5000n) / 10000n);
  return { baseCentimos, comisionCentimos, totalCentimos: baseCentimos + comisionCentimos, moneda: 'PEN' as const };
}

export function lineasImporte(base: number, total: number) {
  return [`Importe base: S/ ${(base / 100).toFixed(2)} PEN`,
    `Comisión: S/ ${((total - base) / 100).toFixed(2)} PEN`, `Total pagado: S/ ${(total / 100).toFixed(2)} PEN`];
}

/** Clave única de la referencia bancaria, sin espacios ni separadores. */
export function normalizarNumeroOperacion(referencia: string) {
  const numero = referencia.toUpperCase().replace(/[ ./-]/g, '');
  return /^[A-Z0-9]{3,100}$/.test(numero) ? numero : null;
}

export type InstrumentoPago = 'TARJETA' | 'YAPE';
export type DesglosePagoEnLinea = {
  instrumento: InstrumentoPago; comisionCentimos: number; totalCentimos: number; comercio: string; ordenExterna: string;
};
export type MedioPago = string;
export type Pago = {
  id: string; cursoId: string; usuarioId: string; intentoId: string; concepto: 'CURSO' | 'CONSTANCIA';
  importeCentimos: number; moneda: 'PEN'; estado: 'PENDIENTE' | 'PAGADO'; medio: MedioPago | null; pagadoEn: string | null;
};
export type OperacionPago = {
  entorno: 'sandbox' | 'produccion';
  id: string; numero: string; pagoId: string; medio: MedioPago; clave: string; cargaHash: string;
  estado: 'INICIADO' | 'INCIERTO' | 'RECHAZADO' | 'CONFIRMADO' | 'DECLARADO' | 'CANCELADO'; referenciaExterna: string | null;
  instrumento: InstrumentoPago | null; comisionCentimos: number | null; totalCentimos: number | null; comercio: string | null;
  ordenExterna: string | null;
};

export type DestinoTransferencia = { banco: string; titular: string; cuenta: string; cci: string };
export type DeclaracionTransferencia = { destinoId: string; clave: string; referencia: string; fechaOperacion: string };
export type RevisionTransferencia =
  | { decision: 'CONFIRMAR'; referencia: string; fechaOperacion: string; importeCentimos: number; moneda: 'PEN'; verificado: true }
  | { decision: 'RECHAZAR'; motivo: string };
export type RecepcionEfectivo = { referencia: string; importeCentimos: number; fechaRecepcion: string };
export type ArchivoVoucher = { tipo: 'image/png' | 'image/jpeg' | 'application/pdf'; contenido: Buffer; tamano: number; hash: string };
/** Hecho de cobro verificado: referencia externa, importe y moneda acreditados. */
export type HechoPago = { referencia: string; importeCentimos: number; moneda: string };
