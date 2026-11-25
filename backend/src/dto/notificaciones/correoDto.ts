import { z } from "zod";
import { estadosCorreo, tiposCorreo } from "../../entities/notificaciones/correo.js";

export const esquemaConsultaCorreo = z.object({
  tipo: z.enum(tiposCorreo).optional(),
  estado: z.enum(estadosCorreo).optional(),
  pagina: z.coerce.number().int().min(1).max(1000).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(25)
}).strict();
export type ConsultaCorreoDto = z.infer<typeof esquemaConsultaCorreo>;

export const esCorreoValido = (valor: string) => z.email().safeParse(valor).success;
