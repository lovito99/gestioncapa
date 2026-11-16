import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { emitirCredencialJitsi } from "../jitsi/jitsi.servicio.js";
import { comprobarAcceso, consultarAsistenciaVirtual, conTransaccion, crearReunionDeClase, listarReuniones, obtenerReunion, registrarAsistenciaVirtual, type Reunion } from "./reuniones.repositorio.js";
import { datosReunion, editarReunion, identificadorReunion, politicasReunion, solicitudCredencial } from "./reuniones.validacion.js";
import type { PoolClient } from "pg";

type SolicitudReunion = FastifyRequest<{ Params: { identificador: string; usuarioIdentificador?: string } }>;
type Acceso = NonNullable<Awaited<ReturnType<typeof comprobarAcceso>>>;
const rutaBase = "/api/reuniones";
const avisoPendiente = Symbol("avisoGrabacionPendiente");
const sesionPresencial = Symbol("sesionPresencial");

export async function registrarRutasReuniones(aplicacion: FastifyInstance) {
  async function conReunion<T>(solicitud: SolicitudReunion, gestion: boolean,
    operacion: (cliente: PoolClient, reunion: Reunion, acceso: Acceso) => Promise<T>) {
    const identificador = identificadorReunion.parse(solicitud.params.identificador);
    return conTransaccion(async cliente => {
      const reunion = await obtenerReunion(cliente, identificador);
      if (!reunion) throw aplicacion.httpErrors.notFound();
      const acceso = await comprobarAcceso(cliente, reunion, solicitud.usuario!);
      if (!acceso || acceso.retirado || !(acceso.gestion || acceso.instructor || acceso.inscrito)) throw aplicacion.httpErrors.forbidden();
      if (gestion && !(acceso.gestion || acceso.instructor)) throw aplicacion.httpErrors.forbidden();
      return operacion(cliente, reunion, acceso);
    });
  }

  aplicacion.get(rutaBase, solicitud => listarReuniones(solicitud.usuario!));
  aplicacion.post(rutaBase, async (solicitud, respuesta) => {
    const datos = datosReunion.parse(solicitud.body);
    const reunion = await conTransaccion(async cliente => {
      // El administrador crea para cualquier sesión; el instructor, solo para las que dicta.
      const clase = (await cliente.query(`select clase.id, clase.instructor_id, clase.modalidad from classes clase
        join users creador on creador.id = $2
        where clase.id = $1 and clase.estado = 'PROGRAMADA' and creador.active
        and (creador.role = 'admin' or (creador.role = 'instructor' and clase.instructor_id = creador.id)) for update of clase`, [datos.claseIdentificador, solicitud.usuario!.id])).rows[0];
      if (!clase) throw aplicacion.httpErrors.forbidden();
      // HU-36: la sala virtual corresponde a sesiones virtuales o «ambas».
      if (clase.modalidad === 'PRESENCIAL') return sesionPresencial;
      return crearReunionDeClase(cliente, { claseIdentificador: String(datos.claseIdentificador), titulo: datos.titulo,
        inicioProgramado: datos.inicioProgramado, finProgramado: datos.finProgramado, creadorIdentificador: solicitud.usuario!.id });
    });
    if (reunion === sesionPresencial) {
      return respuesta.code(409).send({ code: "SESION_PRESENCIAL", message: "La sesión es presencial. Cámbiala a virtual o «ambas» para abrir su sala." });
    }
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
        // iniciadaEn y finalizadaEn delimitan la duración de referencia de la asistencia virtual.
        const actualizada = (await cliente.query<Reunion>(`update reuniones set estado=$2,
          "iniciadaEn" = case when $2 = 'iniciada' then coalesce("iniciadaEn", now()) else "iniciadaEn" end,
          "finalizadaEn" = case when $2 = 'finalizada' then now() else "finalizadaEn" end
          where identificador=$1 returning *`, [reunion.identificador, destino])).rows[0]!;
        if (destino === 'finalizada') await registrarAsistenciaVirtual(cliente, actualizada, solicitud.usuario!.id);
        return actualizada;
      }));
  }
  aplicacion.patch(`${rutaBase}/:identificador/politicas`, async (solicitud: SolicitudReunion) => {
    const politicas = politicasReunion.parse(solicitud.body);
    return conReunion(solicitud, true, async (cliente, reunion) => {
      if (reunion.estado === 'cancelada' || reunion.estado === 'finalizada') throw aplicacion.httpErrors.conflict();
      // Quien ya entró no vio un aviso de grabación: solo se decide antes de iniciar.
      if (politicas.grabacionPrevista !== reunion.grabacionPrevista && reunion.estado !== 'programada') throw aplicacion.httpErrors.conflict();
      return (await cliente.query(`update reuniones set "camaraPermitida"=$2, "microfonoPermitido"=$3, "pantallaPermitida"=$4,
        "manoPermitida"=$5, "porcentajeMinimo"=$6, "grabacionPrevista"=$7 where identificador=$1 returning *`,
      [reunion.identificador, politicas.camaraPermitida, politicas.microfonoPermitido, politicas.pantallaPermitida,
        politicas.manoPermitida, politicas.porcentajeMinimo, politicas.grabacionPrevista])).rows[0];
    });
  });
  aplicacion.get(`${rutaBase}/:identificador/participantes`, async (solicitud: SolicitudReunion) => conReunion(solicitud, true, async (cliente, reunion) =>
    (await cliente.query(`select persona.id as identificador, persona.name as nombre, persona.email as correo,
      case when persona.id = clase.instructor_id then 'anfitrion' else 'participante' end as rol,
      coalesce(participante.estado, 'autorizado') as estado
      from classes clase join users persona on persona.active
      left join "participantesReunion" participante on participante."reunionIdentificador"=$1 and participante."usuarioIdentificador"=persona.id
      where clase.id=$2 and (persona.id=clase.instructor_id or exists(select 1 from enrollments where class_id=clase.id and user_id=persona.id))`,
      [reunion.identificador, reunion.claseIdentificador])).rows));
  aplicacion.post(`${rutaBase}/:identificador/participantes/:usuarioIdentificador/retirar`, async (solicitud: SolicitudReunion) => {
    const usuarioIdentificador = z.coerce.number().int().positive().safe().parse(solicitud.params.usuarioIdentificador);
    return conReunion(solicitud, true, async (cliente, reunion) => {
      // Revoca credenciales futuras. El moderador expulsa las conexiones activas desde la sala.
      const participante = (await cliente.query(`select persona.id from users persona join classes clase
        on true where clase.id=$1 and persona.id=$2
        and persona.id <> clase.instructor_id and exists(select 1 from enrollments where class_id=clase.id and user_id=persona.id)`,
        [reunion.claseIdentificador, usuarioIdentificador])).rows[0];
      if (!participante) throw aplicacion.httpErrors.notFound();
      await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol, estado, "retiradoEn")
        values ($1,$2,'participante','retirado',now()) on conflict ("reunionIdentificador", "usuarioIdentificador")
        do update set estado='retirado', "retiradoEn"=coalesce("participantesReunion"."retiradoEn", now())`,
        [reunion.identificador, usuarioIdentificador]);
      return { accesoRevocado: true };
    });
  });
  aplicacion.get(`${rutaBase}/:identificador/asistencia`, async (solicitud: SolicitudReunion) => conReunion(solicitud, true, async (cliente, reunion) => {
    if (reunion.estado !== 'finalizada') throw aplicacion.httpErrors.conflict();
    return { reunionIdentificador: reunion.identificador, porcentajeMinimo: reunion.porcentajeMinimo,
      iniciadaEn: reunion.iniciadaEn, finalizadaEn: reunion.finalizadaEn, resultados: await consultarAsistenciaVirtual(cliente, reunion.identificador) };
  }));
  aplicacion.post(`${rutaBase}/:identificador/credencial`, async (solicitud: SolicitudReunion, respuesta) => {
    respuesta.header("Cache-Control", "no-store");
    const { aceptaGrabacion } = solicitudCredencial.parse(solicitud.body ?? {});
    const resultado = await conReunion(solicitud, false, async (cliente, reunion, acceso) => {
      // El anfitrión cierra el acceso al finalizar; el horario previsto puede superarse.
      if (!acceso.activa || reunion.estado !== 'iniciada') {
        throw aplicacion.httpErrors.conflict();
      }
      if (!env.jitsiHabilitado) throw aplicacion.httpErrors.serviceUnavailable();
      const usuario = solicitud.usuario!;
      const moderador = acceso.gestion || acceso.instructor;
      if (reunion.grabacionPrevista && !moderador) {
        // Ley 29733: el aviso se acepta antes de entrar y queda registrado con fecha.
        const aceptado = (await cliente.query(`select "avisoGrabacionAceptadoEn" from "participantesReunion"
          where "reunionIdentificador"=$1 and "usuarioIdentificador"=$2`, [reunion.identificador, usuario.id])).rows[0]?.avisoGrabacionAceptadoEn;
        if (!aceptado && aceptaGrabacion !== true) return avisoPendiente;
        if (!aceptado) await cliente.query(`insert into "participantesReunion" ("reunionIdentificador", "usuarioIdentificador", rol, "avisoGrabacionAceptadoEn")
          values ($1,$2,'participante',now()) on conflict ("reunionIdentificador", "usuarioIdentificador")
          do update set "avisoGrabacionAceptadoEn"=coalesce("participantesReunion"."avisoGrabacionAceptadoEn", now())`, [reunion.identificador, usuario.id]);
      }
      const token = await emitirCredencialJitsi({ jitsiDominio: env.jitsiDominio!, jitsiAplicacion: env.jitsiAplicacion!, jitsiSecreto: env.jitsiSecreto! },
        { identificador: String(usuario.id), nombre: usuario.name, correo: usuario.email, moderador }, reunion.nombreSala);
      return { token, dominio: env.jitsiDominio, direccionServidor: env.jitsiDireccion ?? `https://${env.jitsiDominio}`, nombreSala: reunion.nombreSala, nombre: usuario.name, duracionSegundos: 300 };
    });
    if (resultado === avisoPendiente) {
      return respuesta.code(422).send({ code: "AVISO_GRABACION_PENDIENTE", message: "Esta sesión se grabará. Acepta el aviso para entrar." });
    }
    return resultado;
  });
}
