-- HU-26: sesiones virtuales seguras. Expansión compatible; las reuniones existentes
-- conservan sus políticas y las nuevas restringen la pantalla por defecto.
alter table reuniones
  add column "iniciadaEn" timestamptz,
  add column "finalizadaEn" timestamptz,
  add column "porcentajeMinimo" smallint not null default 70 check ("porcentajeMinimo" between 1 and 100),
  add column "manoPermitida" boolean not null default true,
  add column "grabacionPrevista" boolean not null default false,
  alter column "pantallaPermitida" set default false,
  add check ("finalizadaEn" is null or "iniciadaEn" is null or "finalizadaEn" >= "iniciadaEn");

-- La sala de espera es obligatoria para los colegiados; la columna se conserva por compatibilidad.
comment on column reuniones."salaEsperaHabilitada" is 'En desuso desde HU-26: la sala de espera siempre está activa.';

alter table "participantesReunion"
  add column "avisoGrabacionAceptadoEn" timestamptz,
  add column "retiradoEn" timestamptz;

-- Intervalos de conexión informados por Prosody (event_sync); ocupanteJid es único por conexión.
create table "conexionesReunion" (
  identificador bigserial primary key,
  "reunionIdentificador" uuid not null references reuniones(identificador) on delete cascade,
  "usuarioIdentificador" bigint not null references users(id),
  "ocupanteJid" varchar(320) not null,
  "entradaEn" timestamptz not null,
  "salidaEn" timestamptz,
  unique ("reunionIdentificador", "ocupanteJid"),
  check ("salidaEn" is null or "salidaEn" >= "entradaEn")
);
create index "conexionesReunionUsuarioIndice" on "conexionesReunion" ("reunionIdentificador", "usuarioIdentificador");

-- Resultado calculado al finalizar; se conserva para revisión del instructor.
create table "asistenciaReunion" (
  "reunionIdentificador" uuid not null references reuniones(identificador) on delete cascade,
  "usuarioIdentificador" bigint not null references users(id),
  "segundosConectados" integer not null check ("segundosConectados" >= 0),
  porcentaje numeric(5,2) not null check (porcentaje between 0 and 100),
  cuenta boolean not null,
  expulsado boolean not null default false,
  primary key ("reunionIdentificador", "usuarioIdentificador")
);

alter table attendances
  add column origen varchar(10) not null default 'QR' check (origen in ('QR','VIRTUAL'));
