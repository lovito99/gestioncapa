import type { Consultor } from "../../shared/database.js";
import type { Clase } from "../../entities/clases/clase.js";
import { conClaseBloqueada, obtenerClase } from "../clases/clasesRepository.js";
import type { ClaseDeParticipante, InscritoConAsistencia } from "../../entities/asistencia/asistencia.js";

import type { OrigenPuerta } from "../../entities/asistencia/asistenciaPuerta.js";

// timestamp_lima es hora local de Lima sin zona; Perú no tiene horario de verano.
export const formatoIsoLima = `'YYYY-MM-DD"T"HH24:MI:SS"-05:00"'`;

/** Política compartida de matrícula en sesión con acceso vigente al curso. */
export const accesoInscrito = `(c.curso_id is null or "tieneAccesoCurso"(c.curso_id,e.user_id))`;

export async function insertarAsistencia(consultor: Consultor, claseId: number, usuarioId: string | number,
  registradoPor: number, origen: OrigenPuerta | "QR") {
  const resultado = await consultor.query<{ marcaId: string; horaRegistro: string }>(
    `insert into attendances (class_id, user_id, created_by, origen)
     values ($1, $2, $3, $4) on conflict (class_id, user_id) do nothing
     returning id::text as "marcaId", to_char(timestamp_lima, ${formatoIsoLima}) as "horaRegistro"`,
    [claseId, usuarioId, registradoPor, origen]
  );
  return resultado.rows[0] ?? null;
}

/** Operaciones disponibles mientras la clase está bloqueada para registrar asistencia. */
export type AsistenciaTransaccion = {
  obtenerClase(claseId: number): Promise<Clase | null>;
  cursoCerrado(claseId: number): Promise<boolean>;
  estaInscrito(claseId: number, usuarioId: number): Promise<boolean>;
  /**
   * Inserta de forma atómica: la restricción UNIQUE (class_id, user_id) decide entre
   * escaneos simultáneos. Devuelve la hora registrada, o null si ya existía.
   */
  registrar(claseId: number, usuarioId: number, registradoPor: number): Promise<string | null>;
  horaDeAsistencia(claseId: number, usuarioId: number): Promise<string | null>;
};

export type AsistenciaRepository = {
  /** La clase permanece estable hasta confirmar la asistencia; un error revierte la transacción. */
  enClaseBloqueada<T>(claseId: number, trabajo: (tx: AsistenciaTransaccion) => Promise<T>): Promise<T>;
  obtenerClase(claseId: number): Promise<Clase | null>;
  /** Todos los inscritos de la clase, presentes o ausentes, ordenados por nombre. */
  inscritosConAsistencia(claseId: number): Promise<InscritoConAsistencia[]>;
  clasesDeParticipante(usuarioId: number): Promise<ClaseDeParticipante[]>;
};

function transaccion(consultor: Consultor): AsistenciaTransaccion {
  return {
    obtenerClase: (claseId) => obtenerClase(claseId, consultor),
    async cursoCerrado(claseId) {
      const resultado = await consultor.query(`select 1 from classes s join cursos c on c.id=s.curso_id where s.id=$1 and c.estado='CERRADO'`, [claseId]);
      return Boolean(resultado.rowCount);
    },
    async estaInscrito(claseId, usuarioId) {
      const resultado = await consultor.query(
        `select 1 from enrollments e join classes c on c.id=e.class_id where e.class_id=$1 and e.user_id=$2
          and ${accesoInscrito} for key share of e`,
        [claseId, usuarioId]
      );
      return resultado.rowCount === 1;
    },
    async registrar(claseId, usuarioId, registradoPor) {
      return (await insertarAsistencia(consultor, claseId, usuarioId, registradoPor, "QR"))?.horaRegistro ?? null;
    },
    async horaDeAsistencia(claseId, usuarioId) {
      const resultado = await consultor.query<{ hora: string }>(
        `select to_char(timestamp_lima, ${formatoIsoLima}) as hora from attendances where class_id = $1 and user_id = $2`,
        [claseId, usuarioId]
      );
      return resultado.rows[0]?.hora ?? null;
    }
  };
}

export function crearAsistenciaRepository(pool: Consultor): AsistenciaRepository {
  return {
    enClaseBloqueada: (claseId, trabajo) => conClaseBloqueada(claseId, (cliente) => trabajo(transaccion(cliente))),
    obtenerClase: (claseId) => obtenerClase(claseId, pool),
    async inscritosConAsistencia(claseId) {
      const resultado = await pool.query<InscritoConAsistencia>(
        `select u.id::text as id, u.name as nombre, u.email, to_char(a.timestamp_lima, ${formatoIsoLima}) as hora
         from enrollments e
         join users u on u.id = e.user_id
         left join attendances a on a.class_id = e.class_id and a.user_id = e.user_id
         where e.class_id = $1
         order by u.name, u.id`,
        [claseId]
      );
      return resultado.rows;
    },
    async clasesDeParticipante(usuarioId) {
      const resultado = await pool.query<ClaseDeParticipante>(
        `select c.id::text as id, c.nombre,
                json_build_object('id', i.id::text, 'nombre', i.name) as instructor,
                to_char(c.fecha, 'YYYY-MM-DD') as fecha,
                to_char(c.hora_inicio, 'HH24:MI') as "horaInicio",
                to_char(c.hora_fin, 'HH24:MI') as "horaFin",
                c.lugar, c.estado, c.modalidad, (c.modalidad <> 'VIRTUAL' and c."qrRotatorio") as "qrRotatorio",
                to_char(a.timestamp_lima, ${formatoIsoLima}) as "miAsistencia"
         from enrollments e
         join classes c on c.id = e.class_id
         join users i on i.id = c.instructor_id
         left join attendances a on a.class_id = e.class_id and a.user_id = e.user_id
         where e.user_id = $1 and (c.curso_id is null or "tieneAccesoCurso"(c.curso_id,$1))
         order by c.fecha, c.hora_inicio, c.id`,
        [usuarioId]
      );
      return resultado.rows.map(({ modalidad, qrRotatorio, ...clase }) => ({
        ...clase,
        ...(modalidad !== undefined && modalidad !== "PRESENCIAL" ? { modalidad } : {}),
        ...(qrRotatorio === false ? { qrRotatorio } : {})
      }));
    }
  };
}
