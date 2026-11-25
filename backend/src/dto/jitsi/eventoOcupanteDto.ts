import { z } from "zod";

/**
 * Evento del componente event_sync de Prosody (jitsi-contrib, Apache-2.0). Los nombres de
 * campo son su contrato externo; la identidad (`occupant.id`) sale del JWT validado por Prosody.
 */
const marcaTiempo = z.number().int().positive().max(32503680000);

export const esquemaEventoOcupante = z.object({
  room_name: z.string().min(1).max(200),
  occupant: z.object({
    id: z.string().regex(/^\d{1,15}$/).optional(),
    occupant_jid: z.string().min(3).max(320),
    joined_at: marcaTiempo,
    left_at: marcaTiempo.optional()
  }).loose()
}).loose();

export type EventoOcupanteDto = z.infer<typeof esquemaEventoOcupante>;
