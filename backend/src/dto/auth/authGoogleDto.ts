import { z } from "zod";
import { esquemaRegistroGoogle } from "./authDto.js";

export const rutaGoogle = "/api/auth/google";
export const rutaCallbackGoogle = `${rutaGoogle}/callback`;
export const esquemaIpGoogle = z.union([z.ipv4(), z.ipv6()]);
export const identificadorGoogle = z.string().length(43).regex(/^[A-Za-z0-9_-]{43}$/);

export const esquemaInicioGoogle = z.strictObject({ curso: z.string().max(15).regex(/^[1-9]\d*$/).nullable().optional() });
export const esquemaCallbackGoogle = z.object({
  state: identificadorGoogle, code: z.string().min(1).max(2048).optional(),
  error: z.string().max(80).optional()
}).refine(datos => Boolean(datos.code) !== Boolean(datos.error));
export const esquemaIntentoGoogle = z.strictObject({ intento: identificadorGoogle });
export const esquemaVinculoGoogle = esquemaIntentoGoogle.extend({ password: z.string().min(1).max(256) });
export const esquemaCodigoGoogle = esquemaIntentoGoogle.extend({ codigo: z.string().length(6).regex(/^\d{6}$/) });
export const esquemaAltaGoogle = esquemaRegistroGoogle.extend(esquemaIntentoGoogle.shape);
