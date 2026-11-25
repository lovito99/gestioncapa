create table evaluaciones (
  id bigserial primary key,
  "cursoId" bigint not null references cursos(id) on delete cascade,
  titulo varchar(160) not null check (length(trim(titulo)) > 0),
  oficial boolean not null,
  preguntas jsonb not null check (jsonb_typeof(preguntas) = 'array'),
  "leccionesIds" bigint[] not null default '{}',
  lecciones jsonb not null default '[]' check (jsonb_typeof(lecciones) = 'array'),
  "notaMinima" double precision check ("notaMinima" between 0 and 20),
  "intentosMaximos" integer check ("intentosMaximos" > 0),
  "publicadaEn" timestamptz,
  unique ("cursoId", id),
  check (("publicadaEn" is null and "notaMinima" is null and "intentosMaximos" is null)
      or ("publicadaEn" is not null and "notaMinima" is not null and "intentosMaximos" is not null
          and jsonb_array_length(preguntas) > 0))
);

create unique index "evaluacionOficialPorCurso" on evaluaciones ("cursoId")
  where oficial and "publicadaEn" is not null;
