import type { Consultor } from "../../shared/database.js";

export type ConexionesRepository = {
  /** Registra la entrada a una sala iniciada; una entrada repetida del mismo ocupante se ignora. */
  registrarEntrada(nombreSala: string, usuarioId: string, ocupanteJid: string, entradaEn: number): Promise<void>;
  /** Cierra la conexión; si se perdió la entrada, la salida trae ambos instantes y registra el intervalo completo. */
  registrarSalida(nombreSala: string, usuarioId: string, ocupanteJid: string, entradaEn: number, salidaEn: number): Promise<void>;
};

export function crearConexionesRepository(pool: Consultor): ConexionesRepository {
  return {
    async registrarEntrada(nombreSala, usuarioId, ocupanteJid, entradaEn) {
      await pool.query(`insert into "conexionesReunion" ("reunionIdentificador", "usuarioIdentificador", "ocupanteJid", "entradaEn")
      select reunion.identificador, persona.id, $3, to_timestamp($4) from reuniones reunion join users persona on persona.id = $2
      where reunion."nombreSala" = $1 and reunion.estado = 'iniciada'
      on conflict ("reunionIdentificador", "ocupanteJid") do nothing`, [nombreSala, usuarioId, ocupanteJid, entradaEn]);
    },
    async registrarSalida(nombreSala, usuarioId, ocupanteJid, entradaEn, salidaEn) {
      await pool.query(`insert into "conexionesReunion" ("reunionIdentificador", "usuarioIdentificador", "ocupanteJid", "entradaEn", "salidaEn")
      select reunion.identificador, persona.id, $3, to_timestamp($4), greatest(to_timestamp($4), to_timestamp($5))
      from reuniones reunion join users persona on persona.id = $2
      where reunion."nombreSala" = $1 and reunion.estado = 'iniciada'
      on conflict ("reunionIdentificador", "ocupanteJid") do update set "salidaEn" = excluded."salidaEn"
      where "conexionesReunion"."salidaEn" is null`, [nombreSala, usuarioId, ocupanteJid, entradaEn, salidaEn]);
    }
  };
}
