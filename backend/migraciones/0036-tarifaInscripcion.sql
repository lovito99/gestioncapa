-- Los intentos anteriores conservan su importe sin atribuirles afiliación.
alter table "intentosInscripcion" add column "tipoPrecio" varchar(10)
  check ("tipoPrecio" in ('COLEGIADO', 'GENERAL'));
