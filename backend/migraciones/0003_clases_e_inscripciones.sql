-- Clases presenciales e inscripciones. fecha y horas son locales de Lima:
-- se guardan sin zona y nunca se convierten.
create table classes (
  id bigserial primary key,
  organization_id bigint not null default 1 constraint classes_organization_fk references organizations (id),
  nombre varchar(160) not null,
  instructor_id bigint not null constraint classes_instructor_fk references users (id),
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  lugar varchar(160) not null,
  estado varchar(20) not null default 'PROGRAMADA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_estado_check check (estado in ('PROGRAMADA', 'CANCELADA')),
  constraint classes_horario_check check (hora_fin > hora_inicio)
);

create index classes_instructor_fecha_idx on classes (instructor_id, fecha);
create index classes_organization_fecha_idx on classes (organization_id, fecha);

-- La unicidad vive en la base, no solo en el código.
create table enrollments (
  id bigserial primary key,
  organization_id bigint not null default 1 constraint enrollments_organization_fk references organizations (id),
  class_id bigint not null constraint enrollments_class_fk references classes (id) on delete cascade,
  user_id bigint not null constraint enrollments_user_fk references users (id),
  created_at timestamptz not null default now(),
  constraint enrollments_class_user_key unique (class_id, user_id)
);

create index enrollments_user_idx on enrollments (user_id);

-- Bases creadas antes de T-07: copia clases e inscripciones conservando los ids
-- y elimina las tablas antiguas.
do $$
begin
  if to_regclass('public.clases') is not null then
    insert into classes (id, nombre, instructor_id, fecha, hora_inicio, hora_fin, lugar, estado, created_at, updated_at)
    select id, nombre, instructor_id, fecha, hora_inicio, hora_fin, lugar, estado, created_at, updated_at
    from clases;

    perform setval(
      pg_get_serial_sequence('classes', 'id'),
      coalesce((select max(id) from classes), 1),
      exists (select 1 from classes)
    );

    if to_regclass('public.inscripciones') is not null then
      insert into enrollments (class_id, user_id, created_at)
      select clase_id, participante_id, created_at
      from inscripciones;

      drop table inscripciones;
    end if;

    drop table clases;
  end if;
end $$;
