import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '../../src/shared/database.js';

after(async () => { await pool.end(); });

test('HU-35: migra roles y retira organizaciones sin perder relaciones', async () => {
  const cliente = await pool.connect();
  const esquema = `pruebaCppp${randomBytes(8).toString('hex')}`;
  try {
    await cliente.query('begin');
    await cliente.query(`create schema "${esquema}"`);
    await cliente.query(`set local search_path to "${esquema}",pg_catalog`);
    const carpeta = new URL('../../migraciones/', import.meta.url);
    const archivos = (await readdir(carpeta)).filter(n => /^\d{4}.*\.sql$/.test(n)).sort();
    for (const nombre of archivos.filter(n => Number(n.slice(0, 4)) <= 13)) await cliente.query(await readFile(new URL(nombre, carpeta), 'utf8'));
    const personas = (await cliente.query(`insert into users(name,email,password_hash,role) values
      ('Ana','ana@prueba.local','hash','coordinador'),('Docente','docente@prueba.local','hash','instructor'),
      ('María','maria@prueba.local','hash','participante') returning id::text,role`)).rows;
    const admin = personas[0]!.id, docente = personas[1]!.id, agremiado = personas[2]!.id;
    const curso = (await cliente.query(`insert into cursos(organization_id,creador_id,instructor_id,titulo,horas_lectivas,modalidad,costo,cupos,tipo_certificado)
      values(1,$1,$2,'Didáctica docente',16,'PRESENCIAL',0,10,'PARTICIPACION') returning id`, [admin, docente])).rows[0]!.id;
    const sesion = (await cliente.query(`insert into classes(nombre,instructor_id,fecha,hora_inicio,hora_fin,lugar,curso_id)
      values('Evaluación',$1,'2026-01-01','08:00','09:00','Cusco',$2) returning id`, [docente, curso])).rows[0]!.id;
    await cliente.query('insert into enrollments(class_id,user_id) values($1,$2)', [sesion, agremiado]);
    await cliente.query('insert into inscripciones_curso(curso_id,usuario_id) values($1,$2)', [curso, agremiado]);
    const asistencia = (await cliente.query('insert into attendances(class_id,user_id,created_by) values($1,$2,$3) returning id', [sesion, agremiado, docente])).rows[0]!.id;
    for (const nombre of archivos.filter(n => Number(n.slice(0, 4)) >= 14)) await cliente.query(await readFile(new URL(nombre, carpeta), 'utf8'));
    assert.deepEqual((await cliente.query('select id::text,role from users order by id')).rows, [{ id: admin, role: 'admin' }, { id: docente, role: 'instructor' }, { id: agremiado, role: 'agremiado' }]);
    assert.equal((await cliente.query('select user_id::text from enrollments where class_id=$1', [sesion])).rows[0]!.user_id, agremiado);
    assert.equal((await cliente.query('select usuario_id::text from inscripciones_curso where curso_id=$1', [curso])).rows[0]!.usuario_id, agremiado);
    assert.equal((await cliente.query('select id from attendances where class_id=$1 and user_id=$2', [sesion, agremiado])).rows[0]!.id, asistencia);
    assert.equal((await cliente.query("select to_regclass('organizations') as tabla")).rows[0]!.tabla, null);
    assert.equal((await cliente.query(`select count(*)::int as total from information_schema.columns where table_schema=$1 and column_name='organization_id'`, [esquema])).rows[0]!.total, 0);
    await cliente.query('savepoint rolInvalido');
    await assert.rejects(cliente.query("update users set role='coordinador' where id=$1", [admin]), { code: '23514' });
    await cliente.query('rollback to savepoint rolInvalido');
  } finally { await cliente.query('rollback'); cliente.release(); }
});
