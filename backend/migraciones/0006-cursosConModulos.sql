create table cursos (
  id bigserial primary key,
  organization_id bigint not null references organizations(id),
  creador_id bigint not null references users(id),
  instructor_id bigint not null references users(id),
  titulo varchar(160) not null check (length(trim(titulo)) > 0),
  descripcion text not null default '',
  horas_lectivas double precision not null check (horas_lectivas > 0 and horas_lectivas <= 10000),
  modalidad varchar(20) not null check (modalidad in ('PRESENCIAL','VIRTUAL','HIBRIDA')),
  costo numeric(12,2) not null check (costo >= 0),
  cupos integer not null check (cupos > 0),
  tipo_certificado varchar(20) not null check (tipo_certificado in ('PARTICIPACION','APROBACION')),
  nota_minima double precision not null default 14 check (nota_minima between 0 and 20),
  estado varchar(20) not null default 'BORRADOR' check (estado in ('BORRADOR','PUBLICADO')),
  creado_en timestamptz not null default now(),
  publicado_en timestamptz
);
create index cursos_organizacion_estado_idx on cursos(organization_id, estado);
create index cursos_instructor_idx on cursos(instructor_id);

create table modulos_curso (
  id bigserial primary key,
  curso_id bigint not null references cursos(id) on delete cascade,
  titulo varchar(160) not null check (length(trim(titulo)) > 0),
  orden integer not null check (orden > 0),
  unique(curso_id, orden)
);

create table materiales_curso (
  id bigserial primary key,
  modulo_id bigint not null references modulos_curso(id) on delete cascade,
  titulo varchar(160) not null check (length(trim(titulo)) > 0),
  tipo varchar(10) not null check (tipo in ('PDF','ENLACE','VIDEO')),
  url text,
  archivo bytea,
  creado_en timestamptz not null default now(),
  check ((tipo = 'PDF' and archivo is not null and url is null
      and octet_length(archivo) between 5 and 5242880)
    or (tipo in ('ENLACE','VIDEO') and archivo is null and url like 'https://%'))
);
create index materiales_modulo_idx on materiales_curso(modulo_id);
