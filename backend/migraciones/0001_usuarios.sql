-- Usuarios del sistema. "if not exists": las bases creadas antes de las migraciones
-- versionadas ya tienen esta tabla y se adoptan sin cambios.
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
