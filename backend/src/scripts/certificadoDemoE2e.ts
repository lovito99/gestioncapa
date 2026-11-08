import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { pool } from '../shared/database.js';

if (env.NODE_ENV!=='test' || env.DB_NAME!=='gestioncapa_e2e') throw new Error('La fixture HU-20 solo puede ejecutarse en gestioncapa_e2e y NODE_ENV=test.');
try {
  const personas=(await pool.query<{id:string;email:string;organizacion:string}>(`select id::text,email,organization_id::text as organizacion from users where email=any($1)`,[['admin@e2e.gestioncapa.local','maria.quispe@demo.pe','luz.apaza@demo.pe']])).rows;
  const admin=personas.find(p=>p.email==='admin@e2e.gestioncapa.local')!;
  const maria=personas.find(p=>p.email==='maria.quispe@demo.pe')!;
  const luz=personas.find(p=>p.email==='luz.apaza@demo.pe')!;
  if(!admin || !maria || !luz) throw new Error('Prepara primero los usuarios E2E.');
  const docente=(await pool.query<{id:string}>(`insert into users(name,email,password_hash,role,organization_id) values('Instructor HU20',$1,'sin-clave','instructor',$2) returning id::text`,[`${randomUUID()}@hu20.local`,admin.organizacion])).rows[0]!;
  const titulo=`HU20 - Constancia presencial E2E ${randomUUID().slice(0,8)}`;
  const curso=(await pool.query<{id:string}>(`insert into cursos(organization_id,creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado,estado)
    values($1,$2,$3,$4,24,'PRESENCIAL',0,10,'PARTICIPACION','PUBLICADO') returning id::text`,[admin.organizacion,admin.id,docente.id,titulo])).rows[0]!;
  for(const usuario of [maria,luz]) await pool.query('insert into inscripciones_curso(curso_id,usuario_id) values($1,$2)',[curso.id,usuario.id]);
  for(let i=0;i<10;i++) {
    const sesion=(await pool.query<{id:string}>(`insert into classes(organization_id,curso_id,nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar)
      values($1,$2,$3,$4,(now() at time zone 'America/Lima')::date-1,($5::text||':00')::time,($6::text||':00')::time,'Sala de prueba') returning id::text`,[admin.organizacion,curso.id,`HU20 sesión ${i}`,docente.id,i+7,i+8])).rows[0]!;
    for(const [usuario,cantidad] of [[maria,8],[luz,7]] as const) {
      await pool.query('insert into enrollments(organization_id,class_id,user_id) values($1,$2,$3)',[admin.organizacion,sesion.id,usuario.id]);
      if(i<cantidad) await pool.query('insert into attendances(organization_id,class_id,user_id,created_by) values($1,$2,$3,$4)',[admin.organizacion,sesion.id,usuario.id,admin.id]);
    }
  }
  console.log(JSON.stringify({cursoId:curso.id,titulo}));
} finally {await pool.end();}
