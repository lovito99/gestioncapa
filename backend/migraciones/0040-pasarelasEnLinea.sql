create table "mediosPago" (
  id varchar(15) primary key check (id ~ '^[A-Z][A-Z0-9]{1,14}$')
);

insert into "mediosPago"(id) values ('IZIPAY'), ('CULQI'), ('EFECTIVO'), ('TRANSFERENCIA');

alter table "obligacionesPago" drop constraint "medioObligacionValido",
  add constraint "medioObligacionValido" foreign key (medio) references "mediosPago"(id);
alter table "operacionesPago" drop constraint "medioOperacionValido",
  add constraint "medioOperacionValido" foreign key (medio) references "mediosPago"(id);
alter table "hechosPago" add constraint "medioHechoValido" foreign key (medio) references "mediosPago"(id);

alter table "operacionesPago"
  add column instrumento varchar(7) check (instrumento in ('TARJETA', 'YAPE')),
  add column "comisionCentimos" bigint check ("comisionCentimos" between 0 and 999999999999),
  add column "totalCentimos" bigint check ("totalCentimos" between 1 and 1999999999998),
  add column comercio varchar(64),
  add column "ordenExterna" varchar(15) check ("ordenExterna" ~ '^[A-Z0-9]{5,15}$'),
  add constraint "desglosePagoEnLineaCompleto" check (
    (instrumento is null and "comisionCentimos" is null and "totalCentimos" is null and comercio is null and "ordenExterna" is null)
    or (medio not in ('EFECTIVO', 'TRANSFERENCIA') and instrumento is not null
      and "comisionCentimos" is not null and "totalCentimos" is not null and "totalCentimos" > "comisionCentimos"
      and comercio is not null and length(comercio) > 0 and "ordenExterna" is not null)
  ),
  drop constraint "estadoOperacionValido",
  add constraint "estadoOperacionValido"
    check (estado in ('INICIADO','INCIERTO','RECHAZADO','CONFIRMADO','DECLARADO','CANCELADO')),
  add constraint "cancelacionSoloPasarela"
    check (estado <> 'CANCELADO' or medio not in ('EFECTIVO', 'TRANSFERENCIA'));

create unique index "ordenExternaPorPasarela" on "operacionesPago"(medio,entorno,"ordenExterna")
  where "ordenExterna" is not null;
