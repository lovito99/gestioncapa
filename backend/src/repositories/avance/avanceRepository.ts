import type { PoolClient } from 'pg';
import type { ConfiguracionUnidad, CursoAvance, MaterialAvance, ProgresoUnidad, UnidadAvance } from '../../entities/avance/avance.js';
import { pool } from '../../shared/database.js';
import { conTransaccion } from '../../shared/transaccion.js';

export type ClienteAvance = PoolClient;

export function transaccion<T>(trabajo: (cliente: ClienteAvance) => Promise<T>) {
  return conTransaccion(pool, trabajo);
}

export async function buscarCurso(cliente: ClienteAvance, cursoId: string, escritura: boolean) {
  const { rows } = await cliente.query<CursoAvance>(
    `select id::text,titulo,modalidad,estado,instructor_id::text as "instructorId","avanceMedido" as medido
     from cursos where id=$1 ${escritura ? 'for update' : 'for share'}`, [cursoId]
  );
  return rows[0];
}

export async function tieneInscripcion(cliente: ClienteAvance, cursoId: string, usuarioId: string, escritura: boolean) {
  const inscripcion = await cliente.query(
    `select 1 from inscripciones_curso where curso_id=$1 and usuario_id=$2 ${escritura ? 'for update' : 'for share'}`,
    [cursoId, usuarioId]
  );
  if (!inscripcion.rowCount) return false;
  const { rows } = await cliente.query<{ acceso: boolean }>(
    'select "tieneAccesoCurso"($1,$2) as acceso', [cursoId, usuarioId]
  );
  return rows[0]!.acceso;
}

const columnas = `a.id::text,a.modulo_id::text as "moduloId",m.titulo as modulo,a.titulo,a.tipo,a.url,
  a.obligatorio,a."duracionMs",a."versionContenido" as version`;
const materiales = `from materiales_curso a join modulos_curso m on m.id=a.modulo_id
  and not exists(select 1 from "leccionesYoutube" l where l."materialVideoId"=a.id or l."materialPdfId"=a.id)`;

export async function listarMateriales(cliente: ClienteAvance, cursoId: string) {
  const { rows } = await cliente.query<MaterialAvance>(
    `select ${columnas} ${materiales} where m.curso_id=$1 order by m.orden,a.id`, [cursoId]
  );
  return rows;
}

export async function buscarMaterial(cliente: ClienteAvance, cursoId: string, materialId: string) {
  const { rows } = await cliente.query<MaterialAvance>(
    `select ${columnas} ${materiales} where m.curso_id=$1 and a.id=$2`, [cursoId, materialId]
  );
  return rows[0];
}

export async function listarAvance(cliente: ClienteAvance, cursoId: string, usuarioId: string) {
  const { rows } = await cliente.query<UnidadAvance>(
    `select ${columnas},coalesce(progreso."vistoMs",0) as "vistoMs",coalesce(progreso."posicionMs",0) as "posicionMs",
       finalizacion."completadaEn"
     ${materiales}
     left join "avanceContenido" progreso on progreso."cursoId"=m.curso_id and progreso."usuarioId"=$2
       and progreso."materialId"=a.id and progreso.version=a."versionContenido"
     left join "finalizacionesContenido" finalizacion on finalizacion."cursoId"=m.curso_id
       and finalizacion."usuarioId"=$2 and finalizacion."materialId"=a.id
     where m.curso_id=$1 order by m.orden,a.id`, [cursoId, usuarioId]
  );
  return rows;
}

export async function actualizarMaterial(cliente: ClienteAvance, material: MaterialAvance, datos: ConfiguracionUnidad) {
  const cambiarVersion = datos.duracionMs !== material.duracionMs;
  const { rows } = await cliente.query<{ version: number }>(
    `update materiales_curso set obligatorio=$2,"duracionMs"=$3,"versionContenido"="versionContenido"+$4
     where id=$1 returning "versionContenido" as version`,
    [material.id, datos.obligatorio, datos.duracionMs, cambiarVersion ? 1 : 0]
  );
  return { ...material, ...datos, version: rows[0]!.version };
}

export async function tieneMediciones(cliente: ClienteAvance, cursoId: string, materialId: string) {
  return Boolean((await cliente.query(
    'select 1 from "avanceContenido" where "cursoId"=$1 and "materialId"=$2 and "vistoMs">0 limit 1',
    [cursoId, materialId]
  )).rowCount);
}

export async function videosSalidaPrevia(cliente: ClienteAvance, cursoId: string) {
  const { rows } = await cliente.query<{ id: string; url: string }>(
    `select leccion->>'id' as id,leccion->>'url' as url from evaluaciones
     cross join lateral jsonb_array_elements(lecciones) leccion
     where "cursoId"=$1 and oficial and "publicadaEn" is not null`, [cursoId]
  );
  return rows;
}

export async function activarCurso(cliente: ClienteAvance, cursoId: string) {
  await cliente.query('update cursos set "avanceMedido"=true where id=$1', [cursoId]);
}

export async function marcarUnidad(cliente: ClienteAvance, cursoId: string, usuarioId: string, material: MaterialAvance) {
  const { rows } = await cliente.query<ProgresoUnidad>(
    `insert into "avanceContenido" ("cursoId","usuarioId","materialId",version,"completadaEn")
     values($1,$2,$3,$4,clock_timestamp())
     on conflict ("cursoId","usuarioId","materialId",version) do update
       set "completadaEn"=coalesce("avanceContenido"."completadaEn", excluded."completadaEn")
     returning "vistoMs","posicionMs","completadaEn"`, [cursoId, usuarioId, material.id, material.version]
  );
  return rows[0]!;
}

export async function estadoUnidad(cliente: ClienteAvance, cursoId: string, usuarioId: string, material: MaterialAvance) {
  const { rows } = await cliente.query<ProgresoUnidad>(
    `select coalesce(progreso."vistoMs",0) as "vistoMs",coalesce(progreso."posicionMs",0) as "posicionMs",
       finalizacion."completadaEn"
     from (select 1) unidad
     left join "avanceContenido" progreso on progreso."cursoId"=$1 and progreso."usuarioId"=$2
       and progreso."materialId"=$3 and progreso.version=$4
     left join "finalizacionesContenido" finalizacion on finalizacion."cursoId"=$1 and finalizacion."usuarioId"=$2
       and finalizacion."materialId"=$3`, [cursoId, usuarioId, material.id, material.version]
  );
  return rows[0]!;
}

export async function iniciarSesion(cliente: ClienteAvance, cursoId: string, usuarioId: string, material: MaterialAvance,
  sesionId: string, vistoMs: number) {
  await cliente.query(
    `insert into "sesionesAvance" ("cursoId","usuarioId","materialId",version,id,"inicioAcreditadoMs")
     values ($1,$2,$3,$4,$5,$6)
     on conflict ("cursoId","usuarioId") do update set "materialId"=excluded."materialId",version=excluded.version,
       id=excluded.id,"inicioAcreditadoMs"=excluded."inicioAcreditadoMs",secuencia=0,
       "iniciadaEn"=excluded."iniciadaEn","observadaEn"=excluded."observadaEn"`,
    [cursoId, usuarioId, material.id, material.version, sesionId, vistoMs]
  );
}

export async function buscarSesion(cliente: ClienteAvance, cursoId: string, usuarioId: string, material: MaterialAvance, sesionId: string) {
  const { rows } = await cliente.query<{ secuencia: number; desdeInicioMs: number; desdeReporteMs: number; inicioAcreditadoMs: number }>(
    `select secuencia,"inicioAcreditadoMs",
       greatest(0,extract(epoch from (clock_timestamp()-"iniciadaEn"))*1000)::float8 as "desdeInicioMs",
       greatest(0,extract(epoch from (clock_timestamp()-"observadaEn"))*1000)::float8 as "desdeReporteMs"
     from "sesionesAvance" where "cursoId"=$1 and "usuarioId"=$2 and "materialId"=$3 and version=$4 and id=$5`,
    [cursoId, usuarioId, material.id, material.version, sesionId]
  );
  return rows[0];
}

export async function guardarReproduccion(cliente: ClienteAvance, cursoId: string, usuarioId: string, material: MaterialAvance,
  datos: { sesionId: string; secuencia: number; vistoMs: number; posicionMs: number; completa: boolean }) {
  await cliente.query(
    `insert into "avanceContenido" ("cursoId","usuarioId","materialId",version,"vistoMs","posicionMs","completadaEn")
     values ($1,$2,$3,$4,$5,$6,case when $7 then clock_timestamp() end)
     on conflict ("cursoId","usuarioId","materialId",version) do update
       set "vistoMs"=excluded."vistoMs","posicionMs"=excluded."posicionMs",
           "completadaEn"=coalesce("avanceContenido"."completadaEn",excluded."completadaEn")`,
    [cursoId, usuarioId, material.id, material.version, datos.vistoMs, datos.posicionMs, datos.completa]
  );
  await cliente.query('update "sesionesAvance" set secuencia=$2,"observadaEn"=clock_timestamp() where id=$1', [datos.sesionId, datos.secuencia]);
  return estadoUnidad(cliente, cursoId, usuarioId, material);
}
