import { pool } from "../../shared/database.js";
import type { EstadoCorreo, TipoCorreo } from "../../entities/notificaciones/correo.js";

export type FiltroAvisos = { tipo?: TipoCorreo | undefined; estado?: EstadoCorreo | undefined; limite: number; desplazamiento: number };
export type ResumenAvisos = { pendientes: number; fallidos: number; inciertos: number; pendienteDesde: Date | null };

export type ConsultaCorreoRepository = {
  /** Avisos de pagos y cursos, más recientes primero; sin datos de entrega privados. */
  listar(filtro: FiltroAvisos): Promise<Record<string, unknown>[]>;
  resumen(): Promise<ResumenAvisos>;
};

// Los errores se clasifican: un detalle no previsto nunca llega al administrador.
const columnas = `n.id,n.tipo,n.estado,n.intentos,n."creadoEn",n."enviadoEn",
  case when n.estado='PENDIENTE' then n."intentarEn" end as "proximoIntentoEn",
  case when n."ultimoError" in ('SMTP_RESULTADO_INCIERTO','SMTP_RECHAZADO','SMTP_FALLO_TEMPORAL',
    'SMTP_INTENTOS_AGOTADOS','SMTP_NO_ENTREGADO','DESTINATARIO_CAMBIADO','CORREO_INVALIDO','CONTENIDO_INVALIDO')
    then n."ultimoError" when n."ultimoError" is not null then 'ERROR_NO_CLASIFICADO' end as "ultimoError"`;

export const consultaCorreoRepository: ConsultaCorreoRepository = {
  async listar({ tipo, estado, limite, desplazamiento }) {
    return (await pool.query(`select * from (
        select ${columnas},p."cursoId"::text as "cursoId",n."pagoId"::text as "pagoId"
          from "notificacionesPago" n join "obligacionesPago" p on p.id=n."pagoId"
          where ($1::text is null or n.tipo=$1) and ($2::text is null or n.estado=$2)
        union all
        select ${columnas},n."cursoId"::text,null::text
          from "notificacionesCorreo" n
          where ($1::text is null or n.tipo=$1) and ($2::text is null or n.estado=$2)
      ) avisos order by "creadoEn" desc,id desc limit $3 offset $4`,
      [tipo ?? null, estado ?? null, limite, desplazamiento])).rows;
  },
  async resumen() {
    return (await pool.query<ResumenAvisos>(`select count(*) filter (where estado='PENDIENTE')::int as pendientes,
        count(*) filter (where estado='FALLIDO')::int as fallidos,
        count(*) filter (where estado='INCIERTO')::int as inciertos,
        min("creadoEn") filter (where estado='PENDIENTE') as "pendienteDesde"
        from (select estado,"creadoEn" from "notificacionesPago" where estado in ('PENDIENTE','FALLIDO','INCIERTO')
          union all select estado,"creadoEn" from "notificacionesCorreo" where estado in ('PENDIENTE','FALLIDO','INCIERTO')) avisos`)).rows[0]!;
  }
};
