import { pool } from "../../shared/database.js";
import { redis } from "../../shared/redis.js";

export type HealthRepository = {
  /** Valor devuelto por `select 1`; 1 si la base responde. */
  consultarBase(): Promise<unknown>;
  /** Respuesta de PING, o "disabled" si Redis no está conectado. */
  consultarRedis(): Promise<string>;
};

export const healthRepository: HealthRepository = {
  async consultarBase() {
    return (await pool.query("select 1 as ok")).rows[0]?.ok;
  },
  async consultarRedis() {
    return redis.status === "ready" ? redis.ping() : "disabled";
  }
};
