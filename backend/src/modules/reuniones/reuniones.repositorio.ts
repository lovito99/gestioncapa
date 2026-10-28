import type { PoolClient } from "pg";
import { pool } from "../../shared/database.js";
import type { UsuarioAutenticado } from "../../plugins/autorizacion.js";

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
  salaEsperaHabilitada: boolean;
};

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

// La organización, inscripción y estado se vuelven a comprobar incluso con un JWT vigente.
export async function comprobarAcceso(cliente: PoolClient, reunion: Reunion, usuario: UsuarioAutenticado) {
  const resultado = await cliente.query<{ gestion: boolean; instructor: boolean; inscrito: boolean; activa: boolean; retirado: boolean }>(`
    select
      (persona.role in ('admin','coordinador')) as gestion,
      (clase.instructor_id = persona.id) as instructor,
      exists(select 1 from enrollments where class_id = clase.id and user_id = persona.id) as inscrito,
      (clase.estado = 'PROGRAMADA') as activa,
      exists(select 1 from "participantesReunion" where "reunionIdentificador" = $1
        and "usuarioIdentificador" = persona.id and estado = 'retirado') as retirado
    from classes clase join users persona on persona.organization_id = clase.organization_id
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
    join users persona on persona.organization_id = clase.organization_id and persona.id = $1
    where persona.active and (
      persona.role in ('admin','coordinador') or clase.instructor_id = persona.id or
      exists(select 1 from enrollments where class_id = clase.id and user_id = persona.id)
    ) and not exists(select 1 from "participantesReunion" participante
      where participante."reunionIdentificador" = reunion.identificador
      and participante."usuarioIdentificador" = persona.id and participante.estado = 'retirado')
    order by reunion."inicioProgramado" desc`, [usuario.id])).rows;
}
