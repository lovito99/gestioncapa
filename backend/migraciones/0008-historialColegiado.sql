-- El DNI se usa solo mediante su representación enmascarada en HU-18.
alter table users add column dni varchar(8) check (dni is null or dni ~ '^[0-9]{8}$');

create table inscripciones_curso (
  curso_id bigint not null references cursos(id) on delete cascade,
  usuario_id bigint not null references users(id) on delete cascade,
  estado varchar(15) not null default 'EN_CURSO' check (estado in ('EN_CURSO','TERMINADO')),
  inscrito_en timestamptz not null default now(),
  terminado_en timestamptz,
  primary key(curso_id,usuario_id),
  check ((estado='EN_CURSO' and terminado_en is null) or (estado='TERMINADO' and terminado_en is not null)),
  check (terminado_en is null or terminado_en >= inscrito_en)
);
create index inscripciones_curso_usuario_idx on inscripciones_curso(usuario_id);

-- Conserva las clases independientes ya existentes.
alter table classes add column curso_id bigint references cursos(id);
create index classes_curso_idx on classes(curso_id);

-- Archivos ya emitidos: esta historia no genera ni concede certificados.
create table certificados_curso (
  id bigserial primary key,
  curso_id bigint not null,
  usuario_id bigint not null,
  codigo varchar(100) not null unique,
  tipo varchar(20) not null check (tipo in ('PARTICIPACION','APROBACION')),
  emitido_en timestamptz not null default now(),
  archivo bytea not null check (octet_length(archivo) between 5 and 5242880),
  foreign key(curso_id,usuario_id) references inscripciones_curso(curso_id,usuario_id) on delete cascade,
  unique(curso_id,usuario_id)
);
create index certificados_curso_usuario_idx on certificados_curso(usuario_id);

-- Identidad de las sesiones demo para preservar ediciones al repetir el seed.
alter table classes add column clave_historial_demo varchar(80);
alter table classes add constraint classes_historial_demo_unica unique(organization_id, clave_historial_demo);
