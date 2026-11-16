import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { pool } from "../../shared/database.js";

/**
 * Webhook del componente event_sync de Prosody (jitsi-contrib, Apache-2.0). Las rutas y los
 * nombres de campo son su contrato externo. La identidad sale del JWT validado por Prosody,
 * nunca del nombre elegido en el navegador.
 */
const rutaBase = "/api/jitsi/events";
const marcaTiempo = z.number().int().positive().max(32503680000);
const eventoOcupante = z.object({
  room_name: z.string().min(1).max(200),
  occupant: z.object({
    id: z.string().regex(/^\d{1,15}$/).optional(),
    occupant_jid: z.string().min(3).max(320),
    joined_at: marcaTiempo,
    left_at: marcaTiempo.optional()
  }).loose()
}).loose();

function autorizado(cabecera: string | undefined, secreto: string) {
  const resumen = (valor: string) => createHash("sha256").update(valor).digest();
  return timingSafeEqual(resumen(cabecera ?? ""), resumen(`Bearer ${secreto}`));
}

export async function registrarEventosJitsi(aplicacion: FastifyInstance) {
  const verificar = async (solicitud: FastifyRequest) => {
    if (!env.jitsiEventosSecreto) throw aplicacion.httpErrors.serviceUnavailable();
    if (!autorizado(solicitud.headers.authorization, env.jitsiEventosSecreto)) throw aplicacion.httpErrors.unauthorized();
  };
  const opciones = { bodyLimit: 16 * 1024, preHandler: verificar };

  // Se aceptan para que Prosody no reintente; la asistencia solo usa entradas y salidas.
  for (const evento of ["room/created", "room/destroyed"]) aplicacion.post(`${rutaBase}/${evento}`, opciones, async () => ({}));

  aplicacion.post(`${rutaBase}/occupant/joined`, opciones, async solicitud => {
    const { room_name: nombreSala, occupant: ocupante } = eventoOcupante.parse(solicitud.body);
    if (!ocupante.id) return {};
    await pool.query(`insert into "conexionesReunion" ("reunionIdentificador", "usuarioIdentificador", "ocupanteJid", "entradaEn")
      select reunion.identificador, persona.id, $3, to_timestamp($4) from reuniones reunion join users persona on persona.id = $2
      where reunion."nombreSala" = $1 and reunion.estado = 'iniciada'
      on conflict ("reunionIdentificador", "ocupanteJid") do nothing`, [nombreSala, ocupante.id, ocupante.occupant_jid, ocupante.joined_at]);
    return {};
  });

  aplicacion.post(`${rutaBase}/occupant/left`, opciones, async solicitud => {
    const { room_name: nombreSala, occupant: ocupante } = eventoOcupante.parse(solicitud.body);
    if (!ocupante.id || !ocupante.left_at) return {};
    // Si se perdió la entrada, la salida trae ambos instantes y registra el intervalo completo.
    await pool.query(`insert into "conexionesReunion" ("reunionIdentificador", "usuarioIdentificador", "ocupanteJid", "entradaEn", "salidaEn")
      select reunion.identificador, persona.id, $3, to_timestamp($4), greatest(to_timestamp($4), to_timestamp($5))
      from reuniones reunion join users persona on persona.id = $2
      where reunion."nombreSala" = $1 and reunion.estado = 'iniciada'
      on conflict ("reunionIdentificador", "ocupanteJid") do update set "salidaEn" = excluded."salidaEn"
      where "conexionesReunion"."salidaEn" is null`, [nombreSala, ocupante.id, ocupante.occupant_jid, ocupante.joined_at, ocupante.left_at]);
    return {};
  });
}
