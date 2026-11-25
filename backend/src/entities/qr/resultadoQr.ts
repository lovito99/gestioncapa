/** Resultado de verificar un token QR de asistencia. */
export type ResultadoQr = { ok: true; claseId: string } | { ok: false; motivo: "INVALIDO" | "EXPIRADO" };
