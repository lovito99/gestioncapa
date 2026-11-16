import type { PoolClient } from "pg";
import { pool } from "../../shared/database.js";
import type { UsuarioAutenticado } from "../../plugins/autorizacion.js";
import { calcularAsistenciaVirtual } from "./asistenciaVirtual.js";

export type Reunion = {
  identificador: string;
  claseIdentificador: string;
  nombreSala: string;
  titulo: string;
  inicioProgramado: Date;
  finProgramado: Date;
  estado: "programada" | "iniciada" | "cancelada" | "finalizada";
  creadorIdentificador: string;
  camaraPermitida: boolean;
  microfonoPermitido: boolean;
  pantallaPermitida: boolean;
  /** En desuso desde HU-26: la sala de espera siempre está activa. */
  salaEsperaHabilitada: boolean;
  manoPermitida: boolean;
  porcentajeMinimo: number;
  grabacionPrevista: boolean;
  iniciadaEn: Date | null;
  finalizadaEn: Date | null;
};

/**
 * Cierra las conexiones abiertas y guarda la asistencia virtual de cada inscrito.
 * Debe ejecutarse en la transacción que marca la reunión como finalizada.
 */
export async function registrarAsistenciaVirtual(cliente: PoolClient, reunion: Reunion, registradoPor: number) {
  await cliente.query(`update "conexionesReunion" set "salidaEn" = greatest("entradaEn", $2::timestamptz)
    where "reunionIdentificador" = $1 and "salidaEn" is null`, [reunion.identificador, reunion.finalizadaEn]);
  const referencia = { inicio: (reunion.iniciadaEn ?? reunion.inicioProgramado).getTime() / 1000, fin: reunion.finalizadaEn!.getTime() / 1000 };
  const inscritos = (await cliente.query<{ usuario: string; expulsado: boolean }>(`select inscripcion.user_id::text as usuario,
      exists(select 1 from "participantesReunion" participante where participante."reunionIdentificador" = $1
        and participante."usuarioIdentificador" = inscripcion.user_id and participante.estado = 'retirado') as expulsado
    from enrollments inscripcion join classes clase on clase.id = inscripcion.class_id
    where inscripcion.class_id = $2 and inscripcion.user_id <> clase.instructor_id`, [reunion.identificador, reunion.claseIdentificador])).rows;
  const conexiones = (await cliente.query<{ usuario: string; inicio: number; fin: number }>(`select "usuarioIdentificador"::text as usuario,
      extract(epoch from "entradaEn")::float8 as inicio, extract(epoch from "salidaEn")::float8 as fin
    from "conexionesReunion" where "reunionIdentificador" = $1`, [reunion.identificador])).rows;
  for (const { usuario, expulsado } of inscritos) {
    const resultado = calcularAsistenciaVirtual(conexiones.filter(conexion => conexion.usuario === usuario), referencia, reunion.porcentajeMinimo);
    // Quien fue expulsado no acredita asistencia de esa sesión aunque estuviera conectado.
    const cuenta = resultado.cuenta && !expulsado;
    await cliente.query(`insert into "asistenciaReunion" ("reunionIdentificador", "usuarioIdentificador", "segundosConectados", porcentaje, cuenta, expulsado)
      values ($1,$2,$3,$4,$5,$6) on conflict do nothing`,
    [reunion.identificador, usuario, Math.round(resultado.segundosConectados), resultado.porcentaje, cuenta, expulsado]);
    if (!cuenta) continue;
    // Una asistencia QR previa se conserva; los cursos cerrados no admiten asistencias nuevas.
    await cliente.query(`insert into attendances (class_id, user_id, created_by, origen)
      select clase.id, $2, $3, 'VIRTUAL' from classes clase left join cursos curso on curso.id = clase.curso_id
      where clase.id = $1 and clase.estado = 'PROGRAMADA' and (curso.id is null or curso.estado <> 'CERRADO')
      on conflict (class_id, user_id) do nothing`, [reunion.claseIdentificador, usuario, registradoPor]);
  }
}

export async function consultarAsistenciaVirtual(cliente: PoolClient, reunionIdentificador: string) {
  return (await cliente.query(`select resultado."usuarioIdentificador"::text as "usuarioIdentificador", persona.name as nombre,
      resultado."segundosConectados", resultado.porcentaje::float8 as porcentaje, resultado.cuenta, resultado.expulsado
    from "asistenciaReunion" resultado join users persona on persona.id = resultado."usuarioIdentificador"
    where resultado."reunionIdentificador" = $1 order by persona.name, persona.id`, [reunionIdentificador])).rows;
}

export async function conTransaccion<T>(operacion: (cliente: PoolClient) => Promise<T>) {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    const resultado = await operacion(cliente);
    await cliente.query("commit");
    return resultado;
  } catch (error) {
    await cliente.query("rollback");
    throw error;
  } finally { cliente.release(); }
}

// La inscripción y el estado se vuelven a comprobar incluso con un JWT vigente.
export async function comprobarAcceso(cliente: PoolClient, reunion: Reunion, usuario: UsuarioAutenticado) {
  const resultado = await cliente.query<{ gestion: boolean; instructor: boolean; inscrito: boolean; activa: boolean; retirado: boolean }>(`
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
    for share of clase, persona`, [reunion.identificador, reunion.claseIdentificador, usuario.id]);
  return resultado.rows[0];
}

export async function obtenerReunion(cliente: PoolClient, identificador: string) {
  return (await cliente.query<Reunion>('select * from reuniones where identificador = $1 for update', [identificador])).rows[0];
}

export async function listarReuniones(usuario: UsuarioAutenticado) {
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
    order by reunion."inicioProgramado" desc`, [usuario.id])).rows;
}
