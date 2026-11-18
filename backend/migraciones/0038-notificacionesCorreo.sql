create table "notificacionesCorreo" (
  id uuid primary key default gen_random_uuid(),
  tipo varchar(24) not null check (tipo in ('INSCRIPCION_CONFIRMADA','CAMBIO_SESION','CONSTANCIA_EMITIDA')),
  "eventoId" text not null,
  "cursoId" bigint not null references cursos(id) on delete cascade,
  "usuarioId" bigint not null references users(id) on delete cascade,
  destinatario varchar(180) not null,
  datos jsonb not null,
  estado varchar(15) not null default 'PENDIENTE'
    check (estado in ('PENDIENTE','ENVIANDO','ENVIADO','FALLIDO','INCIERTO','OMITIDO')),
  intentos integer not null default 0,
  "intentarEn" timestamptz not null default clock_timestamp(),
  "procesamientoId" uuid,
  "bloqueadoHasta" timestamptz,
  "ultimoError" varchar(40),
  "enviadoEn" timestamptz,
  "creadoEn" timestamptz not null default clock_timestamp(),
  unique (tipo,"eventoId","usuarioId")
);

create index "notificacionesCorreoPendientes" on "notificacionesCorreo" ("intentarEn","creadoEn")
  where estado='PENDIENTE';
create index "notificacionesCorreoEnviando" on "notificacionesCorreo" ("bloqueadoHasta")
  where estado='ENVIANDO';
create index "notificacionesCorreoCreacion" on "notificacionesCorreo" ("creadoEn" desc,id desc);
create index "notificacionesCorreoCurso" on "notificacionesCorreo" ("cursoId");
create index "notificacionesCorreoUsuario" on "notificacionesCorreo" ("usuarioId");
