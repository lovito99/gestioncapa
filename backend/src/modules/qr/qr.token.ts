import { createHmac, timingSafeEqual } from "node:crypto";

export const DURACION_QR_SEGUNDOS = 30;
const VENTANA_MS = DURACION_QR_SEGUNDOS * 1000;

/** Reloj del servidor; las pruebas lo reemplazan para simular el paso del tiempo. */
export const reloj = { ahora: () => Date.now() };

export type ResultadoQr = { ok: true; claseId: string } | { ok: false; motivo: "INVALIDO" | "EXPIRADO" };

const firmar = (claseId: string, expiraEnSegundos: number, secreto: string) =>
  createHmac("sha256", secreto).update(`qr1.${claseId}.${expiraEnSegundos}`).digest("base64url");

/**
 * Token `<claseId>.<expiraEnSegundos>.<firma>` de la ventana de 30 s que contiene
 * `ahoraMs`. Es el mismo durante toda la ventana y vence al terminarla.
 */
export function emitirTokenQr(claseId: string, ahoraMs: number, secreto: string) {
  const expiraEnMs = (Math.floor(ahoraMs / VENTANA_MS) + 1) * VENTANA_MS;
  const expiraEnSegundos = expiraEnMs / 1000;
  return { token: `${claseId}.${expiraEnSegundos}.${firmar(claseId, expiraEnSegundos, secreto)}`, expiraEnMs };
}

/** Solo el token de la ventana vigente es válido: sin periodo de gracia. */
export function verificarTokenQr(token: string, ahoraMs: number, secreto: string): ResultadoQr {
  const partes = token.split(".");

  if (partes.length !== 3 || !/^\d{1,15}$/.test(partes[0]!) || !/^\d{1,12}$/.test(partes[1]!)) {
    return { ok: false, motivo: "INVALIDO" };
  }

  const [claseId, expira, firma] = partes as [string, string, string];
  const esperada = Buffer.from(firmar(claseId, Number(expira), secreto));
  const recibida = Buffer.from(firma);

  // Comparación en tiempo constante: no revela cuántos caracteres coinciden.
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) {
    return { ok: false, motivo: "INVALIDO" };
  }

  if (ahoraMs >= Number(expira) * 1000) {
    return { ok: false, motivo: "EXPIRADO" };
  }

  return { ok: true, claseId };
}
