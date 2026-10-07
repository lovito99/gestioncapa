import { Pool } from "pg";
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
