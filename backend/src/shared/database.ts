import { Pool, type PoolClient } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  options: `-c timezone=${env.DB_TIMEZONE}`
});

// El esquema se crea y versiona con las migraciones de backend/migraciones (npm run migrate).

/** Lo que un repositorio necesita para consultar: el pool o un cliente dentro de una transacción. */
export type Consultor = Pick<PoolClient, "query">;

/** PostgreSQL rechazó la fila por una restricción UNIQUE (23505). */
export const esViolacionUnica = (error: unknown) => (error as { code?: unknown } | null)?.code === "23505";
