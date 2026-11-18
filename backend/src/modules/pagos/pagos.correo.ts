import { crearPdfTexto } from '../../shared/pdf.js';
import { procesarColaCorreo } from '../notificaciones/correo.envio.js';
import { pool } from '../../shared/database.js';
import type { InstrumentoPago } from './pagos.modelo.js';

export function lineasImporte(base: number, total: number) {
  return [`Importe base: S/ ${(base / 100).toFixed(2)} PEN`,
    `Comisión: S/ ${((total - base) / 100).toFixed(2)} PEN`, `Total pagado: S/ ${(total / 100).toFixed(2)} PEN`];
}

export function pdfComprobante(texto: string) {
  return crearPdfTexto('Comprobante de recepción - CPPP', texto.split('\n'));
}

export async function obtenerComprobante(pagoId: string) {
  const fila = (await pool.query<{
    operacionId: string; medio: string; instrumento: InstrumentoPago | null; referencia: string;
    fecha: string; baseCentimos: number; totalCentimos: number; curso: string; concepto: string;
    estadoCorreo: string | null; texto: string | null;
  }>(`select h."operacionId",h.medio,o.instrumento,h.referencia,
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
  if (!fila) return undefined;
  const { texto, curso, concepto, ...datos } = fila;
  return {
    datos: { ...datos, comisionCentimos: datos.totalCentimos - datos.baseCentimos, moneda: 'PEN' },
    texto: texto ?? [`Orden de pago: ${pagoId}`, `Curso: ${curso}`, `Concepto: ${concepto}`,
      ...lineasImporte(datos.baseCentimos, datos.totalCentimos), `Medio: ${datos.medio}`,
      `Referencia: ${datos.referencia}`, `Fecha: ${datos.fecha}`].join('\n'),
  };
}

export function enviarNotificacionesPago() {
  return procesarColaCorreo('pagos', aviso => aviso.tipo === 'COMPROBANTE' ? [{
    filename: `comprobante-${aviso.pagoId}.pdf`, contentType: 'application/pdf',
    content: pdfComprobante(aviso.texto),
  }] : undefined);
}
