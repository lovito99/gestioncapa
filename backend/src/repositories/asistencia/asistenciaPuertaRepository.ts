import type { AgremiadoPuerta, MarcaPuerta, OrigenPuerta, SesionPuerta } from "../../entities/asistencia/asistenciaPuerta.js";
import { pool, type Consultor } from "../../shared/database.js";
import { conClaseBloqueada } from "../clases/clasesRepository.js";
import { accesoInscrito, formatoIsoLima, insertarAsistencia } from "./asistenciaRepository.js";

const camposSesion = `c.id::text, c.nombre, to_char(c.fecha,'YYYY-MM-DD') as fecha,
  to_char(c.hora_inicio,'HH24:MI') as "horaInicio", c.lugar,
  case when k.id is not null then json_build_object('id',k.id::text,'titulo',k.titulo) end as curso`;

const participante = `json_build_object('id',u.id::text,'nombre',u.name,'dniParcial',
  case when u.dni is not null then '•••• ' || right(u.dni,4) end)`;
const elegible = `u.role='agremiado' and u.active and ${accesoInscrito}`;
const hora = `to_char(a.timestamp_lima,${formatoIsoLima}) as "horaRegistro"`;

type AccesoPuerta = SesionPuerta & {
  operador: boolean;
  instructorId: string;
  estado: "PROGRAMADA" | "CANCELADA";
  virtual: boolean;
  cursoCerrado: boolean;
};

async function accesoDePuerta(consultor: Consultor, claseId: number, usuarioId: number) {
  return (await consultor.query<AccesoPuerta>(
    `select ${camposSesion}, c.instructor_id::text as "instructorId", c.estado,
       c.modalidad='VIRTUAL' as virtual, coalesce(k.estado='CERRADO',false) as "cursoCerrado",
       exists(select 1 from users o where o.id=$2 and o.active and
         (o.role='admin' or (o.role='instructor' and
           o.id=coalesce(c."encargadoAsistenciaId",c.instructor_id)))) as operador
     from classes c left join cursos k on k.id=c.curso_id where c.id=$1`, [claseId, usuarioId]
  )).rows[0];
}

async function sesionesDelegadas(usuarioId: number) {
  return (await pool.query<SesionPuerta>(
    `select ${camposSesion}
     from classes c left join cursos k on k.id=c.curso_id
     where c."encargadoAsistenciaId"=$1 and c.instructor_id<>$1 and c.estado='PROGRAMADA'
       and c.modalidad in ('PRESENCIAL','AMBAS') and (k.id is null or k.estado<>'CERRADO')
     order by c.fecha,c.hora_inicio,c.id`, [usuarioId]
  )).rows;
}

async function conteosPuerta(consultor: Consultor, claseId: number) {
  return (await consultor.query<{ inscritos: number; presentes: number }>(
    `select count(*)::int as inscritos, count(a.id)::int as presentes
     from classes c join enrollments e on e.class_id=c.id join users u on u.id=e.user_id
     left join attendances a on a.class_id=c.id and a.user_id=u.id
     where c.id=$1 and ${elegible}`, [claseId]
  )).rows[0]!;
}

async function marcasRecientes(consultor: Consultor, claseId: number) {
  return (await consultor.query<MarcaPuerta>(
    `select a.id::text as "marcaId", ${participante} as participante, ${hora},
       case when a.origen='DNI' then 'DNI' else 'QR' end as metodo
     from attendances a join users u on u.id=a.user_id
     where a.class_id=$1 and a.origen in ('QR_PUERTA','DNI')
     order by a.timestamp_lima desc,a.id desc limit 4`, [claseId]
  )).rows;
}

async function buscarDniEnSesion(consultor: Consultor, claseId: number, dni: string) {
  return (await consultor.query<{ participante: AgremiadoPuerta; horaRegistro: string | null }>(
    `select ${participante} as participante, ${hora}
     from users u join enrollments e on e.user_id=u.id join classes c on c.id=e.class_id
     left join attendances a on a.class_id=c.id and a.user_id=u.id
     where c.id=$1 and u.dni=$2 and ${elegible}`, [claseId, dni]
  )).rows;
}

async function idDeCredencial(consultor: Consultor, identificador: string) {
  return (await consultor.query<{ id: string }>(
    `select u.id::text from "credencialesAsistencia" q join users u on u.id=q."usuarioId"
     where q.identificador=$1 and u.active and u.role='agremiado'`, [identificador]
  )).rows[0]?.id;
}

async function inscritoDePuerta(consultor: Consultor, claseId: number, participanteId: string) {
  return (await consultor.query<{ participante: AgremiadoPuerta }>(
    `select ${participante} as participante
     from users u join enrollments e on e.user_id=u.id join classes c on c.id=e.class_id
     where c.id=$1 and u.id=$2 and ${elegible} for key share of e`, [claseId, participanteId]
  )).rows[0]?.participante;
}

async function marcaAnterior(consultor: Consultor, claseId: number, participanteId: string) {
  return (await consultor.query<{ horaRegistro: string }>(
    `select ${hora} from attendances a where a.class_id=$1 and a.user_id=$2`, [claseId, participanteId]
  )).rows[0];
}

async function rectificarMarca(consultor: Consultor, claseId: number, marcaId: string, actorId: number, esAdmin: boolean) {
  const resultado = await consultor.query(
    `with eliminada as (
       delete from attendances where class_id=$1 and id=$2 and (created_by=$3 or $4::boolean)
         and origen in ('QR_PUERTA','DNI') returning id,class_id,user_id,origen,timestamp_lima
     )
     insert into "correccionesAsistenciaPuerta" ("marcaId","claseId","participanteId","actorId",origen,"registradaEnLima")
     select id,class_id,user_id,$3,origen,timestamp_lima from eliminada`, [claseId, marcaId, actorId, esAdmin]
  );
  return resultado.rowCount === 1;
}

function transaccionPuerta(cliente: Consultor, claseId: number) {
  return {
    acceso: (actorId: number) => accesoDePuerta(cliente, claseId, actorId),
    conteos: () => conteosPuerta(cliente, claseId),
    recientes: () => marcasRecientes(cliente, claseId),
    buscarDni: (dni: string) => buscarDniEnSesion(cliente, claseId, dni),
    idDeCredencial: (identificador: string) => idDeCredencial(cliente, identificador),
    inscrito: (participanteId: string) => inscritoDePuerta(cliente, claseId, participanteId),
    registrar: (participanteId: string, actorId: number, origen: OrigenPuerta) =>
      insertarAsistencia(cliente, claseId, participanteId, actorId, origen),
    marcaAnterior: (participanteId: string) => marcaAnterior(cliente, claseId, participanteId),
    rectificar: (marcaId: string, actorId: number, esAdmin: boolean) =>
      rectificarMarca(cliente, claseId, marcaId, actorId, esAdmin)
  };
}

export type AsistenciaPuertaTransaccion = ReturnType<typeof transaccionPuerta>;

export const asistenciaPuertaRepository = {
  sesionesDelegadas,
  enClaseBloqueada<T>(claseId: number, trabajo: (tx: AsistenciaPuertaTransaccion) => Promise<T>) {
    return conClaseBloqueada(claseId, (cliente) => trabajo(transaccionPuerta(cliente, claseId)));
  }
};

export type AsistenciaPuertaRepository = typeof asistenciaPuertaRepository;
