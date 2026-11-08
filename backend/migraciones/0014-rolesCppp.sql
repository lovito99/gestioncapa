create table "auditoriaRoles" (
  id bigserial primary key,
  "usuarioId" bigint references users(id) on delete set null,
  "actorId" bigint references users(id) on delete set null,
  anterior text,
  nuevo text not null,
  motivo text not null check(length(trim(motivo))>0),
  fecha timestamptz not null default now()
);
insert into "auditoriaRoles"("usuarioId",anterior,nuevo,motivo)
  select id,role,case when role='coordinador' then 'admin' else 'agremiado' end,'Migración HU-35 al CPPP'
  from users where role in ('coordinador','participante');
-- Conserva las claves de usuario y todas sus relaciones.
update users set role='admin',updated_at=now() where role='coordinador';
update users set role='agremiado',updated_at=now() where role='participante';
alter table users alter column role set default 'agremiado';
alter table users add constraint "rolesCpppValidos" check (role in ('admin','instructor','agremiado'));
