import { createHmac, timingSafeEqual } from "node:crypto";

const formato = /^qpa1\.([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\.([A-Za-z0-9_-]{43})$/;

export function emitirQrPersonal(identificador: string, secreto: string) {
  const contenido = `qpa1.${identificador}`;
  const firma = createHmac("sha256", secreto).update(contenido).digest("base64url");
  return `${contenido}.${firma}`;
}

export function verificarQrPersonal(token: string, secreto: string): string | null {
  const coincidencia = formato.exec(token);
  if (!coincidencia || coincidencia[0] !== token) return null;
  const identificador = coincidencia[1]!;
  const esperado = emitirQrPersonal(identificador, secreto);
  return timingSafeEqual(Buffer.from(token), Buffer.from(esperado)) ? identificador : null;
}
