import type { PoolClient } from "pg";
import { pool, type Consultor } from "../../shared/database.js";
import { conTransaccion } from "../../shared/transaccion.js";
import type { Afiliacion, ModalidadCobro, OfertaCurso, TipoPrecio } from "../../entities/cursos/curso.js";
import { crearObligacion } from "../pagos/pagosRepository.js";
import { avisarInscripcionConfirmada } from "../notificaciones/avisosCorreoRepository.js";

type NuevoIntento = {
  intentoId: string; cursoId: string; usuarioId: number; modalidadCobro: ModalidadCobro; importeCentimos: number;
  versionCobro: number; plazoPagoMinutos: number | null; pendiente: boolean; tipoPrecio: TipoPrecio | null;
};

/** Operaciones de una inscripción; el curso queda bloqueado para serializar la última plaza. */
export type InscripcionTransaccion = {
  bloquearCurso(cursoId: string): Promise<OfertaCurso | undefined>;
  agremiadoActivo(usuarioId: number): Promise<{ dni: string | null } | undefined>;
  cancelarReservasVencidas(cursoId: string): Promise<void>;
  inscripcionActual(cursoId: string, usuarioId: number): Promise<{ estado: string } | undefined>;
  afiliacion(dni: string, usuarioId: number): Promise<Afiliacion | undefined>;
  contarInscritos(cursoId: string): Promise<number>;
  /** Registra el intento y la inscripción; reactiva una inscripción cancelada. */
  registrarIntento(datos: NuevoIntento): Promise<void>;
  /** Crea la obligación de pago del curso y la enlaza con el intento; devuelve su id. */
  crearObligacionPago(datos: { cursoId: string; usuarioId: number; intentoId: string; importeCentimos: number }): Promise<string>;
  /** Matricula en las sesiones programadas y encola el aviso de inscripción confirmada. */
  confirmarAcceso(cursoId: string, usuarioId: number, intentoId: string): Promise<void>;
};

export type InscripcionesRepository = {
  enTransaccion<T>(trabajo: (tx: InscripcionTransaccion) => Promise<T>): Promise<T>;
  padronVigente(): Promise<boolean>;
  afiliacion(dni: string, usuarioId: number): Promise<Afiliacion | undefined>;
  dniDe(usuarioId: number): Promise<string | null>;
};

const padronVigente = `r.id=1 and r."validadoEn"<=statement_timestamp()
  and r."vigenteHasta">statement_timestamp() and exists(select 1 from "padronCppp")`;

async function consultarAfiliacion(conexion: Consultor, dni: string, usuarioId: number) {
  return (await conexion.query<Afiliacion>(
    `select p.habilitado, p."usuarioIdVerificado"=$2 as vinculado
     from "controlPadronCppp" r left join "padronCppp" p on p.dni=$1
     where ${padronVigente}`, [dni, usuarioId],
  )).rows[0];
}

export async function cancelarReservasVencidas(cliente: Consultor, cursoId: string) {
  await cliente.query(`with vencidos as (
    update "intentosInscripcion" set estado='CANCELADA',"canceladoEn"=clock_timestamp()
    where "cursoId"=$1 and estado='PENDIENTE_PAGO' and "venceEn"<=clock_timestamp() returning id
  ) update inscripciones_curso set estado='CANCELADA' where "intentoId" in (select id from vencidos)`, [cursoId]);
}

/** Proceso periódico: cancela las reservas vencidas de hasta 100 cursos; devuelve cuántos revisó. */
export async function vencerReservas() {
  const cursos = (await pool.query<{ id: string }>(`select distinct "cursoId"::text as id from "intentosInscripcion"
    where estado='PENDIENTE_PAGO' and "venceEn"<=clock_timestamp() limit 100`)).rows;
  for (const curso of cursos) {
    await conTransaccion(pool, async (cliente) => {
      await cliente.query("select id from cursos where id=$1 for update", [curso.id]);
      await cancelarReservasVencidas(cliente, curso.id);
    });
  }
  return cursos.length;
}

function transaccion(cliente: PoolClient): InscripcionTransaccion {
  return {
    async bloquearCurso(cursoId) {
      return (await cliente.query<OfertaCurso>('select estado,cupos,costo::float8 as costo,"precioGeneral"::float8,"modalidadCobro","plazoPagoMinutos","versionCobro" from cursos where id=$1 for update', [cursoId])).rows[0];
    },
    async agremiadoActivo(usuarioId) {
      return (await cliente.query<{ dni: string | null }>(`select dni from users where id=$1 and active and role='agremiado' for share`, [usuarioId])).rows[0];
    },
    cancelarReservasVencidas: (cursoId) => cancelarReservasVencidas(cliente, cursoId),
    async inscripcionActual(cursoId, usuarioId) {
      return (await cliente.query<{ estado: string }>("select estado from inscripciones_curso where curso_id=$1 and usuario_id=$2", [cursoId, usuarioId])).rows[0];
    },
    afiliacion: (dni, usuarioId) => consultarAfiliacion(cliente, dni, usuarioId),
    async contarInscritos(cursoId) {
      return (await cliente.query<{ total: number }>(`select count(*)::int as total from inscripciones_curso where curso_id=$1 and estado<>'CANCELADA'`, [cursoId])).rows[0]!.total;
    },
    async registrarIntento({ intentoId, cursoId, usuarioId, modalidadCobro, importeCentimos, versionCobro, plazoPagoMinutos, pendiente, tipoPrecio }) {
      await cliente.query(`with instante as(select clock_timestamp() as ahora)
      insert into "intentosInscripcion"(id,"cursoId","usuarioId","modalidadCobro","importeCentimos","versionCobro","plazoPagoMinutos","inscritoEn","venceEn",estado,"tipoPrecio")
      select $1,$2,$3,$4,$5,$6,$7,ahora,case when $7::int is not null then ahora+make_interval(mins=>$7) else null end,$8,$9 from instante`,
      [intentoId, cursoId, usuarioId, modalidadCobro, importeCentimos, versionCobro, plazoPagoMinutos, pendiente ? "PENDIENTE_PAGO" : "EN_CURSO", tipoPrecio]);
      await cliente.query(`insert into inscripciones_curso(curso_id,usuario_id,estado,"intentoId") values($1,$2,$3,$4)
      on conflict(curso_id,usuario_id) do update set estado=excluded.estado,"intentoId"=excluded."intentoId",inscrito_en=clock_timestamp(),terminado_en=null`,
      [cursoId, usuarioId, pendiente ? "PENDIENTE_PAGO" : "EN_CURSO", intentoId]);
    },
    async crearObligacionPago({ cursoId, usuarioId, intentoId, importeCentimos }) {
      const pago = await crearObligacion(cliente, { cursoId, usuarioId, intentoId, concepto: "CURSO", importeCentimos, moneda: "PEN" });
      await cliente.query('update "intentosInscripcion" set "pagoId"=$2 where id=$1', [intentoId, pago.id]);
      return pago.id;
    },
    async confirmarAcceso(cursoId, usuarioId, intentoId) {
      await cliente.query(`insert into enrollments(class_id,user_id)
        select id,$2 from classes where curso_id=$1 and estado='PROGRAMADA'
        on conflict(class_id,user_id) do nothing`, [cursoId, usuarioId]);
      await avisarInscripcionConfirmada(cliente, cursoId, usuarioId, intentoId);
    }
  };
}

export const inscripcionesRepository: InscripcionesRepository = {
  enTransaccion: (trabajo) => conTransaccion(pool, (cliente) => trabajo(transaccion(cliente))),
  async padronVigente() {
    return Boolean((await pool.query(`select 1 from "controlPadronCppp" r where ${padronVigente}`)).rowCount);
  },
  afiliacion: (dni, usuarioId) => consultarAfiliacion(pool, dni, usuarioId),
  async dniDe(usuarioId) {
    return (await pool.query<{ dni: string | null }>("select dni from users where id=$1", [usuarioId])).rows[0]?.dni ?? null;
  }
};
