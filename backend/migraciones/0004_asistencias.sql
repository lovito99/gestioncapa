-- Asistencias. timestamp_lima es la hora local de Lima sin zona (Perú no tiene
-- horario de verano). created_by: quien registró (participante por QR o coordinador).
create table attendances (
  id bigserial primary key,
  organization_id bigint not null default 1 constraint attendances_organization_fk references organizations (id),
  class_id bigint not null constraint attendances_class_fk references classes (id) on delete cascade,
  user_id bigint not null constraint attendances_user_fk references users (id),
  timestamp_lima timestamp not null default (now() at time zone 'America/Lima'),
  created_by bigint not null constraint attendances_created_by_fk references users (id),
  created_at timestamptz not null default now(),
  constraint attendances_class_user_key unique (class_id, user_id),
  -- Solo quien está inscrito en la clase puede tener asistencia en ella.
  constraint attendances_enrollment_fk foreign key (class_id, user_id)
    references enrollments (class_id, user_id) on delete cascade
);

create index attendances_user_idx on attendances (user_id);
create index attendances_organization_idx on attendances (organization_id);
