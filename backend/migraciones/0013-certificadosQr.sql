alter table cursos drop constraint cursos_estado_check;
alter table cursos add constraint "cursoEstadoCertificable" check (estado in ('BORRADOR','PUBLICADO','CERRADO'));
alter table cursos add column "cerradoEn" timestamptz;

alter table certificados_curso drop constraint certificados_curso_curso_id_usuario_id_key;
alter table certificados_curso add column estado varchar(15) not null default 'VALIDO'
  check (estado in ('VALIDO','ANULADO','REEMPLAZADO'));
alter table certificados_curso add column datos jsonb;
alter table certificados_curso add column "porExcepcion" boolean not null default false;
alter table certificados_curso add column "reemplazadoPor" varchar(100)
  references certificados_curso(codigo) deferrable initially deferred;
alter table certificados_curso add constraint "reemplazoCertificadoConsistente"
  check ((estado='REEMPLAZADO') = ("reemplazadoPor" is not null));
create unique index "certificadoActualPorColegiado" on certificados_curso(curso_id,usuario_id) where estado<>'REEMPLAZADO';

create table "auditoriaCertificados" (
  id bigserial primary key,
  "actorId" bigint references users(id) on delete set null,
  "cursoId" bigint not null,
  codigo varchar(100),
  accion varchar(20) not null check (accion in ('CERRAR','EMITIR','EXCEPCION','ANULAR','CORREGIR')),
  fecha timestamptz not null default now(),
  motivo text,
  check (accion in ('CERRAR','EMITIR') or length(trim(motivo))>0 and motivo is not null)
);
