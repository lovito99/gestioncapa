import { z } from "zod";

const identificador = /^\d{1,15}$/;

export const esquemaMarcar = z.object({
  token: z.string().trim().min(1),
  claseId: z.string().regex(identificador).optional()
});
export type MarcarAsistenciaDto = z.infer<typeof esquemaMarcar>;
