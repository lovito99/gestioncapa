import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { pool } from '../../shared/database.js';
import { tiposCorreo } from './correo.contenido.js';
import { estadosCorreo } from './correo.envio.js';

const consultaCorreo = z.object({
  tipo: z.enum(tiposCorreo).optional(),
  estado: z.enum(estadosCorreo).optional(),
  pagina: z.coerce.number().int().min(1).max(1000).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(25),
}).strict();

const columnas = `n.id,n.tipo,n.estado,n.intentos,n."creadoEn",n."enviadoEn",
  case when n.estado='PENDIENTE' then n."intentarEn" end as "proximoIntentoEn",
  case when n."ultimoError" in ('SMTP_RESULTADO_INCIERTO','SMTP_RECHAZADO','SMTP_FALLO_TEMPORAL',
    'SMTP_INTENTOS_AGOTADOS','SMTP_NO_ENTREGADO','DESTINATARIO_CAMBIADO','CORREO_INVALIDO','CONTENIDO_INVALIDO')
    then n."ultimoError" when n."ultimoError" is not null then 'ERROR_NO_CLASIFICADO' end as "ultimoError"`;

export async function registrarCorreo(app: FastifyInstance) {
  app.get('/api/admin/notificaciones/correo', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const { tipo, estado, pagina, limite } = consultaCorreo.parse(request.query);
    const [avisos, resumen] = await Promise.all([
      pool.query(`select * from (
        select ${columnas},p."cursoId"::text as "cursoId",n."pagoId"::text as "pagoId"
          from "notificacionesPago" n join "obligacionesPago" p on p.id=n."pagoId"
          where ($1::text is null or n.tipo=$1) and ($2::text is null or n.estado=$2)
        union all
        select ${columnas},n."cursoId"::text,null::text
          from "notificacionesCorreo" n
          where ($1::text is null or n.tipo=$1) and ($2::text is null or n.estado=$2)
      ) avisos order by "creadoEn" desc,id desc limit $3 offset $4`,
      [tipo ?? null, estado ?? null, limite + 1, (pagina - 1) * limite]),
      pool.query(`select count(*) filter (where estado='PENDIENTE')::int as pendientes,
        count(*) filter (where estado='FALLIDO')::int as fallidos,
        count(*) filter (where estado='INCIERTO')::int as inciertos,
        min("creadoEn") filter (where estado='PENDIENTE') as "pendienteDesde"
        from (select estado,"creadoEn" from "notificacionesPago" where estado in ('PENDIENTE','FALLIDO','INCIERTO')
          union all select estado,"creadoEn" from "notificacionesCorreo" where estado in ('PENDIENTE','FALLIDO','INCIERTO')) avisos`),
    ]);
    return { items: avisos.rows.slice(0, limite), pagina, haySiguiente: avisos.rows.length > limite && pagina < 1000,
      habilitado: env.correoHabilitado, resumen: resumen.rows[0] };
  });
}
