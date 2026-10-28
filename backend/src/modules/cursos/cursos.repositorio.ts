import type { PoolClient } from 'pg';
import { pool } from '../../shared/database.js';
import type { DatosCurso, DatosMaterial } from './cursos.validacion.js';

export type Curso = {
  id: string; organizacionId: string; instructorId: string; instructorNombre: string;
  titulo: string; descripcion: string; horasLectivas: number; modalidad: string; costo: number;
  cupos: number; tipoCertificado: string; notaMinima: number; estado: 'BORRADOR' | 'PUBLICADO';
};
const columnas = `c.id::text, c.organization_id::text as "organizacionId", c.instructor_id::text as "instructorId",
  u.name as "instructorNombre", c.titulo, c.descripcion, c.horas_lectivas as "horasLectivas",
  c.modalidad, c.costo::float8, c.cupos, c.tipo_certificado as "tipoCertificado", c.nota_minima as "notaMinima", c.estado`;
export async function organizacionUsuario(id: number) {
  return (await pool.query<{ id: string }>('select organization_id::text as id from users where id=$1 and active', [id])).rows[0]?.id;
}
export async function listarCursos(organizacion: string, instructorId?: number, catalogo = false) {
  return (await pool.query<Curso>(`select ${columnas} from cursos c join users u on u.id=c.instructor_id
    where c.organization_id=$1 and ($2::bigint is null or c.instructor_id=$2)
    and (not $3::boolean or c.estado='PUBLICADO') order by c.id desc`, [organizacion, instructorId ?? null, catalogo])).rows;
}
export async function obtenerCurso(id: string) {
  const curso = (await pool.query<Curso>(`select ${columnas} from cursos c join users u on u.id=c.instructor_id where c.id=$1`, [id])).rows[0];
  if (!curso) return null;
  const modulos = (await pool.query<{ id: string; titulo: string; orden: number }>('select id::text,titulo,orden from modulos_curso where curso_id=$1 order by orden', [id])).rows;
  const materiales = (await pool.query<{ id: string; moduloId: string; titulo: string; tipo: string; url: string | null }>(`
    select a.id::text,a.modulo_id::text as "moduloId",a.titulo,a.tipo,a.url from materiales_curso a
    join modulos_curso m on m.id=a.modulo_id where m.curso_id=$1 order by a.id`, [id])).rows;
  return { ...curso, modulos: modulos.map(modulo => ({ ...modulo, materiales: materiales.filter(a => a.moduloId === modulo.id) })) };
}
export async function transaccion<T>(operacion: (cliente: PoolClient) => Promise<T>) {
  const cliente = await pool.connect();
  try { await cliente.query('begin'); const resultado = await operacion(cliente); await cliente.query('commit'); return resultado; }
  catch (error) { await cliente.query('rollback'); throw error; }
  finally { cliente.release(); }
}
export async function crearCurso(datos: DatosCurso, usuarioId: number, organizacion: string) {
  return transaccion(async cliente => {
    // Mantiene al instructor activo y en la organización mientras se crea el curso.
    const instructor = await cliente.query(`select id from users where id=$1 and organization_id=$2 and role='instructor' and active for share`, [datos.instructorId, organizacion]);
    if (!instructor.rowCount) return null;
    const id = (await cliente.query<{ id: string }>(`insert into cursos
      (organization_id,creador_id,instructor_id,titulo,descripcion,horas_lectivas,modalidad,costo,cupos,tipo_certificado,nota_minima)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id::text`,
    [organizacion, usuarioId, datos.instructorId, datos.titulo, datos.descripcion, datos.horasLectivas, datos.modalidad, datos.costo, datos.cupos, datos.tipoCertificado, datos.notaMinima])).rows[0]!.id;
    for (const [indice, modulo] of datos.modulos.entries()) await cliente.query('insert into modulos_curso(curso_id,titulo,orden) values($1,$2,$3)', [id, modulo.titulo, indice + 1]);
    return id;
  });
}
export async function guardarMaterial(cursoId: string, moduloId: string, instructorId: number, organizacion: string, datos: DatosMaterial) {
  // La autorización por objeto está también en la escritura: nunca basta el id del módulo.
  return (await pool.query<{ id: string }>(`insert into materiales_curso(modulo_id,titulo,tipo,url,archivo)
    select m.id,$5,$6,$7,$8 from modulos_curso m join cursos c on c.id=m.curso_id
    join users u on u.id=c.instructor_id
    where c.id=$1 and m.id=$2 and c.instructor_id=$3 and c.organization_id=$4 and u.active and u.role='instructor'
    returning id::text`, [cursoId, moduloId, instructorId, organizacion, datos.titulo, datos.tipo,
    datos.tipo === 'PDF' ? null : datos.url, datos.tipo === 'PDF' ? Buffer.from(datos.contenidoBase64, 'base64') : null])).rows[0];
}
export async function publicarCurso(id: string, organizacion: string) {
  return (await pool.query(`update cursos set estado='PUBLICADO',publicado_en=coalesce(publicado_en,now())
    where id=$1 and organization_id=$2 and horas_lectivas > 0 and
    exists(select 1 from modulos_curso where curso_id=cursos.id) returning id`, [id, organizacion])).rowCount;
}
export async function obtenerArchivo(cursoId: string, moduloId: string, materialId: string) {
  return (await pool.query<{ archivo: Buffer }>(`select a.archivo from materiales_curso a join modulos_curso m on m.id=a.modulo_id
    where m.curso_id=$1 and m.id=$2 and a.id=$3 and a.tipo='PDF'`, [cursoId, moduloId, materialId])).rows[0]?.archivo;
}
