import type { PoolClient } from 'pg';
import type { CursoLecciones, EntradaLeccion, LeccionYoutube, MarcaLeccion } from '../../entities/lecciones/leccion.js';
import { pool } from '../../shared/database.js';
import { conTransaccion } from '../../shared/transaccion.js';
import { tieneInscripcion } from '../avance/avanceRepository.js';

export type ClienteLecciones = PoolClient;
export const transaccion = <T>(operacion: (cliente: ClienteLecciones) => Promise<T>) => conTransaccion(pool, operacion);

export async function buscarCurso(cliente: ClienteLecciones, id: string, escritura = false) {
  return (await cliente.query<CursoLecciones>(`
    select id::text,instructor_id::text as "instructorId",estado,modalidad,"modalidadCobro","revisionLecciones" as revision
    from cursos where id=$1 ${escritura ? 'for update' : 'for share'}`, [id])).rows[0];
}

export async function tieneInscripcionPrevia(cliente: ClienteLecciones, cursoId: string) {
  const consulta = await cliente.query(`
    select 1 from inscripciones_curso i join "intentosInscripcion" t on t.id=i."intentoId"
    where i.curso_id=$1 and i.estado<>'CANCELADA' and t."modalidadCobro"='PREVIO' limit 1`, [cursoId]);
  return Boolean(consulta.rowCount);
}

export const accesoInscripcion = tieneInscripcion;

export async function existeModulo(cliente: ClienteLecciones, cursoId: string, moduloId: string) {
  return Boolean((await cliente.query('select 1 from modulos_curso where curso_id=$1 and id=$2', [cursoId, moduloId])).rowCount);
}

const reciente = `l."verificadoEn">statement_timestamp()-interval '30 days'`;
const proyeccion = `l.id::text,v.modulo_id::text as "moduloId",m.titulo as modulo,v.titulo,l.orden,
  case when ${reciente} and l."duracionSegundos" is not null then l."youtubeId" end as "youtubeId",
  case when ${reciente} then l."duracionSegundos" end as "duracionSegundos",
  l."materialPdfId" is not null as "tienePdf",
  case when e."completadaEn" is not null then 'COMPLETADA' when e."abiertaEn" is not null then 'EN_CURSO' else 'PENDIENTE' end as estado,
  e."completadaEn"`;
const desde = `from "leccionesYoutube" l
  join materiales_curso v on v.id=l."materialVideoId"
  join modulos_curso m on m.id=v.modulo_id and m.curso_id=l."cursoId"
  left join "estadoLeccionesYoutube" e on e."cursoId"=l."cursoId" and e."leccionId"=l.id and e."usuarioId"=$2
  where l."cursoId"=$1`;

export async function listar(cliente: ClienteLecciones, cursoId: string, usuarioId: string | null = null) {
  return (await cliente.query<LeccionYoutube>(`select ${proyeccion} ${desde} order by l.orden`, [cursoId, usuarioId])).rows;
}

export async function buscarLeccion(cliente: ClienteLecciones, cursoId: string, leccionId: string, usuarioId: string | null = null) {
  return (await cliente.query<LeccionYoutube>(`select ${proyeccion} ${desde} and l.id=$3`, [cursoId, usuarioId, leccionId])).rows[0];
}

export async function buscarOperacion(cliente: ClienteLecciones, cursoId: string, operacionId: string) {
  return (await cliente.query<LeccionYoutube & { fuenteId: string }>(
    `select ${proyeccion},l."youtubeId" as "fuenteId" ${desde} and l."operacionId"=$3`, [cursoId, null, operacionId])).rows[0];
}

export async function insertar(cliente: ClienteLecciones, cursoId: string, datos: EntradaLeccion, segundos: number) {
  const { rows: [leccion] } = await cliente.query<{ id: string }>(`
    with material as (
      insert into materiales_curso(modulo_id,titulo,tipo,url) values($2,$3,'VIDEO',$4) returning id
    )
    insert into "leccionesYoutube"("cursoId","materialVideoId","youtubeId","operacionId",orden,"duracionSegundos","verificadoEn")
    select $1,id,$5,$6,(select coalesce(max(orden),0)+1 from "leccionesYoutube" where "cursoId"=$1),$7,clock_timestamp()
    from material returning id::text`,
    [cursoId, datos.moduloId, datos.titulo, `https://www.youtube.com/watch?v=${datos.youtubeId}`,
      datos.youtubeId, datos.operacionId, segundos]);
  return leccion!.id;
}

export async function incrementarRevision(cliente: ClienteLecciones, cursoId: string) {
  return (await cliente.query<{ revision: number }>(`
    update cursos set "revisionLecciones"="revisionLecciones"+1 where id=$1 returning "revisionLecciones" as revision`,
    [cursoId])).rows[0]!.revision;
}

export async function reordenar(cliente: ClienteLecciones, cursoId: string, ids: string[]) {
  await cliente.query(`
    update "leccionesYoutube" l set orden=posicion.indice::integer
    from unnest($2::bigint[]) with ordinality posicion(id,indice)
    where l."cursoId"=$1 and l.id=posicion.id`, [cursoId, ids]);
}

export async function guardarPdf(cliente: ClienteLecciones, cursoId: string, leccion: LeccionYoutube, archivo: Buffer) {
  const cambio = await cliente.query(`
    update materiales_curso a set archivo=$3 from "leccionesYoutube" l
    where l."cursoId"=$1 and l.id=$2 and l."materialPdfId"=a.id`, [cursoId, leccion.id, archivo]);
  if (cambio.rowCount) return;
  const titulo = `Material de ${leccion.titulo}`.slice(0, 160);
  await cliente.query(`
    with material as (
      insert into materiales_curso(modulo_id,titulo,tipo,archivo) values($3,$4,'PDF',$5) returning id
    )
    update "leccionesYoutube" l set "materialPdfId"=material.id from material where l."cursoId"=$1 and l.id=$2`,
    [cursoId, leccion.id, leccion.moduloId, titulo, archivo]);
}

export async function buscarPdf(cliente: ClienteLecciones, cursoId: string, leccionId: string) {
  return (await cliente.query<{ archivo: Buffer }>(`
    select a.archivo from "leccionesYoutube" l join materiales_curso a on a.id=l."materialPdfId"
    join modulos_curso m on m.id=a.modulo_id and m.curso_id=l."cursoId"
    where l."cursoId"=$1 and l.id=$2 and a.tipo='PDF'`, [cursoId, leccionId])).rows[0]?.archivo;
}

export async function marcar(cliente: ClienteLecciones, cursoId: string, leccionId: string, usuarioId: string, marca: MarcaLeccion) {
  const claves = [cursoId, usuarioId, leccionId];
  if (marca === 'EN_CURSO') {
    await cliente.query(`insert into "estadoLeccionesYoutube"("cursoId","usuarioId","leccionId")
      values($1,$2,$3) on conflict do nothing`, claves);
  } else {
    await cliente.query(`update "estadoLeccionesYoutube" set "completadaEn"=coalesce("completadaEn",clock_timestamp())
      where "cursoId"=$1 and "usuarioId"=$2 and "leccionId"=$3`, claves);
  }
  const leccion = await buscarLeccion(cliente, cursoId, leccionId, usuarioId);
  return { estado: leccion!.estado, completadaEn: leccion!.completadaEn };
}

export async function purgarMetadatosVencidos() {
  const eliminados = await pool.query(`
    update "leccionesYoutube" set "verificadoEn"=null,"duracionSegundos"=null
    where "verificadoEn" <= statement_timestamp()-interval '30 days'`);
  return eliminados.rowCount ?? 0;
}

export async function videosPorVerificar() {
  const { rows } = await pool.query<{ id: string; consultadaEn: Date }>(`
    select "youtubeId" as id,statement_timestamp() as "consultadaEn" from "leccionesYoutube"
    where "verificadoEn" is null or "verificadoEn" <= statement_timestamp()-interval '1 day'
    group by "youtubeId" order by min("verificadoEn") nulls first,"youtubeId" limit 50`);
  return rows;
}

export async function actualizarMetadatos(ids: string[], segundos: (number | null)[], consultadaEn: Date) {
  const actualizadas = await pool.query(`
    update "leccionesYoutube" l set "duracionSegundos"=dato.segundos,"verificadoEn"=$3
    from unnest($1::text[], $2::integer[]) dato(id,segundos)
    where l."youtubeId"=dato.id and (l."verificadoEn" is null or l."verificadoEn" <= $3)`, [ids, segundos, consultadaEn]);
  return actualizadas.rowCount ?? 0;
}
