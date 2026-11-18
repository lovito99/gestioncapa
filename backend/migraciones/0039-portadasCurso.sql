create table "portadasCurso" (
  "cursoId" bigint primary key references cursos(id) on delete cascade,
  version text not null check (version ~ '^[0-9a-f]{64}$'),
  miniatura bytea not null check (octet_length(miniatura) between 1 and 92160),
  tarjeta bytea not null check (octet_length(tarjeta) between 1 and 184320),
  grande bytea not null check (octet_length(grande) between 1 and 393216),
  "anchoMiniatura" integer not null check ("anchoMiniatura" between 1 and 352),
  "anchoTarjeta" integer not null check ("anchoTarjeta" between "anchoMiniatura" and 704)
);
