import { categoriasCatalogo } from './cursos.categorias.js';
import { listarSesiones } from './sesiones.repositorio.js';
import type { PoolClient } from 'pg';
import { pool } from '../../shared/database.js';
import type { ConsultaCatalogo, DatosCurso, DatosMaterial } from './cursos.validacion.js';

export type Curso = {
  id: string; instructorId: string; instructorNombre: string;
  titulo: string; descripcion: string; horasLectivas: number; modalidad: string; costo: number;
  categoria: string; fechaInicio: string | null; fechaFin: string | null; cuposDisponibles: number; inscrito?: boolean;
  estadoInscripcion?: 'EN_CURSO' | 'TERMINADO' | 'PENDIENTE_PAGO' | null;
  cupos: number; tipoCertificado: string; notaMinima: number; estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO';
};
const columnas = `c.id::text, c.instructor_id::text as "instructorId",
  u.name as "instructorNombre", c.titulo, c.descripcion, c.horas_lectivas as "horasLectivas",
  c.modalidad, c.costo::float8, c.cupos, c.tipo_certificado as "tipoCertificado", c.nota_minima as "notaMinima", c.estado,
  c.categoria,to_char(c.fecha_inicio,'YYYY-MM-DD') as "fechaInicio",to_char(c.fecha_fin,'YYYY-MM-DD') as "fechaFin",
  greatest(c.cupos-(select count(*) from inscripciones_curso ins where ins.curso_id=c.id),0)::int as "cuposDisponibles"`;
export async function listarCursos(instructorId?: number, catalogo = false) {
  return (await pool.query<Curso>(`select ${columnas} from cursos c join users u on u.id=c.instructor_id
    where ($1::bigint is null or c.instructor_id=$1)
    and (not $2::boolean or c.estado='PUBLICADO') order by c.id desc`, [instructorId ?? null, catalogo])).rows;
}
export async function obtenerCurso(id: string, usuarioId?: number) {
  const curso = (await pool.query<Curso>(`select ${columnas},exists(select 1 from inscripciones_curso ins where ins.curso_id=c.id and ins.usuario_id=$2) as inscrito,(select ins.estado from inscripciones_curso ins where ins.curso_id=c.id and ins.usuario_id=$2) as "estadoInscripcion" from cursos c join users u on u.id=c.instructor_id where c.id=$1`, [id, usuarioId ?? null])).rows[0];
  if (!curso) return null;
  const modulos = (await pool.query<{ id: string; titulo: string; orden: number }>('select id::text,titulo,orden from modulos_curso where curso_id=$1 order by orden', [id])).rows;
  const materiales = (await pool.query<{ id: string; moduloId: string; titulo: string; tipo: string; url: string | null }>(`
    select a.id::text,a.modulo_id::text as "moduloId",a.titulo,a.tipo,a.url from materiales_curso a
    join modulos_curso m on m.id=a.modulo_id where m.curso_id=$1 order by a.id`, [id])).rows;
  return { ...curso, sesiones: await listarSesiones(id), modulos: modulos.map(modulo => ({ ...modulo, materiales: materiales.filter(a => a.moduloId === modulo.id) })) };
}
export async function transaccion<T>(operacion: (cliente: PoolClient) => Promise<T>) {
  const cliente = await pool.connect();
  try { await cliente.query('begin'); const resultado = await operacion(cliente); await cliente.query('commit'); return resultado; }
  catch (error) { await cliente.query('rollback'); throw error; }
  finally { cliente.release(); }
}
export async function crearCurso(datos: DatosCurso, usuarioId: number) {
  return transaccion(async cliente => {
    // Mantiene al instructor activo mientras se crea el curso.
    const instructor = await cliente.query(`select id from users where id=$1 and role='instructor' and active for share`, [datos.instructorId]);
    if (!instructor.rowCount) return null;
    const id = (await cliente.query<{ id: string }>(`insert into cursos
      (creador_id,instructor_id,titulo,descripcion,horas_lectivas,modalidad,costo,cupos,tipo_certificado,nota_minima,categoria,fecha_inicio,fecha_fin)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id::text`,
    [usuarioId, datos.instructorId, datos.titulo, datos.descripcion, datos.horasLectivas, datos.modalidad, datos.costo, datos.cupos, datos.tipoCertificado, datos.notaMinima, datos.categoria, datos.fechaInicio, datos.fechaFin])).rows[0]!.id;
    for (const [indice, modulo] of datos.modulos.entries()) await cliente.query('insert into modulos_curso(curso_id,titulo,orden) values($1,$2,$3)', [id, modulo.titulo, indice + 1]);
    return id;
  });
}
export async function guardarMaterial(cursoId: string, moduloId: string, instructorId: number, datos: DatosMaterial) {
  // La autorización por objeto está también en la escritura: nunca basta el id del módulo.
  return (await pool.query<{ id: string }>(`insert into materiales_curso(modulo_id,titulo,tipo,url,archivo)
    select m.id,$4,$5,$6,$7 from modulos_curso m join cursos c on c.id=m.curso_id
    join users u on u.id=c.instructor_id
    where c.id=$1 and m.id=$2 and c.instructor_id=$3 and u.active and u.role='instructor'
    returning id::text`, [cursoId, moduloId, instructorId, datos.titulo, datos.tipo,
    datos.tipo === 'PDF' ? null : datos.url, datos.tipo === 'PDF' ? Buffer.from(datos.contenidoBase64, 'base64') : null])).rows[0];
}
export async function publicarCurso(id: string) {
  return (await pool.query(`update cursos set estado='PUBLICADO',publicado_en=coalesce(publicado_en,now())
    where id=$1 and estado<>'CERRADO' and horas_lectivas > 0 and
    exists(select 1 from modulos_curso where curso_id=cursos.id) returning id`, [id])).rowCount;
}
export async function obtenerArchivo(cursoId: string, moduloId: string, materialId: string) {
  return (await pool.query<{ archivo: Buffer }>(`select a.archivo from materiales_curso a join modulos_curso m on m.id=a.modulo_id
    where m.curso_id=$1 and m.id=$2 and a.id=$3 and a.tipo='PDF'`, [cursoId, moduloId, materialId])).rows[0]?.archivo;
}

export async function paginaCatalogo(usuarioId: number, consulta: ConsultaCatalogo, soloVigentes = false) {
  // Un solo snapshot para resultados y total; categorías fijas del Sprint 2.
  const datos = (await pool.query<{ items: Curso[]; total: number }>(`with publicados as (
      select ${columnas},exists(select 1 from inscripciones_curso ins where ins.curso_id=c.id and ins.usuario_id=$6) as inscrito
      from cursos c join users u on u.id=c.instructor_id where c.estado='PUBLICADO'
      and (not $7::boolean or c.fecha_fin is null or c.fecha_fin >= (now() at time zone 'America/Lima')::date)
    ), filtrados as (
      select * from publicados where
      strpos(translate(lower(titulo),'áéíóúüñ','aeiouun'),translate(lower($1),'áéíóúüñ','aeiouun')) > 0
      and ($2::text is null or modalidad=$2) and ($3::text is null or categoria=$3)
    ), pagina as (select * from filtrados order by id::bigint desc limit $4 offset $5)
    select coalesce((select jsonb_agg(to_jsonb(p) order by p.id::bigint desc) from pagina p),'[]'::jsonb) as items,
      (select count(*)::int from filtrados) as total`,
    [consulta.buscar, consulta.modalidad ?? null, consulta.categoria ?? null, consulta.tamanoPagina,
      (consulta.pagina - 1) * consulta.tamanoPagina, usuarioId, soloVigentes])).rows[0]!;
  return { ...datos, categorias: [...categoriasCatalogo], pagina: consulta.pagina, tamanoPagina: consulta.tamanoPagina, totalPaginas: Math.ceil(datos.total / consulta.tamanoPagina) };
}

export async function inscribirseEnCurso(cursoId: string, usuarioId: number) {
  return transaccion(async cliente => {
    // El bloqueo del curso serializa todas las solicitudes a la última plaza.
    const curso = (await cliente.query<{ estado: string; cupos: number; costo: number }>('select estado,cupos,costo::float8 as costo from cursos where id=$1 for update', [cursoId])).rows[0];
    if (!curso) return 'NO_EXISTE' as const;
    const persona = (await cliente.query<{ id: string }>(`select id from users where id=$1 and active and role='agremiado' for share`, [usuarioId])).rows[0];
    if (!persona) return 'SIN_PERMISO' as const;
    if (curso.estado !== 'PUBLICADO') return 'NO_PUBLICADO' as const;
    const inscripcion = (await cliente.query<{ estado: string }>('select estado from inscripciones_curso where curso_id=$1 and usuario_id=$2', [cursoId, usuarioId])).rows[0];
    if (inscripcion) return inscripcion.estado === 'TERMINADO' ? 'YA_TERMINADO' as const : inscripcion.estado === 'PENDIENTE_PAGO' ? 'YA_PENDIENTE' as const : 'YA_INSCRITO' as const;
    const inscritos = (await cliente.query<{ total: number }>('select count(*)::int as total from inscripciones_curso where curso_id=$1', [cursoId])).rows[0]!.total;
    if (inscritos >= curso.cupos) return 'SIN_CUPOS' as const;
    const pendiente = curso.costo > 0;
    await cliente.query('insert into inscripciones_curso(curso_id,usuario_id,estado) values($1,$2,$3)', [cursoId, usuarioId, pendiente ? 'PENDIENTE_PAGO' : 'EN_CURSO']);
    if (!pendiente) await cliente.query(`insert into enrollments(class_id,user_id)
      select id,$2 from classes where curso_id=$1 and estado='PROGRAMADA'
      on conflict(class_id,user_id) do nothing`, [cursoId, usuarioId]);
    return pendiente ? 'INSCRITO_PENDIENTE' as const : 'INSCRITO' as const;
  });
}
