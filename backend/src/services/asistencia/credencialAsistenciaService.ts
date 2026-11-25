import type { MiQr } from "../../entities/asistencia/asistenciaPuerta.js";
import type { credencialDe } from "../../repositories/asistencia/credencialAsistenciaRepository.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
import { emitirQrPersonal } from "../qr/qrPersonal.js";

export function crearCredencialAsistenciaService(obtenerCredencial: typeof credencialDe, secreto: string) {
  return async (usuarioId: number): Promise<MiQr> => {
    const credencial = await obtenerCredencial(usuarioId);
    if (!credencial) throw new ErrorAplicacion(403, "SIN_PERMISO", "La credencial requiere una cuenta de agremiado activa.");
    const { identificador, ...perfil } = credencial;
    return { ...perfil, token: emitirQrPersonal(identificador, secreto) };
  };
}
