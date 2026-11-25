alter table cursos add column "intentosMaximos" integer not null default 2
  check ("intentosMaximos" > 0);
