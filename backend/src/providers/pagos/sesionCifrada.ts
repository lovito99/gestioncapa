import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/** Sesión del formulario de Izipay que se guarda cifrada para poder retomarla. */
export const esquemaSesion = z.object({token:z.string(),keyRSA:z.string(),comercio:z.string(),orden:z.string(),transaccionId:z.string(),
  importe:z.string(),urlIPN:z.string(),entorno:z.enum(["sandbox","produccion"]),instrumento:z.enum(["TARJETA","YAPE"]).optional()});
export type SesionIzipay = z.infer<typeof esquemaSesion>;

const claveSesion = (secreto: string) => createHash("sha256").update("gestioncapa/sesion-izipay/v1:").update(secreto).digest();

/** AES-256-GCM con la operación como dato autenticado: un cifrado no sirve para otra operación. */
export function cifrarSesion(operacionId: string, sesion: SesionIzipay, secreto: string) {
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", claveSesion(secreto), iv);
  cifrador.setAAD(Buffer.from(operacionId));
  const cifrado = Buffer.concat([cifrador.update(JSON.stringify(sesion), "utf8"), cifrador.final()]);
  return Buffer.concat([iv, cifrador.getAuthTag(), cifrado]).toString("base64");
}

/** Lanza un error si el cifrado fue alterado o no corresponde a la operación. */
export function descifrarSesion(operacionId: string, sesionCifrada: string, secreto: string): SesionIzipay {
  const bytes = Buffer.from(sesionCifrada, "base64");
  const descifrador = createDecipheriv("aes-256-gcm", claveSesion(secreto), bytes.subarray(0, 12));
  descifrador.setAAD(Buffer.from(operacionId)); descifrador.setAuthTag(bytes.subarray(12, 28));
  const json = Buffer.concat([descifrador.update(bytes.subarray(28)), descifrador.final()]).toString("utf8");
  return esquemaSesion.parse(JSON.parse(json));
}
