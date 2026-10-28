import { randomBytes, randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { emitirCredencialJitsi } from "../jitsi/jitsi.servicio.js";
import { comprobarAcceso, conTransaccion, listarReuniones, obtenerReunion, type Reunion } from "./reuniones.repositorio.js";
import { datosReunion, editarReunion, identificadorReunion, politicasReunion } from "./reuniones.validacion.js";
import type { PoolClient } from "pg";

type SolicitudReunion = FastifyRequest<{ Params: { identificador: string; usuarioIdentificador?: string } }>;
const rutaBase = "/api/reuniones";

export async function registrarRutasReuniones(aplicacion: FastifyInstance) {
  async function conReunion(solicitud: SolicitudReunion, gestion: boolean,
    operacion: (cliente: PoolClient, reunion: Reunion) => Promise<unknown>) {
    const identificador = identificadorReunion.parse(solicitud.params.identificador);
    return conTransaccion(async cliente => {
      const reunion = await obtenerReunion(cliente, identificador);
      if (!reunion) throw aplicacion.httpErrors.notFound();
      const acceso = await comprobarAcceso(cliente, reunion, solicitud.usuario!);
      if (!acceso || acceso.retirado || !(acceso.gestion || acceso.instructor || acceso.inscrito)) throw aplicacion.httpErrors.forbidden();
      if (gestion && !(acceso.gestion || acceso.instructor)) throw aplicacion.httpErrors.forbidden();
      return operacion(cliente, reunion);
    });
  }

  aplicacion.get(rutaBase, solicitud => listarReuniones(solicitud.usuario!));
  aplicacion.post(rutaBase, async (solicitud, respuesta) => {
    const datos = datosReunion.parse(solicitud.body);
    const reunion = await conTransaccion(async cliente => {
      const clase = (await cliente.query(`select clase.id, clase.instructor_id from classes clase
        join users creador on creador.organization_id = clase.organization_id and creador.id = $2
        where clase.id = $1 and clase.estado = 'PROGRAMADA' and creador.active
        and creador.role in ('admin','coordinador') for update of clase`, [datos.claseIdentificador, solicitud.usuario!.id])).rows[0];
      if (!clase) throw aplicacion.httpErrors.forbidden();
      const identificador = randomUUID();
      const nombreSala = `reunion${randomBytes(24).toString("hex")}`;
      const resultado = await cliente.query<Reunion>(`insert into reuniones
        (identificador, "claseIdentificador", "nombreSala", titulo, "inicioProgramado", "finProgramado", "creadorIdentificador")
        values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [identificador, datos.claseIdentificador, nombreSala, datos.titulo, datos.inicioProgramado, datos.finProgramado, solicitud.usuario!.id]);
      await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol)
        values ($1,$2,'anfitrion')`, [identificador, clase.instructor_id]);
      await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol)
        select $1, user_id, 'participante' from enrollments where class_id = $2 on conflict do nothing`, [identificador, datos.claseIdentificador]);
      await cliente.query(`insert into "notificacionesReunion" ("reunionIdentificador", "usuarioIdentificador", tipo)
        select $1, "usuarioIdentificador", 'invitacion' from "participantesReunion" where "reunionIdentificador" = $1`, [identificador]);
      return resultado.rows[0];
    });
    return respuesta.code(201).send(reunion);
  });
  aplicacion.get(`${rutaBase}/:identificador`, async (solicitud: SolicitudReunion) => conReunion(solicitud, false, async (cliente, reunion) => reunion));
  aplicacion.patch(`${rutaBase}/:identificador`, async (solicitud: SolicitudReunion) => {
    const datos = editarReunion.parse(solicitud.body);
    return conReunion(solicitud, true, async (cliente, reunion) => {
      if (reunion.estado !== 'programada') throw aplicacion.httpErrors.conflict();
      return (await cliente.query(`update reuniones set titulo=$2, "inicioProgramado"=$3, "finProgramado"=$4
        where identificador=$1 returning *`, [reunion.identificador, datos.titulo, datos.inicioProgramado, datos.finProgramado])).rows[0];
    });
  });
  for (const [accion, destino] of Object.entries({ iniciar: "iniciada", cancelar: "cancelada", finalizar: "finalizada" })) {
    aplicacion.post(`${rutaBase}/:identificador/${accion}`, async (solicitud: SolicitudReunion) =>
      conReunion(solicitud, true, async (cliente, reunion) => {
        if (reunion.estado === destino) return reunion;
        if (reunion.estado === 'cancelada' || reunion.estado === 'finalizada' || (destino === 'finalizada' && reunion.estado !== 'iniciada')) {
          throw aplicacion.httpErrors.conflict();
        }
        return (await cliente.query('update reuniones set estado=$2 where identificador=$1 returning *', [reunion.identificador, destino])).rows[0];
      }));
  }
  aplicacion.patch(`${rutaBase}/:identificador/politicas`, async (solicitud: SolicitudReunion) => {
    const politicas = politicasReunion.parse(solicitud.body);
    // No prometemos restricciones audiovisuales que el servidor aún no aplica.
    if (!politicas.camaraPermitida || !politicas.microfonoPermitido || !politicas.pantallaPermitida || politicas.salaEsperaHabilitada) {
      throw aplicacion.httpErrors.unprocessableEntity("Estas restricciones requieren una integración de moderación verificada en Jitsi.");
    }
    return conReunion(solicitud, true, async (cliente, reunion) => (await cliente.query(`update reuniones set
      "camaraPermitida"=$2, "microfonoPermitido"=$3, "pantallaPermitida"=$4, "salaEsperaHabilitada"=$5 where identificador=$1 returning *`,
      [reunion.identificador, politicas.camaraPermitida, politicas.microfonoPermitido, politicas.pantallaPermitida, politicas.salaEsperaHabilitada])).rows[0]);
  });
  aplicacion.get(`${rutaBase}/:identificador/participantes`, async (solicitud: SolicitudReunion) => conReunion(solicitud, true, async (cliente, reunion) =>
    (await cliente.query(`select persona.id as identificador, persona.name as nombre, persona.email as correo,
      case when persona.id = clase.instructor_id then 'anfitrion' else 'participante' end as rol,
      coalesce(participante.estado, 'autorizado') as estado
      from classes clase join users persona on persona.organization_id = clase.organization_id and persona.active
      left join "participantesReunion" participante on participante."reunionIdentificador"=$1 and participante."usuarioIdentificador"=persona.id
      where clase.id=$2 and (persona.id=clase.instructor_id or exists(select 1 from enrollments where class_id=clase.id and user_id=persona.id))`,
      [reunion.identificador, reunion.claseIdentificador])).rows));
  aplicacion.post(`${rutaBase}/:identificador/participantes/:usuarioIdentificador/retirar`, async (solicitud: SolicitudReunion) => {
    const usuarioIdentificador = z.coerce.number().int().positive().safe().parse(solicitud.params.usuarioIdentificador);
    return conReunion(solicitud, true, async (cliente, reunion) => {
      // Revoca futuras credenciales. La desconexión audiovisual requiere el moderador Jitsi.
      const participante = (await cliente.query(`select persona.id from users persona join classes clase
        on clase.organization_id=persona.organization_id where clase.id=$1 and persona.id=$2
        and persona.id <> clase.instructor_id and exists(select 1 from enrollments where class_id=clase.id and user_id=persona.id)`,
        [reunion.claseIdentificador, usuarioIdentificador])).rows[0];
      if (!participante) throw aplicacion.httpErrors.notFound();
      await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol, estado)
        values ($1,$2,'participante','retirado') on conflict ("reunionIdentificador", "usuarioIdentificador") do update set estado='retirado'`,
        [reunion.identificador, usuarioIdentificador]);
      return { accesoRevocado: true, desconexionAudiovisual: false };
    });
  });
  aplicacion.post(`${rutaBase}/:identificador/credencial`, async (solicitud: SolicitudReunion, respuesta) => {
    respuesta.header("Cache-Control", "no-store");
    return conReunion(solicitud, false, async (cliente, reunion) => {
      const acceso = await comprobarAcceso(cliente, reunion, solicitud.usuario!);
      if (!acceso?.activa || reunion.estado !== 'iniciada' || Date.now() > new Date(reunion.finProgramado).getTime()) {
        throw aplicacion.httpErrors.conflict();
      }
      if (!env.jitsiHabilitado) throw aplicacion.httpErrors.serviceUnavailable();
      const usuario = solicitud.usuario!;
      const token = await emitirCredencialJitsi({ jitsiDominio: env.jitsiDominio!, jitsiAplicacion: env.jitsiAplicacion!, jitsiSecreto: env.jitsiSecreto! },
        { identificador: String(usuario.id), nombre: usuario.name, correo: usuario.email, moderador: !!(acceso.gestion || acceso.instructor) }, reunion.nombreSala);
      return { token, dominio: env.jitsiDominio, direccionServidor: env.jitsiDireccion ?? `https://${env.jitsiDominio}`, nombreSala: reunion.nombreSala, nombre: usuario.name, duracionSegundos: 300 };
    });
  });
}
