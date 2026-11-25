import { randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../shared/database.js";
import { conTransaccion } from "../../shared/transaccion.js";
import type { AccesoReunion, EstadoReunion, Reunion, ResultadoAsistenciaVirtual } from "../../entities/reuniones/reunion.js";

type DatosNuevaReunion = { claseIdentificador: string; titulo: string; inicioProgramado: Date | string; finProgramado: Date | string; creadorIdentificador: number | string };
type Horario = { titulo: string; inicioProgramado: string; finProgramado: string };
type Politicas = Pick<Reunion, "camaraPermitida" | "microfonoPermitido" | "pantallaPermitida" | "manoPermitida" | "porcentajeMinimo" | "grabacionPrevista">;

/** Operaciones dentro de la transacción de una reunión, que queda bloqueada al leerla. */
export type ReunionesTransaccion = {
  obtener(identificador: string): Promise<Reunion | undefined>;
  comprobarAcceso(reunion: Reunion, usuarioId: number | string): Promise<AccesoReunion | undefined>;
  /** Sesión programada que el creador puede usar: el administrador, cualquiera; el instructor, solo las que dicta. */
  claseParaReunion(claseId: number, creadorId: number | string): Promise<{ id: string; instructor_id: string; modalidad: string } | undefined>;
  crearReunionDeClase(datos: DatosNuevaReunion): Promise<Reunion>;
  actualizarHorario(identificador: string, datos: Horario): Promise<Reunion>;
  /** iniciadaEn y finalizadaEn delimitan la duración de referencia de la asistencia virtual. */
  cambiarEstado(identificador: string, destino: EstadoReunion): Promise<Reunion>;
  actualizarPoliticas(identificador: string, politicas: Politicas): Promise<Reunion>;
  participantes(reunion: Reunion): Promise<Record<string, unknown>[]>;
  esParticipanteRetirable(claseId: string, usuarioId: number): Promise<boolean>;
  retirarParticipante(reunionId: string, usuarioId: number): Promise<void>;
  consultarAsistenciaVirtual(reunionId: string): Promise<Record<string, unknown>[]>;
  avisoGrabacionAceptado(reunionId: string, usuarioId: number | string): Promise<Date | null | undefined>;
  aceptarAvisoGrabacion(reunionId: string, usuarioId: number | string): Promise<void>;
  cerrarConexiones(reunionId: string, finalizadaEn: Date): Promise<void>;
  inscritosParaAsistencia(reunionId: string, claseId: string): Promise<{ usuario: string; expulsado: boolean }[]>;
  conexiones(reunionId: string): Promise<{ usuario: string; inicio: number; fin: number }[]>;
  guardarAsistenciaVirtual(reunionId: string, usuario: string, resultado: ResultadoAsistenciaVirtual): Promise<void>;
  /** Una asistencia QR previa se conserva; los cursos cerrados no admiten asistencias nuevas. */
  registrarAsistenciaDeClase(claseId: string, usuario: string, registradoPor: number): Promise<void>;
};

export type ReunionesRepository = {
  enTransaccion<T>(trabajo: (tx: ReunionesTransaccion) => Promise<T>): Promise<T>;
  listar(usuarioId: number | string): Promise<Reunion[]>;
};

/** Crea la reunión con su anfitrión, los inscritos de la sesión y sus invitaciones pendientes. */
export async function crearReunionDeClase(cliente: PoolClient, datos: DatosNuevaReunion) {
  const identificador = randomUUID();
  const reunion = (await cliente.query<Reunion>(`insert into reuniones
    (identificador, "claseIdentificador", "nombreSala", titulo, "inicioProgramado", "finProgramado", "creadorIdentificador")
    values ($1,$2,$3,$4,$5,$6,$7) returning *`, [identificador, datos.claseIdentificador, `reunion${randomBytes(24).toString("hex")}`,
    datos.titulo, datos.inicioProgramado, datos.finProgramado, datos.creadorIdentificador])).rows[0]!;
  await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol)
    select $1, instructor_id, 'anfitrion' from classes where id = $2`, [identificador, datos.claseIdentificador]);
  await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol)
    select $1, user_id, 'participante' from enrollments where class_id = $2 on conflict do nothing`, [identificador, datos.claseIdentificador]);
  await cliente.query(`insert into "notificacionesReunion" ("reunionIdentificador", "usuarioIdentificador", tipo)
    select $1, "usuarioIdentificador", 'invitacion' from "participantesReunion" where "reunionIdentificador" = $1`, [identificador]);
  return reunion;
}

/**
 * HU-36: una sesión virtual o «ambas» tiene una sala programada con su mismo horario; si pasa a
 * presencial o se cancela, la sala aún no iniciada se cancela. Una sala iniciada no se toca.
 * Se ejecuta en la transacción de quien cambia la sesión (clases y cursos).
 */
export async function sincronizarSalaSesion(cliente: PoolClient, claseIdentificador: number | string, actorIdentificador: number) {
  const clase = (await cliente.query<{ nombre: string; modalidad: string; estado: string; inicio: Date; fin: Date }>(`select nombre, modalidad, estado,
      (fecha + hora_inicio) at time zone 'America/Lima' as inicio, (fecha + hora_fin) at time zone 'America/Lima' as fin
    from classes where id = $1 for update`, [claseIdentificador])).rows[0];
  if (!clase) return;
  const activa = (await cliente.query<{ identificador: string; estado: string }>(`select identificador, estado from reuniones
    where "claseIdentificador" = $1 and estado in ('programada','iniciada') order by "fechaCreacion" desc limit 1 for update`, [claseIdentificador])).rows[0];
  const conSala = clase.estado === 'PROGRAMADA' && clase.modalidad !== 'PRESENCIAL';
  if (conSala && !activa) {
    await crearReunionDeClase(cliente, { claseIdentificador: String(claseIdentificador), titulo: clase.nombre, inicioProgramado: clase.inicio, finProgramado: clase.fin, creadorIdentificador: actorIdentificador });
  } else if (conSala && activa?.estado === 'programada') {
    await cliente.query(`update reuniones set titulo = $2, "inicioProgramado" = $3, "finProgramado" = $4 where identificador = $1`,
      [activa.identificador, clase.nombre, clase.inicio, clase.fin]);
  } else if (!conSala && activa?.estado === 'programada') {
    await cliente.query(`update reuniones set estado = 'cancelada' where identificador = $1`, [activa.identificador]);
  }
}

function transaccion(cliente: PoolClient): ReunionesTransaccion {
  return {
    async obtener(identificador) {
      return (await cliente.query<Reunion>('select * from reuniones where identificador = $1 for update', [identificador])).rows[0];
    },
    async comprobarAcceso(reunion, usuarioId) {
      const resultado = await cliente.query<AccesoReunion>(`
    select
      (persona.role in ('admin')) as gestion,
      (clase.instructor_id = persona.id) as instructor,
      (exists(select 1 from enrollments where class_id = clase.id and user_id = persona.id)
        and (clase.curso_id is null or "tieneAccesoCurso"(clase.curso_id,persona.id))) as inscrito,
      (clase.estado = 'PROGRAMADA') as activa,
      exists(select 1 from "participantesReunion" where "reunionIdentificador" = $1
        and "usuarioIdentificador" = persona.id and estado = 'retirado') as retirado
    from classes clase join users persona on true
    where clase.id = $2 and persona.id = $3 and persona.active
    for share of clase, persona`, [reunion.identificador, reunion.claseIdentificador, usuarioId]);
      return resultado.rows[0];
    },
    async claseParaReunion(claseId, creadorId) {
      return (await cliente.query(`select clase.id, clase.instructor_id, clase.modalidad from classes clase
        join users creador on creador.id = $2
        where clase.id = $1 and clase.estado = 'PROGRAMADA' and creador.active
        and (creador.role = 'admin' or (creador.role = 'instructor' and clase.instructor_id = creador.id)) for update of clase`, [claseId, creadorId])).rows[0];
    },
    crearReunionDeClase: (datos) => crearReunionDeClase(cliente, datos),
    async actualizarHorario(identificador, datos) {
      return (await cliente.query<Reunion>(`update reuniones set titulo=$2, "inicioProgramado"=$3, "finProgramado"=$4
        where identificador=$1 returning *`, [identificador, datos.titulo, datos.inicioProgramado, datos.finProgramado])).rows[0]!;
    },
    async cambiarEstado(identificador, destino) {
      return (await cliente.query<Reunion>(`update reuniones set estado=$2,
          "iniciadaEn" = case when $2 = 'iniciada' then coalesce("iniciadaEn", now()) else "iniciadaEn" end,
          "finalizadaEn" = case when $2 = 'finalizada' then now() else "finalizadaEn" end
          where identificador=$1 returning *`, [identificador, destino])).rows[0]!;
    },
    async actualizarPoliticas(identificador, politicas) {
      return (await cliente.query<Reunion>(`update reuniones set "camaraPermitida"=$2, "microfonoPermitido"=$3, "pantallaPermitida"=$4,
        "manoPermitida"=$5, "porcentajeMinimo"=$6, "grabacionPrevista"=$7 where identificador=$1 returning *`,
      [identificador, politicas.camaraPermitida, politicas.microfonoPermitido, politicas.pantallaPermitida,
        politicas.manoPermitida, politicas.porcentajeMinimo, politicas.grabacionPrevista])).rows[0]!;
    },
    async participantes(reunion) {
      return (await cliente.query(`select persona.id as identificador, persona.name as nombre, persona.email as correo,
      case when persona.id = clase.instructor_id then 'anfitrion' else 'participante' end as rol,
      coalesce(participante.estado, 'autorizado') as estado
      from classes clase join users persona on persona.active
      left join "participantesReunion" participante on participante."reunionIdentificador"=$1 and participante."usuarioIdentificador"=persona.id
      where clase.id=$2 and (persona.id=clase.instructor_id or exists(select 1 from enrollments where class_id=clase.id and user_id=persona.id))`,
      [reunion.identificador, reunion.claseIdentificador])).rows;
    },
    async esParticipanteRetirable(claseId, usuarioId) {
      return Boolean((await cliente.query(`select persona.id from users persona join classes clase
        on true where clase.id=$1 and persona.id=$2
        and persona.id <> clase.instructor_id and exists(select 1 from enrollments where class_id=clase.id and user_id=persona.id)`,
        [claseId, usuarioId])).rows[0]);
    },
    async retirarParticipante(reunionId, usuarioId) {
      await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol, estado, "retiradoEn")
        values ($1,$2,'participante','retirado',now()) on conflict ("reunionIdentificador", "usuarioIdentificador")
        do update set estado='retirado', "retiradoEn"=coalesce("participantesReunion"."retiradoEn", now())`,
        [reunionId, usuarioId]);
    },
    async consultarAsistenciaVirtual(reunionId) {
      return (await cliente.query(`select resultado."usuarioIdentificador"::text as "usuarioIdentificador", persona.name as nombre,
      resultado."segundosConectados", resultado.porcentaje::float8 as porcentaje, resultado.cuenta, resultado.expulsado
    from "asistenciaReunion" resultado join users persona on persona.id = resultado."usuarioIdentificador"
    where resultado."reunionIdentificador" = $1 order by persona.name, persona.id`, [reunionId])).rows;
    },
    async avisoGrabacionAceptado(reunionId, usuarioId) {
      return (await cliente.query<{ avisoGrabacionAceptadoEn: Date | null }>(`select "avisoGrabacionAceptadoEn" from "participantesReunion"
          where "reunionIdentificador"=$1 and "usuarioIdentificador"=$2`, [reunionId, usuarioId])).rows[0]?.avisoGrabacionAceptadoEn;
    },
    async aceptarAvisoGrabacion(reunionId, usuarioId) {
      await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol, "avisoGrabacionAceptadoEn")
          values ($1,$2,'participante',now()) on conflict ("reunionIdentificador", "usuarioIdentificador")
          do update set "avisoGrabacionAceptadoEn"=coalesce("participantesReunion"."avisoGrabacionAceptadoEn", now())`, [reunionId, usuarioId]);
    },
    async cerrarConexiones(reunionId, finalizadaEn) {
      await cliente.query(`update "conexionesReunion" set "salidaEn" = greatest("entradaEn", $2::timestamptz)
    where "reunionIdentificador" = $1 and "salidaEn" is null`, [reunionId, finalizadaEn]);
    },
    async inscritosParaAsistencia(reunionId, claseId) {
      return (await cliente.query<{ usuario: string; expulsado: boolean }>(`select inscripcion.user_id::text as usuario,
      exists(select 1 from "participantesReunion" participante where participante."reunionIdentificador" = $1
        and participante."usuarioIdentificador" = inscripcion.user_id and participante.estado = 'retirado') as expulsado
    from enrollments inscripcion join classes clase on clase.id = inscripcion.class_id
    where inscripcion.class_id = $2 and inscripcion.user_id <> clase.instructor_id`, [reunionId, claseId])).rows;
    },
    async conexiones(reunionId) {
      return (await cliente.query<{ usuario: string; inicio: number; fin: number }>(`select "usuarioIdentificador"::text as usuario,
      extract(epoch from "entradaEn")::float8 as inicio, extract(epoch from "salidaEn")::float8 as fin
    from "conexionesReunion" where "reunionIdentificador" = $1`, [reunionId])).rows;
    },
    async guardarAsistenciaVirtual(reunionId, usuario, { segundosConectados, porcentaje, cuenta, expulsado }) {
      await cliente.query(`insert into "asistenciaReunion" ("reunionIdentificador", "usuarioIdentificador", "segundosConectados", porcentaje, cuenta, expulsado)
      values ($1,$2,$3,$4,$5,$6) on conflict do nothing`,
      [reunionId, usuario, segundosConectados, porcentaje, cuenta, expulsado]);
    },
    async registrarAsistenciaDeClase(claseId, usuario, registradoPor) {
      await cliente.query(`insert into attendances (class_id, user_id, created_by, origen)
      select clase.id, $2, $3, 'VIRTUAL' from classes clase left join cursos curso on curso.id = clase.curso_id
      where clase.id = $1 and clase.estado = 'PROGRAMADA' and (curso.id is null or curso.estado <> 'CERRADO')
      on conflict (class_id, user_id) do nothing`, [claseId, usuario, registradoPor]);
    }
  };
}

export const reunionesRepository: ReunionesRepository = {
  enTransaccion: (trabajo) => conTransaccion(pool, (cliente) => trabajo(transaccion(cliente))),
  async listar(usuarioId) {
    return (await pool.query<Reunion>(`
    select reunion.* from reuniones reunion
    join classes clase on clase.id = reunion."claseIdentificador"
    join users persona on persona.id = $1
    where persona.active and (
      persona.role in ('admin') or clase.instructor_id = persona.id or
      (exists(select 1 from enrollments where class_id = clase.id and user_id = persona.id)
        and (clase.curso_id is null or "tieneAccesoCurso"(clase.curso_id,persona.id)))
    ) and not exists(select 1 from "participantesReunion" participante
      where participante."reunionIdentificador" = reunion.identificador
      and participante."usuarioIdentificador" = persona.id and participante.estado = 'retirado')
    order by reunion."inicioProgramado" desc`, [usuarioId])).rows;
  }
};
