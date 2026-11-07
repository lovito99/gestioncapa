-- No elimina ni combina identidades anteriores: los duplicados deben resolverse
-- antes de aplicar los índices, conservando trazabilidad de los datos existentes.
create unique index "usersDniUnico" on users(dni) where dni is not null;
create unique index "usersCorreoNormalizadoUnico" on users(lower(email));
alter table users alter column name type varchar(161);
alter table users add column nombres varchar(80);
alter table users add column apellidos varchar(80);
alter table users add column celular varchar(9) check (celular is null or celular ~ '^9[0-9]{8}$');

-- Solo identifica al actor y el consentimiento; no replica DNI, celular o claves.
create table "auditoriaRegistro" (
  id bigserial primary key,
  "usuarioId" bigint references users(id) on delete set null,
  accion varchar(30) not null default 'REGISTRO_DOCENTE' check (accion='REGISTRO_DOCENTE'),
  fecha timestamptz not null default now(),
  "aceptaPrivacidad" boolean not null check ("aceptaPrivacidad"),
  "versionAviso" varchar(200) not null
);
create index "auditoriaRegistroUsuario" on "auditoriaRegistro"("usuarioId");
