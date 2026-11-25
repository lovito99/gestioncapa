import type { BorradorEvaluacion, CursoEvaluacion, EncabezadoEvaluacion, Evaluacion, EvaluacionPublicada, LeccionEvaluacion, PoliticaEvaluacion, PreguntaEvaluacion, ResumenIntentos } from '../../entities/evaluaciones/evaluacion.js';
import type { PoolClient } from 'pg';
import { pool, type Consultor } from '../../shared/database.js';
import { conTransaccion } from '../../shared/transaccion.js';

export type ClienteEvaluaciones = PoolClient;

export async function leerPolitica(cursoId: string) {
  const consulta = await pool.query<PoliticaEvaluacion>(
    'select nota_minima as "notaMinima", "intentosMaximos" from cursos where id=$1', [cursoId]
  );
  return consulta.rows[0];
}

export async function actualizarPolitica(cursoId: string, politica: PoliticaEvaluacion) {
  const consulta = await pool.query<PoliticaEvaluacion>(
    'update cursos set nota_minima=$2, "intentosMaximos"=$3 where id=$1 returning nota_minima as "notaMinima", "intentosMaximos"',
    [cursoId, politica.notaMinima, politica.intentosMaximos]
  );
  return consulta.rows[0];
}

const columnas = 'id::text,titulo,oficial,preguntas,"leccionesIds",lecciones,"publicadaEn","notaMinima","intentosMaximos"';

export function transaccion<T>(trabajo: (cliente: PoolClient) => Promise<T>) {
  return conTransaccion(pool, trabajo);
}

export async function bloquearCurso(cliente: Consultor, cursoId: string, exclusivo = false) {
  const consulta = await cliente.query<CursoEvaluacion>(
    `select id::text,titulo,instructor_id::text as "instructorId",modalidad,estado,
       nota_minima as "notaMinima","intentosMaximos" from cursos where id=$1
       ${exclusivo ? 'for update' : 'for share'}`, [cursoId]
  );
  return consulta.rows[0];
}

export async function listarGestion(cliente: Consultor, cursoId: string) {
  const consulta = await cliente.query<Evaluacion>(
    `select ${columnas} from evaluaciones where "cursoId"=$1 order by id`, [cursoId]
  );
  return consulta.rows;
}

export async function buscarEvaluacion(cliente: Consultor, cursoId: string, evaluacionId: string) {
  const consulta = await cliente.query<Evaluacion>(
    `select ${columnas} from evaluaciones where "cursoId"=$1 and id=$2`, [cursoId, evaluacionId]
  );
  return consulta.rows[0];
}

export async function videosDelCurso(cliente: Consultor, cursoId: string) {
  const consulta = await cliente.query<LeccionEvaluacion>(
    `select material.id::text,material.titulo,modulo.titulo as modulo,material.url
     from modulos_curso modulo join materiales_curso material on material.modulo_id=modulo.id
     where modulo.curso_id=$1 and material.tipo='VIDEO'
     order by modulo.orden,material.id`, [cursoId]
  );
  return consulta.rows;
}

type DatosBorrador = Omit<BorradorEvaluacion, 'preguntas'> & { preguntas: PreguntaEvaluacion[] };

export async function insertarBorrador(cliente: Consultor, cursoId: string, datos: DatosBorrador) {
  const consulta = await cliente.query<Evaluacion>(
    `insert into evaluaciones ("cursoId",titulo,oficial,preguntas,"leccionesIds")
     values($1,$2,$3,$4,$5) returning ${columnas}`,
    [cursoId, datos.titulo, datos.oficial, JSON.stringify(datos.preguntas), datos.leccionesIds]
  );
  return consulta.rows[0]!;
}

export async function editarBorrador(cliente: Consultor, cursoId: string, evaluacionId: string, datos: DatosBorrador) {
  const consulta = await cliente.query<Evaluacion>(
    `update evaluaciones set titulo=$3,oficial=$4,preguntas=$5,"leccionesIds"=$6
     where "cursoId"=$1 and id=$2 and "publicadaEn" is null returning ${columnas}`,
    [cursoId, evaluacionId, datos.titulo, datos.oficial, JSON.stringify(datos.preguntas), datos.leccionesIds]
  );
  return consulta.rows[0];
}

export async function existeEvaluacionOficialPublicada(cliente: Consultor, cursoId: string) {
  return Boolean((await cliente.query(
    'select 1 from evaluaciones where "cursoId"=$1 and oficial and "publicadaEn" is not null', [cursoId]
  )).rowCount);
}

export async function publicarEvaluacion(cliente: Consultor, curso: CursoEvaluacion, evaluacionId: string, lecciones: LeccionEvaluacion[]) {
  const consulta = await cliente.query<Evaluacion>(
    `update evaluaciones set "publicadaEn"=now(),"notaMinima"=$3,"intentosMaximos"=$4,lecciones=$5
     where "cursoId"=$1 and id=$2 and "publicadaEn" is null returning ${columnas}`,
    [curso.id, evaluacionId, curso.notaMinima, curso.intentosMaximos, JSON.stringify(lecciones)]
  );
  return consulta.rows[0]!;
}

type ResultadoOficial = { nota: number | null; aprobado: boolean; avanceCompleto: boolean };

export async function consultarResultadosOficiales(cliente: Consultor, cursoId: string, usuarios: string[]) {
  if (usuarios.length === 0) return new Map<string, ResultadoOficial>();
  const consulta = await cliente.query<ResultadoOficial & { usuarioId: string }>(
    `select persona.id::text as "usuarioId", mejor.nota,
       coalesce(mejor.nota >= evaluacion."notaMinima",false) as aprobado,
       (curso.modalidad <> 'GRABADO' or (jsonb_array_length(evaluacion.lecciones) > 0 and not exists (
         select 1 from jsonb_array_elements(evaluacion.lecciones) leccion
         where not exists (select 1 from "avanceLecciones" avance
           where avance."evaluacionId"=evaluacion.id and avance."usuarioId"=persona.id
             and avance."leccionId"=(leccion->>'id')::bigint)
       ))) as "avanceCompleto"
     from evaluaciones evaluacion join cursos curso on curso.id=evaluacion."cursoId"
     cross join unnest($2::bigint[]) persona(id)
     left join lateral (
       select intento.nota from "intentosEvaluacion" intento
       where intento."evaluacionId"=evaluacion.id and intento."usuarioId"=persona.id
       order by intento.nota desc,intento.numero limit 1
     ) mejor on true
     where curso.id=$1 and evaluacion.oficial and evaluacion."publicadaEn" is not null`,
    [cursoId, usuarios]
  );
  return new Map(consulta.rows.map(({ usuarioId, ...resultado }) => [usuarioId, resultado]));
}

export async function consultarResultadoOficial(cliente: Consultor, cursoId: string, usuarioId: string) {
  return (await consultarResultadosOficiales(cliente, cursoId, [usuarioId])).get(usuarioId) ?? null;
}

export async function inscripcionVigente(
  cliente: Consultor, cursoId: string, usuarioId: number, escritura: boolean
) {
  const consulta = await cliente.query<{ estado: string }>(
    `select estado from inscripciones_curso where curso_id=$1 and usuario_id=$2
     ${escritura ? 'for update' : 'for share'}`, [cursoId, usuarioId]
  );
  const inscripcion = consulta.rows[0];
  if (!inscripcion) return undefined;

  const acceso = await cliente.query<{ vigente: boolean; certificado: boolean }>(
    `select "tieneAccesoCurso"($1,$2) as vigente,
      (exists(select 1 from certificados_curso where curso_id=$1 and usuario_id=$2)
       or exists(select 1 from "entregasConstancia" where "cursoId"=$1 and "usuarioId"=$2)) as certificado`,
    [cursoId, usuarioId]
  );
  const { vigente, certificado } = acceso.rows[0]!;
  return vigente ? { finalizada: inscripcion.estado === 'TERMINADO' || certificado } : undefined;
}

export async function listarPublicadas(cliente: Consultor, cursoId: string) {
  const consulta = await cliente.query<EncabezadoEvaluacion>(
    `select id::text,titulo,oficial,"publicadaEn","notaMinima","intentosMaximos",lecciones
     from evaluaciones where "cursoId"=$1 and "publicadaEn" is not null order by id`, [cursoId]
  );
  return consulta.rows;
}

export async function buscarPublicada(cliente: Consultor, cursoId: string, evaluacionId: string) {
  const consulta = await cliente.query<EvaluacionPublicada>(
    `select ${columnas} from evaluaciones
     where "cursoId"=$1 and id=$2 and "publicadaEn" is not null`, [cursoId, evaluacionId]
  );
  return consulta.rows[0];
}

export async function leccionesCompletadas(cliente: Consultor, cursoId: string, usuarioId: number) {
  const consulta = await cliente.query<{ id: string }>(
    'select "leccionId"::text as id from "avanceLecciones" where "cursoId"=$1 and "usuarioId"=$2',
    [cursoId, usuarioId]
  );
  return new Set(consulta.rows.map(({ id }) => id));
}

export async function completarLeccion(
  cliente: Consultor, cursoId: string, usuarioId: number, evaluacionId: string, leccionId: string
) {
  await cliente.query(
    `insert into "avanceLecciones" ("cursoId","usuarioId","evaluacionId","leccionId")
     values($1,$2,$3,$4) on conflict do nothing`, [cursoId, usuarioId, evaluacionId, leccionId]
  );
}

export async function resumirIntentos(cliente: Consultor, cursoId: string, usuarioId: number) {
  const consulta = await cliente.query<ResumenIntentos & { evaluacionId: string }>(
    `select "evaluacionId"::text as "evaluacionId",max(nota) as "mejorNota",count(*)::int as "intentosUsados"
     from "intentosEvaluacion" where "cursoId"=$1 and "usuarioId"=$2 group by "evaluacionId"`,
    [cursoId, usuarioId]
  );
  return new Map(consulta.rows.map(({ evaluacionId, ...resumen }) => [evaluacionId, resumen]));
}

export async function buscarOperacion(cliente: Consultor, evaluacionId: string, usuarioId: number, operacionId: string) {
  const consulta = await cliente.query<{ respuestasHash: string; nota: number }>(
    'select "respuestasHash",nota from "intentosEvaluacion" where "evaluacionId"=$1 and "usuarioId"=$2 and "operacionId"=$3',
    [evaluacionId, usuarioId, operacionId]
  );
  return consulta.rows[0];
}

type IntentoCalificado = {
  cursoId: string; usuarioId: number; evaluacionId: string;
  operacionId: string; respuestasHash: string; numero: number; nota: number;
};

export async function guardarIntento(cliente: Consultor, intento: IntentoCalificado) {
  await cliente.query(
    `insert into "intentosEvaluacion" ("cursoId","usuarioId","evaluacionId","operacionId","respuestasHash",numero,nota)
     values($1,$2,$3,$4,$5,$6,$7)`,
    [intento.cursoId, intento.usuarioId, intento.evaluacionId, intento.operacionId, intento.respuestasHash, intento.numero, intento.nota]
  );
}
