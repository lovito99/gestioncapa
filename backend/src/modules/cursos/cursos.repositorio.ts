import { categoriasCatalogo } from './cursos.categorias.js';
import { listarSesiones } from './sesiones.repositorio.js';
import type { PoolClient } from 'pg';
import { pool } from '../../shared/database.js';
import type { ConsultaCatalogo, DatosCurso, DatosMaterial } from './cursos.validacion.js';
import type { PoliticaCobro, TipoPrecio } from './cursos.cobro.js';
import { aCentimos } from './cursos.cobro.js';
import { randomUUID } from 'node:crypto';
import { crearObligacion } from '../pagos/pagos.repositorio.js';
import { cancelarReservasVencidas } from './inscripciones.vencimiento.js';
import { env } from '../../config/env.js';
import { cotizarInscripcion } from './precioInscripcion.js';

export async function actualizarCobro(id: string, datos: PoliticaCobro & { versionCobro: number }) {
  return (await pool.query(`update cursos set "modalidadCobro"=$2::varchar,costo=$3,"plazoPagoMinutos"=$4,"versionCobro"="versionCobro"+1,
    "precioGeneral"=case when $2::varchar='GRATUITO' then 0 else coalesce($6, nullif("precioGeneral",0)) end
    where id=$1 and estado<>'CERRADO' and "versionCobro"=$5`,
  [id, datos.modalidadCobro, datos.costo, datos.plazoPagoMinutos, datos.versionCobro, datos.precioGeneral ?? null])).rowCount;
}

export type Curso = {
  modalidadCobro: 'PREVIO' | 'CERTIFICADO' | 'GRATUITO' | null; plazoPagoMinutos: number | null; versionCobro: number;
  precioGeneral: number | null;
  id: string; instructorId: string; instructorNombre: string;
  titulo: string; descripcion: string; horasLectivas: number; modalidad: string; costo: number;
  categoria: string; fechaInicio: string | null; fechaFin: string | null; cuposDisponibles: number; inscrito?: boolean;
  estadoInscripcion?: 'EN_CURSO' | 'TERMINADO' | 'PENDIENTE_PAGO' | 'CANCELADA' | null;
  cupos: number; tipoCertificado: string; notaMinima: number; estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO';
};
const columnas = `c.id::text, c.instructor_id::text as "instructorId",
  c."modalidadCobro",c."plazoPagoMinutos",c."versionCobro",c."precioGeneral"::float8,
  u.name as "instructorNombre", c.titulo, c.descripcion, c.horas_lectivas as "horasLectivas",
  c.modalidad, c.costo::float8, c.cupos, c.tipo_certificado as "tipoCertificado", c.nota_minima as "notaMinima", c.estado,
  c.categoria,to_char(c.fecha_inicio,'YYYY-MM-DD') as "fechaInicio",to_char(c.fecha_fin,'YYYY-MM-DD') as "fechaFin",
  greatest(c.cupos-(select count(*) from inscripciones_curso ins left join "intentosInscripcion" t on t.id=ins."intentoId"
    where ins.curso_id=c.id and ins.estado<>'CANCELADA' and (ins.estado<>'PENDIENTE_PAGO' or ins."intentoId" is null or t."venceEn">clock_timestamp())),0)::int as "cuposDisponibles"`;
const cursoVigente = "(c.fecha_fin is null or c.fecha_fin >= (now() at time zone 'America/Lima')::date)";

export async function obtenerCursoPublicado(id: string) {
  const { rows } = await pool.query<Curso & { vigente: boolean }>(`
    select ${columnas}, ${cursoVigente} as vigente
    from cursos c join users u on u.id=c.instructor_id
    where c.id=$1 and c.estado='PUBLICADO'`, [id]);
  return rows[0] ?? null;
}

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
  const miInscripcion=usuarioId===undefined ? null : await obtenerMiInscripcion(id,usuarioId);
  const estadoInscripcion=miInscripcion?.estado ?? curso.estadoInscripcion;
  return { ...curso,estadoInscripcion,inscrito:!!curso.inscrito && estadoInscripcion!=='CANCELADA',miInscripcion,
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
      (creador_id,instructor_id,titulo,descripcion,horas_lectivas,modalidad,costo,cupos,tipo_certificado,nota_minima,categoria,fecha_inicio,fecha_fin,"modalidadCobro","plazoPagoMinutos","precioGeneral")
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id::text`,
    [usuarioId, datos.instructorId, datos.titulo, datos.descripcion, datos.horasLectivas, datos.modalidad, datos.costo, datos.cupos, datos.tipoCertificado, datos.notaMinima, datos.categoria, datos.fechaInicio, datos.fechaFin,
      datos.modalidadCobro ?? (datos.costo === 0 ? 'GRATUITO' : null), datos.plazoPagoMinutos, datos.precioGeneral ?? (datos.costo === 0 ? 0 : null)])).rows[0]!.id;
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
      select ${columnas},exists(select 1 from inscripciones_curso ins
        left join "intentosInscripcion" intento on intento.id=ins."intentoId"
        where ins.curso_id=c.id and ins.usuario_id=$6 and ins.estado<>'CANCELADA'
        and (ins.estado<>'PENDIENTE_PAGO' or intento."venceEn" is null or intento."venceEn">clock_timestamp())) as inscrito
      from cursos c join users u on u.id=c.instructor_id where c.estado='PUBLICADO'
      and (not $7::boolean or ${cursoVigente})
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

export async function inscribirseEnCurso(cursoId: string, usuarioId: number, versionCobro?: number, tipoPrecio?: TipoPrecio) {
  return transaccion(async cliente => {
    // El bloqueo del curso serializa todas las solicitudes a la última plaza.
    const curso = (await cliente.query<Curso>('select estado,cupos,costo::float8 as costo,"precioGeneral"::float8,"modalidadCobro","plazoPagoMinutos","versionCobro" from cursos where id=$1 for update', [cursoId])).rows[0];
    if (!curso) return 'NO_EXISTE' as const;
    const persona = (await cliente.query<{ dni: string | null }>(`select dni from users where id=$1 and active and role='agremiado' for share`, [usuarioId])).rows[0];
    if (!persona) return 'SIN_PERMISO' as const;
    if (curso.estado !== 'PUBLICADO') return 'NO_PUBLICADO' as const;
    await cancelarReservasVencidas(cliente,cursoId);
    const inscripcion = (await cliente.query<{ estado: string }>('select estado from inscripciones_curso where curso_id=$1 and usuario_id=$2', [cursoId, usuarioId])).rows[0];
    if (inscripcion && inscripcion.estado!=='CANCELADA') return inscripcion.estado === 'TERMINADO' ? 'YA_TERMINADO' as const : inscripcion.estado === 'PENDIENTE_PAGO' ? 'YA_PENDIENTE' as const : 'YA_INSCRITO' as const;
    if (!curso.modalidadCobro && curso.costo===0) curso.modalidadCobro='GRATUITO';
    if (!curso.modalidadCobro) return 'COBRO_NO_CONFIGURADO' as const;
    if ((versionCobro!==undefined && versionCobro!==curso.versionCobro) || (curso.modalidadCobro!=='GRATUITO' && versionCobro===undefined)) return 'COBRO_MODIFICADO' as const;
    let importe = curso.costo;
    let tarifa: TipoPrecio | null = null;
    if (env.inscripcionExternaHabilitada) {
      const cotizacion = await cotizarInscripcion(cliente, curso, usuarioId, persona.dni);
      if ('impedimentoInscripcion' in cotizacion) return cotizacion.impedimentoInscripcion;
      if (tipoPrecio !== cotizacion.miPrecio.tipo || versionCobro === undefined) return 'COBRO_MODIFICADO' as const;
      importe = cotizacion.miPrecio.importe;
      tarifa = cotizacion.miPrecio.tipo;
    } else if (tipoPrecio !== undefined) {
      return 'COBRO_MODIFICADO' as const;
    }
    const inscritos = (await cliente.query<{ total: number }>(`select count(*)::int as total from inscripciones_curso where curso_id=$1 and estado<>'CANCELADA'`, [cursoId])).rows[0]!.total;
    if (inscritos >= curso.cupos) return 'SIN_CUPOS' as const;
    const pendiente = curso.modalidadCobro === 'PREVIO';
    const intentoId=randomUUID();
    const importeCentimos = aCentimos(importe);
    await cliente.query(`with instante as(select clock_timestamp() as ahora)
      insert into "intentosInscripcion"(id,"cursoId","usuarioId","modalidadCobro","importeCentimos","versionCobro","plazoPagoMinutos","inscritoEn","venceEn",estado,"tipoPrecio")
      select $1,$2,$3,$4,$5,$6,$7,ahora,case when $7::int is not null then ahora+make_interval(mins=>$7) else null end,$8,$9 from instante`,
    [intentoId,cursoId,usuarioId,curso.modalidadCobro,importeCentimos,curso.versionCobro,curso.plazoPagoMinutos,pendiente?'PENDIENTE_PAGO':'EN_CURSO',tarifa]);
    await cliente.query(`insert into inscripciones_curso(curso_id,usuario_id,estado,"intentoId") values($1,$2,$3,$4)
      on conflict(curso_id,usuario_id) do update set estado=excluded.estado,"intentoId"=excluded."intentoId",inscrito_en=clock_timestamp(),terminado_en=null`,
    [cursoId,usuarioId,pendiente?'PENDIENTE_PAGO':'EN_CURSO',intentoId]);
    if (pendiente) {
      const pago=await crearObligacion(cliente,{cursoId,usuarioId,intentoId,concepto:'CURSO',importeCentimos,moneda:'PEN'});
      await cliente.query('update "intentosInscripcion" set "pagoId"=$2 where id=$1',[intentoId,pago.id]);
    }
    if (!pendiente) await cliente.query(`insert into enrollments(class_id,user_id)
      select id,$2 from classes where curso_id=$1 and estado='PROGRAMADA'
      on conflict(class_id,user_id) do nothing`, [cursoId, usuarioId]);
    return pendiente ? 'INSCRITO_PENDIENTE' as const : 'INSCRITO' as const;
  });
}
