import { pool, type Consultor } from "../../shared/database.js";
import type { CertificadoHistorial, CursoHistorial, SesionHistorial } from "../../entities/historial/historial.js";

type Persona = { id: string; nombre: string; dni: string | null; role: string };
export type CursoSinDetalle = Omit<CursoHistorial, "sesiones" | "asistencia" | "certificados">;

/** Consultas de un historial; dentro de `enLecturaConsistente` ven una misma instantánea. */
export type HistorialLectura = {
  /** Persona consultada; null si no existe o si el actor ya no existe. */
  buscarPersona(usuarioId: string, actorId: number | string): Promise<Persona | null>;
  cursos(usuarioId: string): Promise<CursoSinDetalle[]>;
  sesiones(usuarioId: string, cursoIds: string[]): Promise<SesionHistorial[]>;
  certificados(usuarioId: string): Promise<CertificadoHistorial[]>;
};

export type HistorialRepository = HistorialLectura & {
  enLecturaConsistente<T>(trabajo: (lectura: HistorialLectura) => Promise<T>): Promise<T>;
  listarColegiados(actorId: number | string): Promise<{ id: string; nombre: string; dni: string | null }[]>;
  /** La consulta del archivo también verifica al propietario o al administrador. */
  archivoCertificado(certificadoId: string, usuarioId: string, actorId: number | string): Promise<Buffer | null>;
};

function lectura(consultor: Consultor): HistorialLectura {
  return {
    async buscarPersona(usuarioId, actorId) {
      return (await consultor.query<Persona>(`
    select u.id::text,u.name as nombre,u.dni,u.role
    from users u join users a on a.id=$2 where u.id=$1`, [usuarioId, actorId])).rows[0] ?? null;
    },
    async cursos(usuarioId) {
      return (await consultor.query<CursoSinDetalle>(`
      select c.id::text,c.titulo,
        case when i.estado='PENDIENTE_PAGO' and t."venceEn"<=clock_timestamp() then 'CANCELADA' else i.estado end as estado,
        (coalesce(p.estado='PENDIENTE',i.estado='PENDIENTE_PAGO') and i.estado<>'CANCELADA'
          and (t."venceEn" is null or t."venceEn">clock_timestamp() or t."modalidadCobro"='CERTIFICADO')) as "pagoPendiente",
        t."pagoId"::text,t."modalidadCobro",t."importeCentimos"::float8,t."venceEn"::text,e.estado as "estadoEntrega",
        case when p.estado='PAGADO' then 'PAGADO' when i.estado='CANCELADA' or (i.estado='PENDIENTE_PAGO' and t."venceEn"<=clock_timestamp()) then 'VENCIDO'
          when t."modalidadCobro"='GRATUITO' then 'EXENTO' when p.estado='PENDIENTE' then 'PENDIENTE'
          when t."modalidadCobro"='CERTIFICADO' then 'NOEXIGIBLE' else 'SINREGISTRO' end as "estadoFinanciero",
        coalesce((select jsonb_agg(jsonb_build_object('intentoId',anterior.id,'estado',anterior.estado,'modalidadCobro',anterior."modalidadCobro",
          'importeCentimos',anterior."importeCentimos",'inscritoEn',anterior."inscritoEn",'venceEn',anterior."venceEn",'pagoId',anterior."pagoId"::text,
          'estadoFinanciero',case when pagoAnterior.estado='PAGADO' then 'PAGADO' when anterior.estado='CANCELADA' then 'VENCIDO' else 'PENDIENTE' end)
          order by anterior."inscritoEn" desc,anterior.id)
          from "intentosInscripcion" anterior left join "obligacionesPago" pagoAnterior on pagoAnterior.id=anterior."pagoId"
          where anterior."cursoId"=i.curso_id and anterior."usuarioId"=i.usuario_id and anterior.id is distinct from i."intentoId"),'[]'::jsonb) as "intentosAnteriores",
        c.horas_lectivas as "horasLectivas",c.modalidad,
        to_char(i.inscrito_en at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as "inscritoEn",to_char(i.terminado_en at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as "terminadoEn"
      from inscripciones_curso i join cursos c on c.id=i.curso_id join users u on u.id=i.usuario_id
      left join "intentosInscripcion" t on t.id=i."intentoId" left join "obligacionesPago" p on p.id=t."pagoId"
      left join "entregasConstancia" e on e."intentoId"=t.id
      where i.usuario_id=$1 order by i.inscrito_en desc,c.id desc`, [usuarioId])).rows;
    },
    async sesiones(usuarioId, cursoIds) {
      return (await consultor.query<SesionHistorial>(`
      select s.id::text,s.curso_id::text as "cursoId",s.nombre as titulo,to_char(s.fecha,'YYYY-MM-DD') as fecha,
        to_char(s.hora_inicio,'HH24:MI') as "horaInicio",to_char(s.hora_fin,'HH24:MI') as "horaFin",
        (s.estado <> 'CANCELADA' and s.fecha+s.hora_inicio <= (now() at time zone 'America/Lima')) as contabiliza,
        case when s.estado='CANCELADA' then 'CANCELADA' when a.id is not null then 'PRESENTE'
          when s.fecha+s.hora_inicio > (now() at time zone 'America/Lima') then 'PENDIENTE' else 'AUSENTE' end as estado,
        to_char(a.timestamp_lima,'YYYY-MM-DD"T"HH24:MI:SS"-05:00"') as "horaRegistro"
      from classes s join users u on u.id=$1
      left join attendances a on a.class_id=s.id and a.user_id=u.id
      where (s.curso_id=any($2::bigint[]) or exists(select 1 from enrollments e where e.class_id=s.id and e.user_id=u.id))
      order by s.fecha,s.hora_inicio,s.id`, [usuarioId, cursoIds])).rows;
    },
    async certificados(usuarioId) {
      return (await consultor.query<CertificadoHistorial>(`select cert.id::text,cert.curso_id::text as "cursoId",cert.codigo,cert.tipo,cert.estado,
      coalesce((cert.datos->>'horasLectivas')::integer,c.horas_lectivas) as "horasLectivas",
      to_char(cert.emitido_en at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as "emitidoEn"
      from certificados_curso cert join cursos c on c.id=cert.curso_id
      join users u on u.id=cert.usuario_id
      where cert.usuario_id=$1 and cert.estado<>'REEMPLAZADO' order by cert.emitido_en desc,cert.id desc`, [usuarioId])).rows;
    }
  };
}

export const historialRepository: HistorialRepository = {
  ...lectura(pool),
  async enLecturaConsistente(trabajo) {
    const cliente = await pool.connect();
    try {
      await cliente.query("begin isolation level repeatable read read only");
      const resultado = await trabajo(lectura(cliente));
      await cliente.query("commit");
      return resultado;
    } catch (error) {
      await cliente.query("rollback");
      throw error;
    } finally {
      cliente.release();
    }
  },
  async listarColegiados(actorId) {
    return (await pool.query<{ id: string; nombre: string; dni: string | null }>(`select u.id::text,u.name as nombre,u.dni from users u
    join users a on a.id=$1 where u.role='agremiado' order by u.name,u.id`, [actorId])).rows;
  },
  async archivoCertificado(certificadoId, usuarioId, actorId) {
    return (await pool.query<{ archivo: Buffer }>(`select cert.archivo from certificados_curso cert
    join cursos c on c.id=cert.curso_id join users u on u.id=cert.usuario_id
    join users a on a.id=$3
    where cert.id=$1 and cert.usuario_id=$2 and cert.estado='VALIDO' and (a.id=u.id or a.role='admin')`, [certificadoId, usuarioId, actorId])).rows[0]?.archivo ?? null;
  }
};
