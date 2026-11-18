alter table "notificacionesPago"
  drop constraint "notificacionesPago_estado_check",
  add constraint "notificacionesPagoEstado" check (estado in ('PENDIENTE','ENVIANDO','ENVIADO','FALLIDO','INCIERTO','OMITIDO')),
  add column datos jsonb;

drop index "notificacionesPagoPendientes";
create index "notificacionesPagoPendientes" on "notificacionesPago" ("intentarEn", "creadoEn")
  where estado='PENDIENTE';
create index "notificacionesPagoEnviando" on "notificacionesPago" ("bloqueadoHasta") where estado='ENVIANDO';
