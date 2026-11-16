-- HU-36: modalidad por sesión y curso grabado. Ningún curso existente cambia de modalidad.
alter table classes add column modalidad varchar(10) not null default 'PRESENCIAL'
  check (modalidad in ('PRESENCIAL','VIRTUAL','AMBAS'));

-- Las sesiones heredan la modalidad de su curso; la híbrida pasa a «ambas» para conservarla.
update classes s set modalidad = case c.modalidad when 'VIRTUAL' then 'VIRTUAL' when 'HIBRIDA' then 'AMBAS' else 'PRESENCIAL' end
from cursos c where c.id = s.curso_id;
-- Una sesión que ya tiene sala virtual activa también se dicta en línea.
update classes s set modalidad = 'AMBAS' where s.modalidad = 'PRESENCIAL'
  and exists(select 1 from reuniones r where r."claseIdentificador" = s.id and r.estado in ('programada','iniciada'));

alter table cursos drop constraint cursos_modalidad_check;
alter table cursos add constraint cursos_modalidad_check check (modalidad in ('PRESENCIAL','VIRTUAL','HIBRIDA','GRABADO'));
-- Modalidad elegida por el administrador; vale mientras el curso no tenga sesiones programadas.
alter table cursos add column "modalidadPlanificada" varchar(20);
update cursos set "modalidadPlanificada" = modalidad;
alter table cursos alter column "modalidadPlanificada" set not null,
  add constraint "modalidadPlanificadaValida" check ("modalidadPlanificada" in ('PRESENCIAL','VIRTUAL','HIBRIDA','GRABADO'));
create index "classesCursoModalidadIndice" on classes(curso_id, estado, modalidad);

-- Inserciones que no la indican (semillas y scripts anteriores) usan la modalidad declarada.
create function "completarModalidadPlanificada"() returns trigger language plpgsql as $$
begin
  new."modalidadPlanificada" := coalesce(new."modalidadPlanificada", new.modalidad);
  return new;
end $$;
create trigger "cursosModalidadPlanificada" before insert on cursos
  for each row execute function "completarModalidadPlanificada"();
