import { z } from "zod";

export const rutaPuerta = "/api/clases/:id/asistencia/puerta";
export const idMarcaPuerta = z.string().regex(/^[1-9][0-9]{0,14}$/);
export const esquemaBuscarDni = z.strictObject({ dni: z.string().length(8).regex(/^[0-9]{8}$/) });
export const esquemaRegistroPuerta = z.union([
  z.strictObject({ token: z.string().min(1).max(160) }),
  z.strictObject({ participanteId: idMarcaPuerta })
]);

export type RegistroPuertaDto = z.infer<typeof esquemaRegistroPuerta>;
