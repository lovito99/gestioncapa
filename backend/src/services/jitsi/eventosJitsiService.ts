import { createHash, timingSafeEqual } from "node:crypto";
import type { EventoOcupanteDto } from "../../dto/jitsi/eventoOcupanteDto.js";
import type { ConexionesRepository } from "../../repositories/jitsi/conexionesRepository.js";

export type EventosJitsiServiceDeps = {
  repositorio: ConexionesRepository;
  /** Se lee en cada solicitud: la configuración puede cambiar sin reiniciar (pruebas). */
  configuracion: { jitsiEventosSecreto?: string | undefined };
};

export function crearEventosJitsiService({ repositorio, configuracion }: EventosJitsiServiceDeps) {
  return {
    configurado() {
      return Boolean(configuracion.jitsiEventosSecreto);
    },

    /** Compara resúmenes de igual longitud en tiempo constante: no revela cuántos caracteres coinciden. */
    autorizado(cabecera: string | undefined) {
      const resumen = (valor: string) => createHash("sha256").update(valor).digest();
      return timingSafeEqual(resumen(cabecera ?? ""), resumen(`Bearer ${configuracion.jitsiEventosSecreto}`));
    },

    async ocupanteEntro({ room_name: nombreSala, occupant: ocupante }: EventoOcupanteDto) {
      // Sin identificador es un invitado sin JWT: no cuenta para la asistencia.
      if (!ocupante.id) return;
      await repositorio.registrarEntrada(nombreSala, ocupante.id, ocupante.occupant_jid, ocupante.joined_at);
    },

    async ocupanteSalio({ room_name: nombreSala, occupant: ocupante }: EventoOcupanteDto) {
      if (!ocupante.id || !ocupante.left_at) return;
      await repositorio.registrarSalida(nombreSala, ocupante.id, ocupante.occupant_jid, ocupante.joined_at, ocupante.left_at);
    }
  };
}

export type EventosJitsiService = ReturnType<typeof crearEventosJitsiService>;
