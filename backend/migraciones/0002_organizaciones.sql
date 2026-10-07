-- Multiorganización desde el inicio. En el Sprint 1 todo pertenece a la
-- organización demo (id = 1), que es el valor por defecto de organization_id.
create table organizations (
  id bigint primary key,
  name varchar(160) not null,
  created_at timestamptz not null default now()
);

insert into organizations (id, name) values (1, 'Organización demo');

alter table users
  add column organization_id bigint not null default 1
  constraint users_organization_fk references organizations (id);

create index users_organization_idx on users (organization_id);
