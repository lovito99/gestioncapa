create table "avanceLecciones" (
  "evaluacionId" bigint not null,
  "cursoId" bigint not null,
  "usuarioId" bigint not null,
  "leccionId" bigint not null check ("leccionId" > 0),
  "completadaEn" timestamptz not null default now(),
  primary key ("evaluacionId","usuarioId","leccionId"),
  foreign key ("cursoId","usuarioId") references inscripciones_curso(curso_id,usuario_id) on delete cascade,
  foreign key ("cursoId","evaluacionId") references evaluaciones("cursoId",id) on delete cascade
);

create index "avanceLeccionesPorInscripcion" on "avanceLecciones" ("cursoId","usuarioId");

create table "intentosEvaluacion" (
  "evaluacionId" bigint not null,
  "cursoId" bigint not null,
  "usuarioId" bigint not null,
  "operacionId" uuid not null,
  "respuestasHash" char(64) not null check ("respuestasHash" ~ '^[0-9a-f]{64}$'),
  numero integer not null check (numero > 0),
  nota double precision not null check (nota between 0 and 20),
  "enviadoEn" timestamptz not null default now(),
  primary key ("evaluacionId","usuarioId",numero),
  unique ("evaluacionId","usuarioId","operacionId"),
  foreign key ("cursoId","usuarioId") references inscripciones_curso(curso_id,usuario_id) on delete cascade,
  foreign key ("cursoId","evaluacionId") references evaluaciones("cursoId",id) on delete cascade
);

create index "intentosEvaluacionPorInscripcion" on "intentosEvaluacion" ("cursoId","usuarioId");
