import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { pool } from '../shared/database.js';
import { conTransaccion } from '../shared/transaccion.js';

if (env.NODE_ENV !== 'test' || env.DB_NAME !== 'gestioncapa_e2e') {
  throw new Error('La fixture HU-19 solo puede ejecutarse en gestioncapa_e2e y NODE_ENV=test.');
}

const titulo = `HU19 · Curso grabado ${randomUUID().slice(0, 8)}`;
const leccion = 'Preparar la evidencia';
try {
  const cursoId = await conTransaccion(pool, async cliente => {
    const correos = [env.ADMIN_EMAIL, 'carlos.mendoza@cpppregion-cusco.com', 'maria.quispe@demo.cpppregion-cusco.com'];
    const { rows } = await cliente.query<{ id: string; email: string }>(
      'select id::text,email from users where email=any($1)', [correos]
    );
    const usuarios = new Map(rows.map(({ id, email }) => [email, id]));
    const [admin, instructor, alumno] = correos.map(correo => usuarios.get(correo));
    if (!admin || !instructor || !alumno) throw new Error('Prepara primero los usuarios E2E.');

    const curso = await cliente.query<{ id: string }>(
      `insert into cursos(creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado,estado)
       values($1,$2,$3,12,'GRABADO',0,10,'APROBACION','PUBLICADO') returning id::text`,
      [admin, instructor, titulo]
    );
    const { id } = curso.rows[0]!;
    await cliente.query('insert into inscripciones_curso(curso_id,usuario_id) values($1,$2)', [id, alumno]);
    await cliente.query(
      `with modulo as (insert into modulos_curso(curso_id,titulo,orden) values($1,'Lecciones',1) returning id)
       insert into materiales_curso(modulo_id,titulo,tipo,url)
       select id,$2,'VIDEO','https://videos.example/leccion.mp4' from modulo`, [id, leccion]
    );
    return id;
  });
  console.log(JSON.stringify({ cursoId, titulo, leccion }));
} finally {
  await pool.end();
}
