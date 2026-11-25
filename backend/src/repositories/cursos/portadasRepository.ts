import type { PoolClient } from 'pg';
import { pool } from '../../shared/database.js';
import type { Curso } from '../../entities/cursos/curso.js';
import type { PortadaProcesada, VariantePortada } from '../../entities/cursos/portada.js';

/** Columna SQL con la versión y los anchos de la portada vigente; requiere el alias `c` de cursos. */
export const columnaPortada = `(select jsonb_build_object('version',p.version,'miniatura',p."anchoMiniatura",'tarjeta',p."anchoTarjeta")
  from "portadasCurso" p where p."cursoId"=c.id) as "portadaDatos"`;

export async function leerPortadaPublica(id: string, version: string, variante: VariantePortada) {
  const { rows: [portada] } = await pool.query<{ archivo: Buffer }>(`
    select case $3 when 'miniatura' then p.miniatura when 'tarjeta' then p.tarjeta else p.grande end as archivo
    from "portadasCurso" p join cursos c on c.id=p."cursoId"
    where p."cursoId"=$1 and p.version=$2 and c.estado='PUBLICADO'
  `, [id, version, variante]);
  return portada?.archivo ?? null;
}

export async function guardarPortada(id: string, portada: PortadaProcesada, conexion: Pick<PoolClient, 'query'> = pool) {
  const { version, miniatura, tarjeta, grande } = portada;
  const resultado = await conexion.query<Pick<Curso, 'estado'>>(`
    insert into "portadasCurso" ("cursoId",version,miniatura,tarjeta,grande,"anchoMiniatura","anchoTarjeta")
    select id,$2,$3,$4,$5,$6,$7 from cursos where id=$1
    on conflict ("cursoId") do update set version=excluded.version,miniatura=excluded.miniatura,
      tarjeta=excluded.tarjeta,grande=excluded.grande,
      "anchoMiniatura"=excluded."anchoMiniatura","anchoTarjeta"=excluded."anchoTarjeta"
    returning (select estado from cursos where id=$1)
  `, [id, version, miniatura.archivo, tarjeta.archivo, grande.archivo, miniatura.ancho, tarjeta.ancho]);
  return resultado.rows[0]?.estado ?? null;
}

export async function retirarPortada(id: string) {
  const { rows: [resultado] } = await pool.query<{ existe: boolean }>(`
    with retirada as (delete from "portadasCurso" where "cursoId"=$1)
    select exists(select 1 from cursos where id=$1) as existe
  `, [id]);
  return resultado!.existe;
}

export async function leerPortadaPrivada(id: string) {
  const { rows: [curso] } = await pool.query<Pick<Curso, 'estado' | 'instructorId'> & { archivo: Buffer | null }>(`
    select c.estado,c.instructor_id::text as "instructorId",p.grande as archivo
    from cursos c left join "portadasCurso" p on p."cursoId"=c.id where c.id=$1
  `, [id]);
  return curso;
}
