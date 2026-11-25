alter table users alter column password_hash drop not null;

create table "identidadesGoogle" (
  emisor varchar(100) not null,
  sujeto varchar(255) not null,
  "usuarioId" bigint not null unique references users(id) on delete cascade,
  "vinculadaEn" timestamptz not null default now(),
  primary key (emisor, sujeto)
);
