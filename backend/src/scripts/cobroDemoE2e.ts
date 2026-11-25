import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { pool } from '../shared/database.js';
import { inscribirseEnCurso } from '../routes/cursos.routes.js';

if (env.NODE_ENV !== 'test' || env.DB_NAME !== 'gestioncapa_e2e') throw new Error('La fixture HU53 requiere la base exclusiva de E2E.');
try {
  const personas = (await pool.query<{ id: string; email: string }>(
    'select id::text,email from users where email=any($1)',
    [['admin@e2e.gestioncapa.local', 'maria.quispe@demo.cpppregion-cusco.com']],
  )).rows;
  const admin = personas.find(persona => persona.email === 'admin@e2e.gestioncapa.local')!;
  const participante = personas.find(persona => persona.email === 'maria.quispe@demo.cpppregion-cusco.com')!;
  if (!admin || !participante) throw new Error('Prepara primero los usuarios E2E.');
  const docente = (await pool.query<{ id: string }>(`insert into users(name,email,password_hash,role)
    values('Instructor HU53',$1,'sin-acceso','instructor') returning id::text`, [`${randomUUID()}@hu53.local`])).rows[0]!;
  const cursos = [];
  for (const modalidadCobro of ['CERTIFICADO', 'GRATUITO']) {
    const titulo = `HU53 ${modalidadCobro} ${randomUUID().slice(0, 8)}`;
    const curso = (await pool.query<{ id: string }>(`insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado,estado,"modalidadCobro")
      values($1,$2,$3,24,'PRESENCIAL',$4,10,'PARTICIPACION','PUBLICADO',$5) returning id::text`,
    [admin.id, docente.id, titulo, modalidadCobro === 'GRATUITO' ? 0 : 30, modalidadCobro])).rows[0]!;
    await pool.query('insert into modulos_curso(curso_id,titulo,orden) values($1,\'Contenido HU53\',1)', [curso.id]);
    if (modalidadCobro==='CERTIFICADO') {
      await pool.query('update cursos set "modalidadCobro"=\'PREVIO\',costo=45,"plazoPagoMinutos"=60 where id=$1',[curso.id]);
      await inscribirseEnCurso(curso.id,Number(participante.id),1);
      await pool.query('update "intentosInscripcion" set "venceEn"=clock_timestamp()-interval \'1 second\' where "cursoId"=$1',[curso.id]);
      await pool.query('update cursos set "modalidadCobro"=\'CERTIFICADO\',costo=30,"plazoPagoMinutos"=null,"versionCobro"=2 where id=$1',[curso.id]);
    }
    await inscribirseEnCurso(curso.id, Number(participante.id), modalidadCobro==='CERTIFICADO'?2:1);
    const sesion = (await pool.query<{ id: string }>(`insert into classes(curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)
      values($1,'Sesión HU53',$2,(now() at time zone 'America/Lima')::date-1,$3::time,$4::time,'Sala E2E') returning id::text`,
    [curso.id, docente.id, modalidadCobro === 'GRATUITO' ? '10:00' : '08:00', modalidadCobro === 'GRATUITO' ? '11:00' : '09:00'])).rows[0]!;
    await pool.query('insert into enrollments(class_id,user_id) values($1,$2)', [sesion.id, participante.id]);
    await pool.query('insert into attendances(class_id,user_id,created_by) values($1,$2,$3)', [sesion.id, participante.id, admin.id]);
    cursos.push({ id: curso.id, titulo, modalidadCobro });
  }
  console.log(JSON.stringify(cursos));
} finally { await pool.end(); }
