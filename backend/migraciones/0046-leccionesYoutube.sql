alter table cursos add column "revisionLecciones" integer not null default 0 check ("revisionLecciones" >= 0);

create table "leccionesYoutube" (
  id bigserial primary key,
  "cursoId" bigint not null references cursos(id) on delete cascade,
  "materialVideoId" bigint not null unique references materiales_curso(id) on delete cascade,
  "materialPdfId" bigint unique references materiales_curso(id) on delete set null,
  "youtubeId" varchar(11) not null check ("youtubeId" ~ '^[A-Za-z0-9_-]{11}$'),
  "operacionId" uuid not null,
  orden integer not null check (orden > 0),
  "duracionSegundos" integer check ("duracionSegundos" > 0),
  "verificadoEn" timestamptz,
  unique ("cursoId", "operacionId"),
  unique ("cursoId", id),
  unique ("cursoId", orden) deferrable initially deferred,
  check ("duracionSegundos" is null or "verificadoEn" is not null)
);
create index "leccionesYoutubePorVerificar" on "leccionesYoutube" ("verificadoEn", id);

create table "estadoLeccionesYoutube" (
  "cursoId" bigint not null,
  "leccionId" bigint not null,
  "usuarioId" bigint not null,
  "abiertaEn" timestamptz not null default clock_timestamp(),
  "completadaEn" timestamptz,
  primary key ("cursoId", "usuarioId", "leccionId"),
  foreign key ("cursoId", "usuarioId") references inscripciones_curso(curso_id, usuario_id) on delete cascade,
  foreign key ("cursoId", "leccionId") references "leccionesYoutube"("cursoId", id) on delete cascade
);
