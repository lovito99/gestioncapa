import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";

// Identidades reservadas para estas tres reuniones demo: repetir el seed no las duplica.
const reunionesPrueba = [
  { identificador: "79d4a3c1-7d3a-4a3c-8b92-a9c0134ac001", clase: "Demo · Atención al cliente", titulo: "Demo · Reunión de atención al cliente" },
  { identificador: "79d4a3c1-7d3a-4a3c-8b92-a9c0134ac002", clase: "Demo · Primeros auxilios básicos", titulo: "Demo · Reunión de primeros auxilios" },
  { identificador: "79d4a3c1-7d3a-4a3c-8b92-a9c0134ac003", clase: "Demo · Manejo de extintores", titulo: "Demo · Reunión de manejo de extintores" }
];

/** Se ejecuta dentro de la transacción y del bloqueo del seed general. */
export async function sembrarReuniones(cliente: PoolClient) {
  let reuniones = 0;
  for (const datos of reunionesPrueba) {
    const existente = await cliente.query("select 1 from reuniones where identificador = $1", [datos.identificador]);
    if (existente.rowCount) { reuniones++; continue; }

    const clase = (await cliente.query<{ id: string; instructor: string; inicio: Date; fin: Date }>(`
      select id, instructor_id as instructor,
        (fecha + hora_inicio) at time zone 'America/Lima' as inicio,
        (fecha + hora_fin) at time zone 'America/Lima' as fin
      from classes where nombre = $1 and organization_id = 1 and estado = 'PROGRAMADA'
      order by id limit 1 for update`, [datos.clase])).rows[0];
    if (!clase) continue;

    await cliente.query(`insert into reuniones
      (identificador, "claseIdentificador", "nombreSala", titulo, "inicioProgramado", "finProgramado", "creadorIdentificador")
      values ($1,$2,$3,$4,$5,$6,$7)`, [datos.identificador, clase.id,
      `reunion${randomBytes(24).toString("hex")}`, datos.titulo, clase.inicio, clase.fin, clase.instructor]);
    await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol)
      values ($1,$2,'anfitrion')`, [datos.identificador, clase.instructor]);
    await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol)
      select $1, user_id, 'participante' from enrollments where class_id = $2
      on conflict do nothing`, [datos.identificador, clase.id]);
    await cliente.query(`insert into "notificacionesReunion" ("reunionIdentificador", "usuarioIdentificador", tipo)
      select $1, "usuarioIdentificador", 'invitacion' from "participantesReunion" where "reunionIdentificador" = $1`, [datos.identificador]);
    reuniones++;
  }
  return reuniones;
}
