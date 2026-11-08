-- Actualiza únicamente las identidades conocidas de demostración. No toca cuentas reales.
update users set email=case email
  when 'ana.torres@organizacion.pe' then 'ana.torres@cpppregion-cusco.com'
  when 'carlos.mendoza@organizacion.pe' then 'carlos.mendoza@cpppregion-cusco.com'
  when 'lucia.paredes@organizacion.pe' then 'lucia.paredes@cpppregion-cusco.com'
  when 'maria.quispe@demo.pe' then 'maria.quispe@demo.cpppregion-cusco.com'
  when 'luz.apaza@demo.pe' then 'luz.apaza@demo.cpppregion-cusco.com' end
where email in ('ana.torres@organizacion.pe','carlos.mendoza@organizacion.pe','lucia.paredes@organizacion.pe','maria.quispe@demo.pe','luz.apaza@demo.pe');
update classes set nombre='Demo · Estrategias de evaluación docente' where nombre='Demo · Manejo de extintores';
update reuniones set titulo='Demo · Reunión de evaluación docente' where titulo='Demo · Reunión de manejo de extintores';
