import type { PoolClient } from 'pg';
import { pool } from '../../shared/database.js';
import { conTransaccion } from '../../shared/transaccion.js';
import { ErrorAplicacion } from '../../shared/errorAplicacion.js';
import { categoriasCatalogo, type CambioCobro, type Curso, type FiltroCatalogo, type NuevoCurso, type NuevoMaterial } from '../../entities/cursos/curso.js';
import { conPortada, type DatosPortada, type PortadaProcesada } from '../../entities/cursos/portada.js';
import { listarSesiones } from './sesionesCursoRepository.js';
import { columnaPortada, guardarPortada } from './portadasRepository.js';

export async function actualizarCobro(id: string, datos: CambioCobro) {
  return transaccion(async cliente => {
    await cliente.query('select id from cursos where id=$1 for update', [id]);
    if (datos.modalidadCobro === 'PREVIO' &&
        (await cliente.query('select 1 from "leccionesYoutube" where "cursoId"=$1 limit 1', [id])).rowCount) {
      throw new ErrorAplicacion(409, 'YOUTUBE_REQUIERE_ACCESO_GRATUITO', 'El curso tiene lecciones de YouTube y debe mantener video de acceso gratuito.');
    }
    return (await cliente.query(`update cursos set "modalidadCobro"=$2::varchar,costo=$3,"plazoPagoMinutos"=$4,"versionCobro"="versionCobro"+1,
      "precioGeneral"=case when $2::varchar='GRATUITO' then 0 else coalesce($6, nullif("precioGeneral",0)) end
      where id=$1 and estado<>'CERRADO' and "versionCobro"=$5`,
    [id, datos.modalidadCobro, datos.costo, datos.plazoPagoMinutos, datos.versionCobro, datos.precioGeneral ?? null])).rowCount;
  });
}

type FilaCurso = Curso & { portadaDatos: DatosPortada };
const columnas = `c.id::text, c.instructor_id::text as "instructorId",
  c."modalidadCobro",c."plazoPagoMinutos",c."versionCobro",c."precioGeneral"::float8,
  u.name as "instructorNombre", c.titulo, c.descripcion, c.horas_lectivas as "horasLectivas",
  c.modalidad, c.costo::float8, c.cupos, c.tipo_certificado as "tipoCertificado", c.nota_minima as "notaMinima", c.estado,
  c.categoria,to_char(c.fecha_inicio,'YYYY-MM-DD') as "fechaInicio",to_char(c.fecha_fin,'YYYY-MM-DD') as "fechaFin",
  greatest(c.cupos-(select count(*) from inscripciones_curso ins left join "intentosInscripcion" t on t.id=ins."intentoId"
    where ins.curso_id=c.id and ins.estado<>'CANCELADA' and (ins.estado<>'PENDIENTE_PAGO' or ins."intentoId" is null or t."venceEn">clock_timestamp())),0)::int as "cuposDisponibles",
  ${columnaPortada}`;
/** Curso publicado por ID, aunque haya vencido; el catálogo público solo lista los vigentes. */
export async function obtenerCursoPublicado(id: string) {
  const { rows: [curso] } = await pool.query<FilaCurso & { vigente: boolean }>(`
    select ${columnas},(c.fecha_fin is null or c.fecha_fin >= (now() at time zone 'America/Lima')::date) as vigente
    from cursos c join users u on u.id=c.instructor_id where c.id=$1 and c.estado='PUBLICADO'`, [id]);
  return curso ? conPortada(curso) : null;
}
export async function listarCursos(instructorId?: number, catalogo = false) {
  return (await pool.query<FilaCurso>(`select ${columnas} from cursos c join users u on u.id=c.instructor_id
    where ($1::bigint is null or c.instructor_id=$1)
    and (not $2::boolean or c.estado='PUBLICADO') order by c.id desc`, [instructorId ?? null, catalogo])).rows.map(conPortada);
}
export async function obtenerCurso(id: string, usuarioId?: number) {
  const curso = (await pool.query<FilaCurso>(`select ${columnas},exists(select 1 from inscripciones_curso ins where ins.curso_id=c.id and ins.usuario_id=$2) as inscrito,(select ins.estado from inscripciones_curso ins where ins.curso_id=c.id and ins.usuario_id=$2) as "estadoInscripcion" from cursos c join users u on u.id=c.instructor_id where c.id=$1`, [id, usuarioId ?? null])).rows[0];
  if (!curso) return null;
  const modulos = (await pool.query<{ id: string; titulo: string; orden: number }>('select id::text,titulo,orden from modulos_curso where curso_id=$1 order by orden', [id])).rows;
  const materiales = (await pool.query<{ id: string; moduloId: string; titulo: string; tipo: string; url: string | null }>(`
    select a.id::text,a.modulo_id::text as "moduloId",a.titulo,a.tipo,a.url from materiales_curso a
    join modulos_curso m on m.id=a.modulo_id where m.curso_id=$1
    and not exists(select 1 from "leccionesYoutube" l where l."materialVideoId"=a.id or l."materialPdfId"=a.id)
    order by a.id`, [id])).rows;
  const miInscripcion=usuarioId===undefined ? null : await obtenerMiInscripcion(id,usuarioId);
  const estadoInscripcion=miInscripcion?.estado ?? curso.estadoInscripcion;
  return { ...conPortada(curso),estadoInscripcion,inscrito:!!curso.inscrito && estadoInscripcion!=='CANCELADA',miInscripcion,
    sesiones: await listarSesiones(id, usuarioId), modulos: modulos.map(modulo => ({ ...modulo, materiales: materiales.filter(a => a.moduloId === modulo.id) })) };
}
export async function obtenerMiInscripcion(cursoId:string,usuarioId:number) {
  return (await pool.query(`select t.id as "intentoId",t."modalidadCobro",t."importeCentimos"::float8,t.moneda,t."versionCobro",t."plazoPagoMinutos",t."tipoPrecio",
    t."inscritoEn",t."venceEn",t."pagoId"::text,e.estado as "estadoEntrega",
    case when i.estado='PENDIENTE_PAGO' and t."venceEn"<=clock_timestamp() then 'CANCELADA' else i.estado end as estado,
    case when p.estado='PAGADO' then 'PAGADO' when i.estado='CANCELADA' or (i.estado='PENDIENTE_PAGO' and t."venceEn"<=clock_timestamp()) then 'VENCIDO' when t."modalidadCobro"='GRATUITO' then 'EXENTO'
      when t."modalidadCobro"='CERTIFICADO' and t."pagoId" is null then 'NOEXIGIBLE' else 'PENDIENTE' end as "estadoFinanciero"
    from inscripciones_curso i join "intentosInscripcion" t on t.id=i."intentoId" left join "obligacionesPago" p on p.id=t."pagoId"
    left join "entregasConstancia" e on e."intentoId"=t.id
    where i.curso_id=$1 and i.usuario_id=$2`,[cursoId,usuarioId])).rows[0] ?? null;
}
/** Transacción compartida con certificados. */
export const transaccion = <T>(operacion: (cliente: PoolClient) => Promise<T>) => conTransaccion(pool, operacion);
export async function crearCurso(datos: NuevoCurso, usuarioId: number, portada?: PortadaProcesada) {
  return transaccion(async cliente => {
    // Mantiene al instructor activo mientras se crea el curso.
    const instructor = await cliente.query(`select id from users where id=$1 and role='instructor' and active for share`, [datos.instructorId]);
    if (!instructor.rowCount) return null;
    const id = (await cliente.query<{ id: string }>(`insert into cursos
      (creador_id,instructor_id,titulo,descripcion,horas_lectivas,modalidad,costo,cupos,tipo_certificado,nota_minima,categoria,fecha_inicio,fecha_fin,"modalidadCobro","plazoPagoMinutos","precioGeneral")
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id::text`,
    [usuarioId, datos.instructorId, datos.titulo, datos.descripcion, datos.horasLectivas, datos.modalidad, datos.costo, datos.cupos, datos.tipoCertificado, datos.notaMinima, datos.categoria, datos.fechaInicio, datos.fechaFin,
      datos.modalidadCobro ?? (datos.costo === 0 ? 'GRATUITO' : null), datos.plazoPagoMinutos, datos.precioGeneral ?? (datos.costo === 0 ? 0 : null)])).rows[0]!.id;
    for (const [indice, modulo] of datos.modulos.entries()) await cliente.query('insert into modulos_curso(curso_id,titulo,orden) values($1,$2,$3)', [id, modulo.titulo, indice + 1]);
    if (portada) await guardarPortada(id, portada, cliente);
    return id;
  });
}
export async function guardarMaterial(cursoId: string, moduloId: string, instructorId: number, datos: NuevoMaterial) {
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
    where m.curso_id=$1 and m.id=$2 and a.id=$3 and a.tipo='PDF'
      and not exists(select 1 from "leccionesYoutube" l where l."materialPdfId"=a.id)`, [cursoId, moduloId, materialId])).rows[0]?.archivo;
}

export async function paginaCatalogo(usuarioId: number, consulta: FiltroCatalogo, soloVigentes = false) {
  // Un solo snapshot para resultados y total; categorías fijas del Sprint 2.
  const datos = (await pool.query<{ items: FilaCurso[]; total: number }>(`with publicados as (
      select ${columnas},exists(select 1 from inscripciones_curso ins
        left join "intentosInscripcion" intento on intento.id=ins."intentoId"
        where ins.curso_id=c.id and ins.usuario_id=$6 and ins.estado<>'CANCELADA'
        and (ins.estado<>'PENDIENTE_PAGO' or intento."venceEn" is null or intento."venceEn">clock_timestamp())) as inscrito
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
  return { ...datos, items: datos.items.map(conPortada), categorias: [...categoriasCatalogo], pagina: consulta.pagina, tamanoPagina: consulta.tamanoPagina, totalPaginas: Math.ceil(datos.total / consulta.tamanoPagina) };
}
