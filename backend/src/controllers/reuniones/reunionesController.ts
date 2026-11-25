import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { datosReunion, editarReunion, identificadorReunion, idParticipante, politicasReunion, solicitudCredencial } from "../../dto/reuniones/reunionDto.js";
import type { DestinoReunion, ReunionesService } from "../../services/reuniones/reunionesService.js";

type SolicitudReunion = FastifyRequest<{ Params: { identificador: string; usuarioIdentificador?: string } }>;
const rutaBase = "/api/reuniones";
const acciones: Record<string, DestinoReunion> = { iniciar: "iniciada", cancelar: "cancelada", finalizar: "finalizada" };
const reunionDe = (solicitud: SolicitudReunion) => identificadorReunion.parse(solicitud.params.identificador);

export function reunionesController(servicio: ReunionesService): FastifyPluginAsync {
  return async (app) => {
    app.get(rutaBase, (solicitud) => servicio.listar(solicitud.usuario!));

    app.post(rutaBase, async (solicitud, respuesta) => {
      const datos = datosReunion.parse(solicitud.body);
      return respuesta.code(201).send(await servicio.crear(datos, solicitud.usuario!));
    });

    app.get(`${rutaBase}/:identificador`, async (solicitud: SolicitudReunion) => servicio.obtener(reunionDe(solicitud), solicitud.usuario!));

    app.patch(`${rutaBase}/:identificador`, async (solicitud: SolicitudReunion) => {
      const datos = editarReunion.parse(solicitud.body);
      return servicio.editar(reunionDe(solicitud), datos, solicitud.usuario!);
    });

    for (const [accion, destino] of Object.entries(acciones)) {
      app.post(`${rutaBase}/:identificador/${accion}`, async (solicitud: SolicitudReunion) =>
        servicio.cambiarEstado(reunionDe(solicitud), destino, solicitud.usuario!));
    }

    app.patch(`${rutaBase}/:identificador/politicas`, async (solicitud: SolicitudReunion) => {
      const politicas = politicasReunion.parse(solicitud.body);
      return servicio.actualizarPoliticas(reunionDe(solicitud), politicas, solicitud.usuario!);
    });

    app.get(`${rutaBase}/:identificador/participantes`, async (solicitud: SolicitudReunion) =>
      servicio.participantes(reunionDe(solicitud), solicitud.usuario!));

    app.post(`${rutaBase}/:identificador/participantes/:usuarioIdentificador/retirar`, async (solicitud: SolicitudReunion) => {
      const usuarioIdentificador = idParticipante.parse(solicitud.params.usuarioIdentificador);
      return servicio.retirarParticipante(reunionDe(solicitud), usuarioIdentificador, solicitud.usuario!);
    });

    app.get(`${rutaBase}/:identificador/asistencia`, async (solicitud: SolicitudReunion) =>
      servicio.asistencia(reunionDe(solicitud), solicitud.usuario!));

    app.post(`${rutaBase}/:identificador/credencial`, async (solicitud: SolicitudReunion, respuesta) => {
      respuesta.header("Cache-Control", "no-store");
      const { aceptaGrabacion } = solicitudCredencial.parse(solicitud.body ?? {});
      return servicio.credencial(reunionDe(solicitud), aceptaGrabacion, solicitud.usuario!);
    });
  };
}
