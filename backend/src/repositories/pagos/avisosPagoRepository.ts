import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { lineasImporte, type Pago } from '../../entities/pagos/pago.js';
import type { DatosCorreo } from '../../entities/notificaciones/correo.js';

export async function encolarAvisoPago(cliente:PoolClient,pago:Pago,operacionId:string,tipo:'COMPROBANTE'|'RECHAZO',motivo?:string) {
  const contexto=(await cliente.query<{email:string;nombre:string;curso:string;medio:string;instrumento:string|null;referencia:string;fecha:string;conciliar:boolean;totalCentimos:number|null}>(`
    select u.email,u.name as nombre,c.titulo as curso,o.medio,coalesce(t.referencia,h.referencia,'') as referencia,
      o.instrumento,h."importeCentimos"::float8 as "totalCentimos",
      coalesce(r."fechaRecepcion"::text,t."fechaOperacion"::text,h."verificadoEn"::text,p."pagadoEn"::text,'') as fecha,
      exists(select 1 from "incidenciasPago" i where i."pagoId"=p.id) as conciliar
    from "obligacionesPago" p join users u on u.id=p."usuarioId" join cursos c on c.id=p."cursoId"
    join "operacionesPago" o on o.id=$2 left join "transferenciasPago" t on t."operacionId"=o.id
    left join "recepcionesEfectivo" r on r."operacionId"=o.id left join "hechosPago" h on h."operacionId"=o.id
    where p.id=$1 order by h.id limit 1`,[pago.id,operacionId])).rows[0]!;
  const transferencia = contexto.medio === 'TRANSFERENCIA';
  const medio = [contexto.medio, contexto.instrumento].filter(Boolean).join(' · ');
  const importe = tipo === 'COMPROBANTE' ? lineasImporte(pago.importeCentimos, contexto.totalCentimos ?? pago.importeCentimos)
    : [`Importe: S/ ${(pago.importeCentimos/100).toFixed(2)} PEN`];
  const asunto=tipo==='COMPROBANTE'?`CPPP: comprobante de pago #${pago.id}`:`CPPP: revisión de ${transferencia ? 'transferencia' : 'pago'} #${pago.id}`;
  const texto=[`Hola, ${contexto.nombre}.`,`Orden de pago: ${pago.id}`,`Curso: ${contexto.curso}`,`Concepto: ${pago.concepto}`,
    ...importe,`Medio: ${medio}`,`Referencia: ${contexto.referencia}`,`Fecha: ${contexto.fecha}`,
    tipo==='RECHAZO'?`${transferencia ? 'Transferencia rechazada' : 'Pago rechazado'}. Motivo: ${motivo}`:'Recepción del pago confirmada y registrada por el CPPP.',
    ...(contexto.conciliar?['Este ingreso requiere conciliación. No recupera automáticamente cupos ni cambia una reserva vencida.']:[]),
    'Consulta en tu curso el estado de la inscripción o constancia.'].join('\n');
  const datos: DatosCorreo = {
    nombre: contexto.nombre, curso: contexto.curso, cursoId: pago.cursoId,
    detalles: [
      `Orden de pago: ${pago.id}`, ...importe, `Medio: ${medio}`,
      ...(contexto.fecha ? [`Fecha del pago: ${contexto.fecha.slice(0, 10)}`] : []),
      tipo === 'RECHAZO'
        ? 'Consulta en tu curso el resultado y las opciones disponibles.'
        : contexto.conciliar
          ? 'Se registró la recepción del pago. Está en conciliación y no activa la inscripción.'
          : 'El CPPP confirmó la recepción del pago.',
    ],
  };
  await cliente.query(`insert into "notificacionesPago"(id,"pagoId","operacionId",tipo,destinatario,asunto,texto,datos)
    values($1,$2,$3,$4,$5,$6,$7,$8) on conflict ("operacionId",tipo) do nothing`,
  [randomUUID(),pago.id,operacionId,tipo,contexto.email,asunto,texto,datos]);
}
