create table "sesionesAvance" (
  "cursoId" bigint not null,
  "usuarioId" bigint not null,
  "materialId" bigint not null references materiales_curso(id) on delete cascade,
  version integer not null,
  id uuid not null unique,
  secuencia integer not null default 0 check (secuencia >= 0),
  "inicioAcreditadoMs" integer not null check ("inicioAcreditadoMs" >= 0),
  "iniciadaEn" timestamptz not null default clock_timestamp(),
  "observadaEn" timestamptz not null default clock_timestamp(),
  primary key ("cursoId","usuarioId"),
  foreign key ("cursoId","usuarioId") references inscripciones_curso(curso_id, usuario_id) on delete cascade
);

create view "finalizacionesContenido" as
  select "cursoId","usuarioId","materialId",min("completadaEn") as "completadaEn"
  from (
    select "cursoId","usuarioId","leccionId" as "materialId","completadaEn" from "avanceLecciones"
    union all
    select ac."cursoId",ac."usuarioId",ac."materialId",ac."completadaEn"
      from "avanceContenido" ac join materiales_curso a on a.id=ac."materialId" and a."versionContenido"=ac.version
      where ac."completadaEn" is not null
  ) marcas
  group by "cursoId","usuarioId","materialId";
