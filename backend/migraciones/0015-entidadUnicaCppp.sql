-- Corte coordinado: desplegar junto al código que ya no consulta organizaciones.
-- No modifica claves de usuarios, cursos, sesiones, inscripciones ni asistencias.
alter table classes drop constraint classes_curso_organizacion_fk;
alter table users drop column organization_id;
alter table classes drop column organization_id;
alter table enrollments drop column organization_id;
alter table attendances drop column organization_id;
alter table cursos drop column organization_id;
drop table organizations;
alter table classes add constraint "sesionCursoCppp" foreign key(curso_id) references cursos(id);
create index "cursosCatalogoCppp" on cursos(categoria) where estado='PUBLICADO';
