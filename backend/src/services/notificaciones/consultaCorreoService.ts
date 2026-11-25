import type { ConsultaCorreoDto } from "../../dto/notificaciones/correoDto.js";
import type { ConsultaCorreoRepository } from "../../repositories/notificaciones/consultaCorreoRepository.js";

const paginaMaxima = 1000;

export function crearConsultaCorreoService(deps: { repositorio: ConsultaCorreoRepository; configuracion: { correoHabilitado: boolean } }) {
  return {
    async listar({ tipo, estado, pagina, limite }: ConsultaCorreoDto) {
      // Se pide una fila de más para saber si existe una página siguiente.
      const [avisos, resumen] = await Promise.all([
        deps.repositorio.listar({ tipo, estado, limite: limite + 1, desplazamiento: (pagina - 1) * limite }),
        deps.repositorio.resumen()
      ]);
      return { items: avisos.slice(0, limite), pagina, haySiguiente: avisos.length > limite && pagina < paginaMaxima,
        habilitado: deps.configuracion.correoHabilitado, resumen };
    }
  };
}

export type ConsultaCorreoService = ReturnType<typeof crearConsultaCorreoService>;
