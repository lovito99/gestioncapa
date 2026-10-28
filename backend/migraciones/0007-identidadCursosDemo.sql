-- Identidad de la semilla separada del título editable del curso.
alter table cursos add column clave_demo varchar(80);
alter table cursos add constraint cursos_organizacion_demo_unica unique (organization_id, clave_demo);
