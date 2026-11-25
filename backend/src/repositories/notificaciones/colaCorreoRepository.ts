import { pool } from "../../shared/database.js";
import type { AvisoCorreo, OrigenCola, ResultadoEnvio } from "../../entities/notificaciones/correo.js";

export type ColaCorreoRepository = {
  /** Pasa a INCIERTO los envíos cuyo bloqueo venció: no se sabe si el servidor los entregó. */
  liberarAtascados(origen: OrigenCola): Promise<void>;
  /** Reclama el siguiente aviso pendiente; varios trabajadores nunca reclaman el mismo. */
  reclamar(origen: OrigenCola, procesoId: string): Promise<AvisoCorreo | null>;
  /** Guarda el resultado solo si el aviso sigue reclamado por este proceso; devuelve las filas guardadas. */
  guardarResultado(origen: OrigenCola, avisoId: string, procesoId: string, resultado: ResultadoEnvio): Promise<number>;
};

const colas = {
  pagos: {
    tabla: '"notificacionesPago"',
    destinatario: 'join "obligacionesPago" p on p.id=n."pagoId" left join users u on u.id=p."usuarioId"',
    proyeccion: 'n.asunto,n.texto,n."pagoId"::text'
  },
  cursos: {
    tabla: '"notificacionesCorreo"',
    destinatario: 'left join users u on u.id=n."usuarioId"',
    proyeccion: `'' as asunto,'' as texto,null as "pagoId"`
  }
} as const;

export const colaCorreoRepository: ColaCorreoRepository = {
  async liberarAtascados(origen) {
    const { tabla } = colas[origen];
    await pool.query(`update ${tabla} set estado='INCIERTO',"ultimoError"='SMTP_RESULTADO_INCIERTO',
      "procesamientoId"=null,"bloqueadoHasta"=null where id in (
        select id from ${tabla} where estado='ENVIANDO' and "bloqueadoHasta"<=clock_timestamp()
        order by "bloqueadoHasta" for update skip locked limit 50)`);
  },
  async reclamar(origen, procesoId) {
    const cola = colas[origen];
    const tabla = cola.tabla;
    return (await pool.query<AvisoCorreo>(`with reclamado as (
        update ${tabla} set estado='ENVIANDO',"procesamientoId"=$1,
          "bloqueadoHasta"=clock_timestamp()+interval '2 minutes',intentos=intentos+1
        where id=(select id from ${tabla} where estado='PENDIENTE' and "intentarEn"<=clock_timestamp()
          order by "intentarEn","creadoEn",id for update skip locked limit 1) returning *)
        select n.id,n.tipo,n.destinatario,n.intentos,n.datos,${cola.proyeccion},
          u.email as "emailActual",u.active as activo from reclamado n ${cola.destinatario}`, [procesoId])).rows[0] ?? null;
  },
  async guardarResultado(origen, avisoId, procesoId, resultado) {
    const { tabla } = colas[origen];
    const guardado = await pool.query(`update ${tabla} set estado=$3::varchar,"ultimoError"=$4,
        "enviadoEn"=case when $3='ENVIADO' then clock_timestamp() else "enviadoEn" end,
        "intentarEn"=coalesce(clock_timestamp()+make_interval(secs=>$5::integer),"intentarEn"),
        "procesamientoId"=null,"bloqueadoHasta"=null where id=$1 and "procesamientoId"=$2`,
      [avisoId, procesoId, resultado.estado, resultado.codigo, resultado.espera ?? null]);
    return guardado.rowCount ?? 0;
  }
};
