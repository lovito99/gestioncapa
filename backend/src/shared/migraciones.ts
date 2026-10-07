import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool, PoolClient } from "pg";

/** backend/migraciones, tanto desde src/ (tsx) como desde dist/ (build). */
export const CARPETA_MIGRACIONES = new URL("../../migraciones/", import.meta.url);

export type ArchivoMigracion = {
  version: string;
  nombre: string;
  checksum: string;
  sql: string;
};

type MigracionAplicada = Pick<ArchivoMigracion, "version" | "nombre" | "checksum">;

export class MigracionError extends Error {
  constructor(
    readonly problemas: string[],
    encabezado = "Las migraciones de la base de datos no son coherentes:"
  ) {
    super([encabezado, ...problemas.map((problema) => `  - ${problema}`)].join("\n"));
    this.name = "MigracionError";
  }
}

// Se conserva la lectura del historial antiguo; los archivos nuevos usan camelCase.
const nombreValido = /^(\d{4})(?:_[a-z0-9_]+|-[a-zA-Z0-9]+)\.sql$/;

// Clave del bloqueo consultivo: serializa los `migrate` simultáneos.
const BLOQUEO = 727_100_001;

const REGISTRO = `
  create table if not exists schema_migrations (
    version varchar(4) primary key,
    nombre text not null,
    checksum char(64) not null,
    aplicada_en timestamptz not null default now()
  )
`;

const aRuta = (carpeta: string | URL) => (typeof carpeta === "string" ? carpeta : fileURLToPath(carpeta));

/** Lee las migraciones en orden. El checksum ignora la diferencia CRLF/LF. */
export async function leerMigraciones(carpeta: string | URL = CARPETA_MIGRACIONES): Promise<ArchivoMigracion[]> {
  const ruta = aRuta(carpeta);
  const nombres = (await readdir(ruta)).filter((nombre) => nombre.endsWith(".sql")).sort();
  const invalidos = nombres.filter((nombre) => !nombreValido.test(nombre));

  if (invalidos.length > 0) {
    throw new MigracionError(
      invalidos.map((nombre) => `${nombre}: nombre inválido. Usa NNNN-descripcionEnCamelCase.sql.`)
    );
  }

  return Promise.all(
    nombres.map(async (nombre) => {
      const sql = (await readFile(join(ruta, nombre), "utf8")).replace(/\r\n/g, "\n");
      return {
        version: nombre.slice(0, 4),
        nombre,
        checksum: createHash("sha256").update(sql).digest("hex"),
        sql
      };
    })
  );
}

/** Decide qué falta aplicar; falla si el historial y los archivos no coinciden. */
export function planificar(archivos: ArchivoMigracion[], aplicadas: MigracionAplicada[]): ArchivoMigracion[] {
  const problemas: string[] = [];
  const porVersion = new Map<string, ArchivoMigracion[]>();

  for (const archivo of archivos) {
    porVersion.set(archivo.version, [...(porVersion.get(archivo.version) ?? []), archivo]);
  }

  for (const [version, mismos] of porVersion) {
    if (mismos.length > 1) {
      problemas.push(`La versión ${version} está repetida: ${mismos.map((m) => m.nombre).join(", ")}. Renumera una de ellas.`);
    }
  }

  for (const aplicada of aplicadas) {
    const archivo = porVersion.get(aplicada.version)?.[0];

    if (!archivo) {
      problemas.push(`${aplicada.nombre} ya se aplicó, pero su archivo no existe.`);
    } else if (archivo.checksum !== aplicada.checksum) {
      problemas.push(
        `${archivo.nombre} cambió después de aplicarse. No edites una migración aplicada: crea una nueva con npm run migrate:nueva.`
      );
    }
  }

  const versionesAplicadas = new Set(aplicadas.map((m) => m.version));
  const ultima = aplicadas.map((m) => m.version).sort().at(-1);
  const pendientes = archivos
    .filter((archivo) => !versionesAplicadas.has(archivo.version))
    .sort((a, b) => a.version.localeCompare(b.version));

  for (const pendiente of pendientes) {
    if (ultima && pendiente.version < ultima) {
      problemas.push(
        `${pendiente.nombre} es anterior a la última migración aplicada (${ultima}). Renumera este archivo con un número mayor.`
      );
    }
  }

  if (problemas.length > 0) {
    throw new MigracionError(problemas);
  }

  return pendientes;
}

/** Continúa el historial: "Agregar Campo" → 0005-agregarCampo.sql. */
export function nombreMigracionNueva(existentes: string[], descripcion: string) {
  const palabras = descripcion
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
  const limpia = palabras.map((palabra, indice) =>
    indice === 0 ? palabra : palabra[0]!.toUpperCase() + palabra.slice(1)
  ).join("");

  if (!limpia) {
    throw new Error("Indica una descripción, por ejemplo: npm run migrate:nueva -- agregar campo");
  }

  const ultima = existentes
    .map((nombre) => nombreValido.exec(nombre)?.[1])
    .filter((version): version is string => version !== undefined)
    .map(Number)
    .reduce((mayor, version) => Math.max(mayor, version), 0);

  return `${String(ultima + 1).padStart(4, "0")}-${limpia}.sql`;
}

async function leerAplicadas(cliente: Pick<PoolClient, "query">) {
  const existe = await cliente.query<{ tabla: string | null }>("select to_regclass('public.schema_migrations') as tabla");

  if (!existe.rows[0]?.tabla) {
    return [];
  }

  const resultado = await cliente.query<MigracionAplicada>(
    "select version, nombre, checksum from schema_migrations order by version"
  );
  return resultado.rows;
}

/**
 * Aplica las migraciones pendientes, cada una en su transacción, bajo un bloqueo
 * consultivo. Devuelve los nombres aplicados (vacío si la base estaba al día).
 */
export async function migrar(pool: Pool, carpeta: string | URL = CARPETA_MIGRACIONES) {
  const archivos = await leerMigraciones(carpeta);
  const cliente = await pool.connect();

  try {
    await cliente.query("select pg_advisory_lock($1)", [BLOQUEO]);
    await cliente.query(REGISTRO);
    const pendientes = planificar(archivos, await leerAplicadas(cliente));
    const aplicadas: string[] = [];

    for (const migracion of pendientes) {
      try {
        await cliente.query("begin");
        await cliente.query(migracion.sql);
        await cliente.query("insert into schema_migrations (version, nombre, checksum) values ($1, $2, $3)", [
          migracion.version,
          migracion.nombre,
          migracion.checksum
        ]);
        await cliente.query("commit");
        aplicadas.push(migracion.nombre);
      } catch (error) {
        await cliente.query("rollback");
        throw new Error(`Falló la migración ${migracion.nombre}; no se aplicó: ${(error as Error).message}`, {
          cause: error
        });
      }
    }

    return aplicadas;
  } finally {
    await cliente.query("select pg_advisory_unlock($1)", [BLOQUEO]).catch(() => undefined);
    cliente.release();
  }
}

export async function estadoMigraciones(pool: Pool, carpeta: string | URL = CARPETA_MIGRACIONES) {
  const archivos = await leerMigraciones(carpeta);
  const aplicadas = await leerAplicadas(pool);
  return { aplicadas: aplicadas.map((m) => m.nombre), pendientes: planificar(archivos, aplicadas).map((m) => m.nombre) };
}

/** Para el arranque del servidor: no migra, solo exige que la base esté al día. */
export async function verificarMigraciones(pool: Pool, carpeta: string | URL = CARPETA_MIGRACIONES) {
  const { pendientes } = await estadoMigraciones(pool, carpeta);

  if (pendientes.length > 0) {
    throw new MigracionError(
      [...pendientes, "Ejecuta npm run migrate antes de iniciar el servidor."],
      "La base de datos tiene migraciones pendientes:"
    );
  }
}
