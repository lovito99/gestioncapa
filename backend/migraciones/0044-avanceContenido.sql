alter table cursos add column "avanceMedido" boolean not null default false;
alter table materiales_curso
  add column obligatorio boolean not null default false,
  add column "duracionMs" integer check ("duracionMs" is null or ("duracionMs" between 1 and 86400000 and tipo = 'VIDEO')),
  add column "versionContenido" integer not null default 1 check ("versionContenido" > 0);

create table "avanceContenido" (
  "cursoId" bigint not null,
  "usuarioId" bigint not null,
  "materialId" bigint not null references materiales_curso(id) on delete cascade,
  version integer not null,
  "vistoMs" integer not null default 0 check ("vistoMs" >= 0),
  "posicionMs" integer not null default 0 check ("posicionMs" between 0 and "vistoMs"),
  "completadaEn" timestamptz,
  primary key ("cursoId", "usuarioId", "materialId", version),
  foreign key ("cursoId","usuarioId") references inscripciones_curso(curso_id, usuario_id) on delete cascade
);
