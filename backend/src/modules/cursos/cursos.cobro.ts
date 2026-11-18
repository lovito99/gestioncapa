import { z } from 'zod';

const costo = z.number().finite().min(0).max(9999999999.99).multipleOf(0.01);
export const modalidadesCobro = ['PREVIO', 'CERTIFICADO', 'GRATUITO'] as const;
const tiposPrecio = ['COLEGIADO', 'GENERAL'] as const;
export type TipoPrecio = typeof tiposPrecio[number];
export const camposCobro = {
  modalidadCobro: z.enum(modalidadesCobro),
  costo,
  precioGeneral: costo.optional(),
  plazoPagoMinutos: z.number().int().positive().max(525600, 'El plazo máximo es un año.').nullable().default(null),
};

type ImportesOferta = { costo: number; precioGeneral?: number | undefined };

export function validarPrecioGeneral(datos: ImportesOferta, contexto: z.RefinementCtx) {
  if (datos.precioGeneral !== undefined && (datos.precioGeneral === 0) !== (datos.costo === 0)) {
    contexto.addIssue({ code: 'custom', path: ['precioGeneral'], message: datos.costo === 0
      ? 'Un curso gratuito debe tener precio general cero.' : 'Indica un precio general mayor que cero.' });
  }
}

export function validarCoherenciaCobro(datos: ImportesOferta & { modalidadCobro: string; plazoPagoMinutos: number | null }, contexto: z.RefinementCtx) {
  validarPrecioGeneral(datos, contexto);
  if ((datos.modalidadCobro === 'GRATUITO') !== (datos.costo === 0)) {
    contexto.addIssue({ code: 'custom', path: ['costo'], message: datos.modalidadCobro === 'GRATUITO' ? 'Un curso gratuito debe tener costo cero.' : 'Indica un importe mayor que cero.' });
  }
  if ((datos.modalidadCobro === 'PREVIO') !== (datos.plazoPagoMinutos !== null)) {
    contexto.addIssue({ code: 'custom', path: ['plazoPagoMinutos'], message: datos.modalidadCobro === 'PREVIO' ? 'Indica el plazo para pagar desde la inscripción.' : 'El plazo solo corresponde al pago previo.' });
  }
}

export const esquemaPoliticaCobro = z.object(camposCobro).strict().superRefine(validarCoherenciaCobro);
export const esquemaCambioCobro = z.object({ ...camposCobro, versionCobro: z.number().int().positive() }).strict().superRefine(validarCoherenciaCobro);
export const entradaInscripcion = z.object({
  versionCobro: z.number().int().positive().optional(),
  tipoPrecio: z.enum(tiposPrecio).optional(),
}).strict();
export type PoliticaCobro = z.infer<typeof esquemaPoliticaCobro>;

export function aCentimos(importe: number): number {
  costo.parse(importe);
  return Number(importe.toFixed(2).replace('.', ''));
}
