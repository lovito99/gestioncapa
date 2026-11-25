alter table classes
  add column "encargadoAsistenciaId" bigint references users(id),
  add column "qrRotatorio" boolean not null default true;

create index "clasesEncargadoAsistenciaIdx" on classes ("encargadoAsistenciaId")
  where "encargadoAsistenciaId" is not null;

alter table attendances drop constraint attendances_origen_check;
alter table attendances add constraint "asistenciaOrigenValido"
  check (origen in ('QR', 'VIRTUAL', 'QR_PUERTA', 'DNI'));

create table "credencialesAsistencia" (
  "usuarioId" bigint primary key references users(id) on delete cascade,
  identificador uuid not null unique default gen_random_uuid()
);

create table "correccionesAsistenciaPuerta" (
  id bigint generated always as identity primary key,
  "marcaId" bigint not null,
  "claseId" bigint not null,
  "participanteId" bigint not null,
  "actorId" bigint not null,
  origen varchar(10) not null check (origen in ('QR_PUERTA', 'DNI')),
  "registradaEnLima" timestamp not null,
  "corregidaEn" timestamptz not null default now()
);
