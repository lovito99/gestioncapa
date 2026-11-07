-- Las inscripciones históricas conservan su estado: no se deduce un pago a
-- partir del precio actual ni se retiran confirmaciones anteriores.
alter table inscripciones_curso drop constraint inscripciones_curso_estado_check;
alter table inscripciones_curso drop constraint inscripciones_curso_check;
alter table inscripciones_curso add constraint "inscripcionEstadoValido"
  check (estado in ('EN_CURSO','TERMINADO','PENDIENTE_PAGO'));
alter table inscripciones_curso add constraint "inscripcionFechaFinValida"
  check ((estado in ('EN_CURSO','PENDIENTE_PAGO') and terminado_en is null)
      or (estado='TERMINADO' and terminado_en is not null));
