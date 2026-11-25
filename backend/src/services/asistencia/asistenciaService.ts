import type { UsuarioAutenticado } from "../../plugins/autorizacion.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
import type { ResultadoQr } from "../qr/qrToken.js";
import type { MarcarAsistenciaDto } from "../../dto/asistencia/asistenciaDto.js";
import type { AsistenciaMarcada, ClaseDeParticipante, ResumenAsistencia } from "../../entities/asistencia/asistencia.js";
import type { AsistenciaRepository } from "../../repositories/asistencia/asistenciaRepository.js";

export type AsistenciaServiceDeps = {
  repositorio: AsistenciaRepository;
  /** Verifica el token con la hora actual en cada llamada: el QR puede vencer durante la operación. */
  verificarQr: (token: string) => ResultadoQr;
};

export const errorQrInvalido = () =>
  new ErrorAplicacion(422, "QR_INVALIDO", "Este código QR no es válido. Escanea el código que muestra tu instructor en la sala.");

const errorQr = ({ motivo }: Extract<ResultadoQr, { ok: false }>) => motivo === "EXPIRADO"
  ? new ErrorAplicacion(410, "QR_EXPIRADO", "El código QR expiró. Escanea el código nuevo que aparece en la pantalla del instructor.")
  : errorQrInvalido();

const claseNoExiste = () => new ErrorAplicacion(404, "CLASE_NO_EXISTE", "La clase no existe.");

export function crearAsistenciaService({ repositorio, verificarQr }: AsistenciaServiceDeps) {
  function claseDelToken(token: string) {
    const resultado = verificarQr(token);
    if (!resultado.ok) throw errorQr(resultado);
    return resultado.claseId;
  }

  return {
    /** HU-08: las validaciones siguen el orden del contrato (docs/esp/asistencia.md). */
    async marcar(entrada: MarcarAsistenciaDto, usuarioId: number): Promise<AsistenciaMarcada> {
      const claseDelQr = claseDelToken(entrada.token);
      if (entrada.claseId && entrada.claseId !== claseDelQr) {
        throw new ErrorAplicacion(409, "QR_OTRA_CLASE", "Este código QR es de otra clase. Verifica que estés escaneando el código de tu clase.");
      }

      const claseId = Number(claseDelQr);
      return repositorio.enClaseBloqueada(claseId, async (tx) => {
        // El QR pudo vencer mientras la transacción esperaba a otra operación.
        claseDelToken(entrada.token);

        const clase = await tx.obtenerClase(claseId);
        if (!clase) throw claseNoExiste();
        if (clase.estado === "CANCELADA") throw new ErrorAplicacion(409, "CLASE_CANCELADA", "La clase está cancelada.");
        // HU-36: en una sesión solo virtual la asistencia se toma en la sala, no con QR.
        if (clase.modalidad === "VIRTUAL") {
          throw new ErrorAplicacion(409, "SESION_VIRTUAL", "Esta sesión es solo virtual: tu asistencia se registra al conectarte a la sala.");
        }
        if (await tx.cursoCerrado(claseId)) throw new ErrorAplicacion(409, "CURSO_CERRADO", "El curso ya está cerrado y no admite nuevas asistencias.");
        if (!(await tx.estaInscrito(claseId, usuarioId))) {
          throw new ErrorAplicacion(403, "NO_INSCRITO", "No estás inscrito(a) en esta clase. Pide al administrador que te inscriba.");
        }

        claseDelToken(entrada.token);
        const hora = await tx.registrar(claseId, usuarioId, usuarioId);
        if (!hora) {
          const anterior = await tx.horaDeAsistencia(claseId, usuarioId);
          throw new ErrorAplicacion(409, "ASISTENCIA_YA_REGISTRADA",
            `Tu asistencia ya estaba registrada${anterior ? ` a las ${anterior.slice(11, 16)}` : ""}. No necesitas volver a escanear.`);
        }
        return { clase: { id: clase.id, nombre: clase.nombre }, horaRegistro: hora };
      });
    },

    /** HU-09: lista de asistencia del administrador o del instructor asignado. */
    async listaDeClase(claseId: number | null, usuario: Pick<UsuarioAutenticado, "id" | "role">): Promise<ResumenAsistencia> {
      if (!claseId) throw claseNoExiste();
      const clase = await repositorio.obtenerClase(claseId);
      if (!clase) throw claseNoExiste();
      if (usuario.role === "instructor" && clase.instructor.id !== String(usuario.id)) {
        throw new ErrorAplicacion(403, "SIN_PERMISO", "Esta sesión no está asignada a ti.");
      }

      const registros = (await repositorio.inscritosConAsistencia(claseId)).map(({ hora, ...participante }) => ({
        participante,
        estado: hora ? ("PRESENTE" as const) : ("AUSENTE" as const),
        horaRegistro: hora
      }));
      const presentes = registros.filter((registro) => registro.estado === "PRESENTE").length;
      return { inscritos: registros.length, presentes, ausentes: registros.length - presentes, registros };
    },

    clasesDeParticipante(usuarioId: number): Promise<ClaseDeParticipante[]> {
      return repositorio.clasesDeParticipante(usuarioId);
    }
  };
}

export type AsistenciaService = ReturnType<typeof crearAsistenciaService>;
