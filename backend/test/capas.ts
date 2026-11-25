import { existsSync, readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";

/**
 * Reglas de T-26 (docs/arquitecturaBackend.md): src/<capa>/<componente>/<archivo>.
 * Cada capa solo puede importar lo que indica `permitido`.
 */
const capas = ["controllers", "dto", "services", "repositories", "entities", "providers"] as const;
type Capa = (typeof capas)[number];

type Destino =
  | { tipo: "paquete"; nombre: string }
  | { tipo: "capa"; capa: Capa }
  | { tipo: "database" | "shared" | "plugins" | "config" | "routes" | "otroModulo" | "repositorioAjeno" | "otro" };

const raizFuentes = new URL("../src/", import.meta.url);
const esCapa = (valor: string | undefined): valor is Capa => capas.includes(valor as Capa);

function clasificar(desde: string, especificador: string): Destino {
  if (!especificador.startsWith(".")) return { tipo: "paquete", nombre: especificador };
  const ruta = posix.join(posix.dirname(desde), especificador);
  const [raiz] = ruta.split("/");
  if (ruta === "shared/database.js") return { tipo: "database" };
  if (raiz === "shared" || raiz === "plugins" || raiz === "config" || raiz === "routes") return { tipo: raiz };
  if (esCapa(raiz)) return { tipo: "capa", capa: raiz };
  // Módulos aún sin migrar: su acceso a datos se usa a través de su repositorio.
  if (raiz === "modules") return { tipo: /repositor(io|y|ies)/i.test(ruta) ? "repositorioAjeno" : "otroModulo" };
  return { tipo: "otro" };
}

/** Indica si la capa puede depender del destino; algunas dependencias solo se admiten por tipos. */
function permitido(capa: Capa, destino: Destino, soloTipos: boolean): boolean {
  const paquete = destino.tipo === "paquete" ? destino.nombre : null;
  const nativo = paquete?.startsWith("node:") ?? false;
  const capaDestino = destino.tipo === "capa" ? destino.capa : null;
  switch (capa) {
    case "controllers":
      if (paquete) return paquete === "fastify";
      if (capaDestino) return capaDestino === "dto" || capaDestino === "services" || capaDestino === "entities";
      return destino.tipo === "shared" || (destino.tipo === "plugins" && soloTipos);
    case "services":
      if (paquete) return nativo;
      if (capaDestino === "entities" || capaDestino === "services" || capaDestino === "dto") return true;
      if (capaDestino === "repositories" || capaDestino === "providers") return soloTipos;
      if (capaDestino) return false;
      return destino.tipo === "shared"
        || ((destino.tipo === "plugins" || destino.tipo === "otroModulo" || destino.tipo === "repositorioAjeno") && soloTipos);
    case "repositories":
      if (paquete) return paquete === "pg" || nativo;
      if (capaDestino) return capaDestino === "entities" || capaDestino === "repositories";
      return destino.tipo === "database" || destino.tipo === "shared" || destino.tipo === "repositorioAjeno"
        || (destino.tipo === "otroModulo" && soloTipos);
    case "dto":
      if (paquete) return paquete === "zod";
      if (capaDestino) return capaDestino === "entities" || capaDestino === "dto";
      return destino.tipo === "shared";
    case "providers":
      // Adaptadores de servicios externos (SMTP, JWT, PDF): pueden usar paquetes, no HTTP ni la base.
      if (paquete) return paquete !== "fastify" && paquete !== "pg";
      if (capaDestino) return capaDestino === "entities" || capaDestino === "providers";
      return destino.tipo === "shared";
    case "entities":
      return capaDestino === "entities" && soloTipos;
  }
}

// Entre la palabra clave y `from` no puede haber `=`, paréntesis ni plantillas: así no se confunde
// un `export const x = ...` seguido de SQL (`from "tabla"`) con una declaración de import.
const importEstatico = /(?:^|[\s;])(?:import|export)\s+(type\s+)?(?:[^'"`;=()]*?\s+from\s+)?["']([^"']+)["']/g;
const importDinamico = /import\(\s*["']([^"']+)["']\s*\)/g;

/** `archivo` es relativo a src/, por ejemplo services/usuarios/usuariosService.ts. */
export function revisarImports(archivo: string, codigo: string): string[] {
  const capa = archivo.split("/")[0];
  if (!esCapa(capa)) return [`${archivo}: no pertenece a una capa conocida`];
  const imports = [
    ...[...codigo.matchAll(importEstatico)].map((m) => ({ soloTipos: Boolean(m[1]), especificador: m[2]! })),
    ...[...codigo.matchAll(importDinamico)].map((m) => ({ soloTipos: false, especificador: m[1]! }))
  ];
  return imports
    .filter(({ soloTipos, especificador }) => !permitido(capa, clasificar(archivo, especificador), soloTipos))
    .map(({ soloTipos, especificador }) => `${archivo}: ${capa} no puede importar ${soloTipos ? "(tipos) " : ""}${especificador}`);
}

/**
 * Comprueba un componente migrado: ya no existe en src/modules, cada archivo de sus capas
 * respeta las reglas y, si tiene controladores, sus rutas se componen en routes/<componente>.routes.ts.
 */
export function revisarComponente(componente: string): string[] {
  const problemas: string[] = [];
  if (existsSync(new URL(`modules/${componente}/`, raizFuentes))) problemas.push(`${componente}: aún existe src/modules/${componente}`);
  for (const capa of capas) {
    const carpeta = new URL(`${capa}/${componente}/`, raizFuentes);
    if (!existsSync(carpeta)) continue;
    for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
      const relativo = `${capa}/${componente}/${entrada.name}`;
      if (!entrada.isFile()) {
        problemas.push(`${relativo}: subcarpeta no prevista`);
        continue;
      }
      problemas.push(...revisarImports(relativo, readFileSync(new URL(relativo, raizFuentes), "utf8")));
    }
  }
  if (existsSync(new URL(`controllers/${componente}/`, raizFuentes)) && !existsSync(new URL(`routes/${componente}.routes.ts`, raizFuentes))) {
    problemas.push(`${componente}: falta routes/${componente}.routes.ts`);
  }
  return problemas;
}
