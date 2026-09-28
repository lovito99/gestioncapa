import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false
});

export async function ensureDatabase() {
  await pool.query(`
    create table if not exists users (
      id bigserial primary key,
      name varchar(120) not null,
      email varchar(180) not null unique,
      password_hash text not null,
      role varchar(40) not null default 'admin',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}
