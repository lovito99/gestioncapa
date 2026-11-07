alter table cursos add column categoria varchar(80) not null default 'General'
  check (length(trim(categoria)) > 0);
alter table cursos add column fecha_inicio date;
alter table cursos add column fecha_fin date;
alter table cursos add constraint cursos_fechas_validas check (
  (fecha_inicio is null and fecha_fin is null) or
  (fecha_inicio is not null and fecha_fin is not null and fecha_fin >= fecha_inicio)
);
create index cursos_catalogo_categoria_idx on cursos(organization_id, categoria) where estado='PUBLICADO';

-- Completa solo las columnas nuevas de las semillas ya existentes.
update cursos c set categoria=case clave_demo when 'seguridadPrimerosAuxilios' then 'Seguridad y salud'
  when 'didacticaEvaluacion' then 'Educación' else 'Tecnología' end,
  fecha_inicio=coalesce((select min(fecha) from classes s where s.curso_id=c.id), (now() at time zone 'America/Lima')::date+15),
  fecha_fin=coalesce((select max(fecha) from classes s where s.curso_id=c.id), (now() at time zone 'America/Lima')::date+20)
where clave_demo in ('seguridadPrimerosAuxilios','didacticaEvaluacion','herramientasDigitales');
