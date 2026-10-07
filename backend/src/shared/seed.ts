import type { Pool } from "pg";
import { env } from "../config/env.js";
import { sembrarUsuarios } from "../modules/auth/auth.service.js";
import type { EnvSeed } from "../modules/auth/usuarios-seed.js";
import { pool } from "./database.js";

const MARIA = "maria.quispe@demo.pe";
const LUZ = "luz.apaza@demo.pe";
const CARLOS = "carlos.mendoza@organizacion.pe";
const LUCIA = "lucia.paredes@organizacion.pe";

const clasesDemo = [
  { nombre: "Demo · Seguridad y salud en el trabajo", instructor: CARLOS, dias: -1,
    inicio: "10:00", fin: "11:00", lugar: "Auditorio principal, piso 2", cancelada: false,
    inscritos: [MARIA, LUZ], presentes: [MARIA] },
  { nombre: "Demo · Atención al cliente", instructor: LUCIA, dias: 1,
    inicio: "15:00", fin: "16:30", lugar: "Sala de capacitación B", cancelada: false,
    inscritos: [MARIA, LUZ], presentes: [] },
  { nombre: "Demo · Primeros auxilios básicos", instructor: CARLOS, dias: 2,
    inicio: "09:00", fin: "10:00", lugar: "Laboratorio 3", cancelada: false,
    inscritos: [MARIA, LUZ], presentes: [] },
  { nombre: "Demo · Liderazgo de equipos", instructor: LUCIA, dias: 3,
    inicio: "16:00", fin: "17:00", lugar: "Sala de capacitación A", cancelada: true,
    inscritos: [LUZ], presentes: [] },
  { nombre: "Demo · Manejo de extintores", instructor: CARLOS, dias: 4,
    inicio: "15:00", fin: "16:30", lugar: "Patio central", cancelada: false,
    inscritos: [MARIA, LUZ], presentes: [] }
];

/** Semilla completa en una transacción; repetirla conserva los datos existentes. */
export async function sembrarDatos(conexion: Pool = pool, configuracion: EnvSeed = env) {
  const cliente = await conexion.connect();
  const resumen = { clases: 0, inscripciones: 0, asistencias: 0 };

  try {
    await cliente.query("begin");
    // Serializa ejecuciones del seed para no duplicar clases sin añadir columnas al esquema.
    await cliente.query("select pg_advisory_xact_lock(7122026)");
    const usuarios = await sembrarUsuarios(cliente, configuracion);

    if (configuracion.NODE_ENV !== "production") {
      const resultado = await cliente.query<{ id: string; email: string; role: string }>(
        "select id, email, role from users where email = any($1) and active and organization_id = 1 for update",
        [[CARLOS, LUCIA, MARIA, LUZ]]
      );
      const cuentas = new Map(resultado.rows.map((usuario) => [usuario.email, usuario]));
      const usuarioId = (email: string, rol: string) => {
        const usuario = cuentas.get(email);
        if (!usuario || usuario.role !== rol) {
          throw new Error(`El seed necesita la cuenta demo activa ${email} con rol ${rol} en la organización 1.`);
        }
        return usuario.id;
      };

      for (const datos of clasesDemo) {
        const instructorId = usuarioId(datos.instructor, "instructor");
        const existente = await cliente.query<{ id: string }>(
          "select id from classes where nombre = $1 and instructor_id = $2 and organization_id = 1 order by id limit 1 for update",
          [datos.nombre, instructorId]
        );
        let claseId = existente.rows[0]?.id;

        if (!claseId) {
          // Respeta los horarios de clases que ya se hayan creado manualmente.
          const conflicto = await cliente.query(
            `select 1 from classes where instructor_id = $1 and estado = 'PROGRAMADA'
             and fecha = (now() at time zone 'America/Lima')::date + $2::int
             and hora_inicio < $4::time and $3::time < hora_fin`,
            [instructorId, datos.dias, datos.inicio, datos.fin]
          );
          if (!datos.cancelada && conflicto.rowCount) {
            throw new Error(`No se puede sembrar «${datos.nombre}»: el instructor ya tiene una clase en ese horario.`);
          }
          const nueva = await cliente.query<{ id: string }>(
            `insert into classes (nombre, instructor_id, fecha, hora_inicio, hora_fin, lugar, estado)
             values ($1, $2, (now() at time zone 'America/Lima')::date + $3::int, $4, $5, $6, $7)
             returning id`,
            [datos.nombre, instructorId, datos.dias, datos.inicio, datos.fin, datos.lugar,
              datos.cancelada ? "CANCELADA" : "PROGRAMADA"]
          );
          claseId = nueva.rows[0]!.id;
        }
        resumen.clases++;

        for (const email of datos.inscritos) {
          const participanteId = usuarioId(email, "participante");
          await cliente.query(
            `insert into enrollments (class_id, user_id) values ($1, $2)
             on conflict (class_id, user_id) do nothing`,
            [claseId, participanteId]
          );
          resumen.inscripciones++;

          if (datos.presentes.includes(email)) {
            await cliente.query(
              `insert into attendances (class_id, user_id, timestamp_lima, created_by)
               select id, $2, fecha + hora_inicio + interval '2 minutes', $2 from classes
               where id = $1 and estado = 'PROGRAMADA'
                 and fecha < (now() at time zone 'America/Lima')::date
               on conflict (class_id, user_id) do nothing`,
              [claseId, participanteId]
            );
          }
        }
      }
      const asistencias = await cliente.query<{ total: number }>(
        `select count(*)::int as total from attendances a join classes c on c.id = a.class_id
         where c.nombre = any($1) and c.organization_id = 1`,
        [clasesDemo.map((clase) => clase.nombre)]
      );
      resumen.asistencias = asistencias.rows[0]!.total;
    }

    await cliente.query("commit");
    return { usuarios, ...resumen };
  } catch (error) {
    await cliente.query("rollback");
    throw error;
  } finally {
    cliente.release();
  }
}
