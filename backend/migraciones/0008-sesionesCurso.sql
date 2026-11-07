-- Asociación aditiva: las clases anteriores no se atribuyen a ningún curso.
alter table cursos add constraint cursos_id_organizacion_key unique(id, organization_id);
alter table classes add column curso_id bigint;
alter table classes add constraint classes_curso_organizacion_fk
  foreign key(curso_id, organization_id) references cursos(id, organization_id);
create index classes_curso_fecha_idx on classes(curso_id, fecha, hora_inicio);
