create table reuniones (
  identificador uuid primary key,
  "claseIdentificador" bigint not null references classes(id),
  "nombreSala" text not null unique,
  titulo varchar(160) not null,
  "inicioProgramado" timestamptz not null,
  "finProgramado" timestamptz not null,
  estado text not null default 'programada' check (estado in ('programada','iniciada','cancelada','finalizada')),
  "creadorIdentificador" bigint not null references users(id),
  "camaraPermitida" boolean not null default true,
  "microfonoPermitido" boolean not null default true,
  "pantallaPermitida" boolean not null default true,
  "salaEsperaHabilitada" boolean not null default false,
  "fechaCreacion" timestamptz not null default now(),
  check ("finProgramado" > "inicioProgramado")
);
create index "reunionesClaseIndice" on reuniones ("claseIdentificador");
create table "participantesReunion" (
  "reunionIdentificador" uuid not null references reuniones(identificador),
  "usuarioIdentificador" bigint not null references users(id),
  rol text not null check (rol in ('anfitrion','moderador','participante')),
  estado text not null default 'autorizado' check (estado in ('autorizado','retirado')),
  primary key ("reunionIdentificador", "usuarioIdentificador")
);
create table "notificacionesReunion" (
  identificador bigserial primary key,
  "reunionIdentificador" uuid not null references reuniones(identificador),
  "usuarioIdentificador" bigint not null references users(id),
  tipo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','enviada','fallida')),
  intentos integer not null default 0,
  "fechaProgramada" timestamptz not null default now(),
  unique ("reunionIdentificador", "usuarioIdentificador", tipo)
);
