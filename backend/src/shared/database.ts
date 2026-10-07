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

    alter table users add column if not exists active boolean not null default true;

    -- fecha y horas son locales de Lima: se guardan sin zona y nunca se convierten.
    create table if not exists clases (
      id bigserial primary key,
      nombre varchar(160) not null,
      instructor_id bigint not null references users(id),
      fecha date not null,
      hora_inicio time not null,
      hora_fin time not null,
      lugar varchar(160) not null,
      estado varchar(20) not null default 'PROGRAMADA' check (estado in ('PROGRAMADA', 'CANCELADA')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      check (hora_fin > hora_inicio)
    );

    create index if not exists clases_instructor_fecha_idx on clases (instructor_id, fecha);

    create table if not exists inscripciones (
      clase_id bigint not null references clases(id) on delete cascade,
      participante_id bigint not null references users(id),
      created_at timestamptz not null default now(),
      primary key (clase_id, participante_id)
    );
  `);
}
