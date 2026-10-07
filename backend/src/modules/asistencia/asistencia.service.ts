import { env } from "../../config/env.js";
import { conClaseBloqueada, obtenerClase } from "../clases/clases.repositorio.js";
import { reloj, verificarTokenQr, type ResultadoQr } from "../qr/qr.token.js";
import { estaInscrito, horaDeAsistencia, registrarAsistencia } from "./asistencia.repositorio.js";

export type EntradaAsistencia = { token: string; claseId?: string | undefined };

type ResultadoMarcado = {
  status: number;
  cuerpo: { code: string; message: string } | {
    clase: { id: string; nombre: string };
    horaRegistro: string;
  };
};

function rechazar(status: number, code: string, message: string): ResultadoMarcado {
  return { status, cuerpo: { code, message } };
}

function rechazarQr(resultado: Extract<ResultadoQr, { ok: false }>) {
  return resultado.motivo === "EXPIRADO"
    ? rechazar(410, "QR_EXPIRADO", "El código QR expiró. Escanea el código nuevo que aparece en la pantalla del instructor.")
    : rechazar(422, "QR_INVALIDO", "Este código QR no es válido. Escanea el código que muestra tu instructor en la sala.");
}

/** Verifica el QR y confirma actor, inscripción y hora en la misma transacción. */
export async function marcarAsistencia(entrada: EntradaAsistencia, usuarioId: number): Promise<ResultadoMarcado> {
  const resultado = verificarTokenQr(entrada.token, reloj.ahora(), env.QR_SECRET);
  if (!resultado.ok) return rechazarQr(resultado);
  if (entrada.claseId && entrada.claseId !== resultado.claseId) {
    return rechazar(409, "QR_OTRA_CLASE", "Este código QR es de otra clase. Verifica que estés escaneando el código de tu clase.");
  }

  const claseId = Number(resultado.claseId);
  return conClaseBloqueada(claseId, async (cliente): Promise<ResultadoMarcado> => {
    // El QR pudo vencer mientras la transacción esperaba a otra operación.
    const alBloquear = verificarTokenQr(entrada.token, reloj.ahora(), env.QR_SECRET);
    if (!alBloquear.ok) return rechazarQr(alBloquear);

    const clase = await obtenerClase(claseId, cliente);
    if (!clase) return rechazar(404, "CLASE_NO_EXISTE", "La clase no existe.");
    if (clase.estado === "CANCELADA") return rechazar(409, "CLASE_CANCELADA", "La clase está cancelada.");
    if (!(await estaInscrito(claseId, usuarioId, cliente))) {
      return rechazar(403, "NO_INSCRITO", "No estás inscrito(a) en esta clase. Pide al coordinador que te inscriba.");
    }

    const alGuardar = verificarTokenQr(entrada.token, reloj.ahora(), env.QR_SECRET);
    if (!alGuardar.ok) return rechazarQr(alGuardar);

    const hora = await registrarAsistencia(claseId, usuarioId, usuarioId, cliente);
    if (!hora) {
      const anterior = await horaDeAsistencia(claseId, usuarioId, cliente);
      return rechazar(
        409,
        "ASISTENCIA_YA_REGISTRADA",
        `Tu asistencia ya estaba registrada${anterior ? ` a las ${anterior.slice(11, 16)}` : ""}. No necesitas volver a escanear.`
      );
    }
    return { status: 201, cuerpo: { clase: { id: clase.id, nombre: clase.nombre }, horaRegistro: hora } };
  });
}
