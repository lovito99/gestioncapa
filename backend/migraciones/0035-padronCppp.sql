-- Proyección operativa del padrón oficial, cargada en una transacción.
create table "controlPadronCppp" (
  id smallint primary key check (id = 1),
  "validadoEn" timestamptz not null,
  "vigenteHasta" timestamptz not null check ("vigenteHasta" > "validadoEn")
);

create table "padronCppp" (
  dni varchar(8) primary key check (dni ~ '^[0-9]{8}$'),
  habilitado boolean not null,
  "usuarioIdVerificado" bigint unique references users(id) on delete set null
);
