import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

function fechaMasReciente(carpeta, extension) {
  return readdirSync(carpeta, { recursive: true, withFileTypes: true })
    .filter(entrada => entrada.isFile() && entrada.name.endsWith(extension))
    .reduce((maxima, entrada) => Math.max(maxima, statSync(join(entrada.parentPath, entrada.name)).mtimeMs), 0);
}

async function seleccionarArranque() {
  const fuentes = new URL("./src/", import.meta.url);
  const servidorFuente = new URL("server.ts", fuentes);
  const dist = new URL("./dist/", import.meta.url);
  const servidorCompilado = new URL("server.js", dist);
  let instruccion = "Ejecuta npm run build -w backend desde la raíz antes de npm start.";

  if (existsSync(servidorFuente)) {
    const { config } = await import("dotenv");
    config({ quiet: true });
    if (process.env.NODE_ENV !== "production") {
      const tsx = await import("tsx/esm/api").catch(error => {
        if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
        return null;
      });
      if (tsx) {
        tsx.register();
        return { servidor: servidorFuente, configuracion: new URL("config/env.ts", fuentes) };
      }
      instruccion = "Instala las dependencias de desarrollo con npm install --include=dev para iniciar desde TypeScript.";
    }
  }

  if (!existsSync(servidorCompilado)) {
    throw new Error(`Falta compilar el backend. ${instruccion}`);
  }
  // Las migraciones pueden haber cambiado el esquema que consulta el código compilado.
  if (existsSync(fuentes) && fechaMasReciente(fuentes, ".ts") > fechaMasReciente(dist, ".js")) {
    throw new Error(`El backend compilado está desactualizado. ${instruccion}`);
  }
  return { servidor: servidorCompilado, configuracion: new URL("config/env.js", dist) };
}

try {
  const { servidor, configuracion } = await seleccionarArranque();
  // Valida la configuración antes de arrancar Docker o abrir el puerto de la API.
  const { env } = await import(configuracion.href);
  if (env.jitsiHabilitado && env.NODE_ENV !== "production") {
    const direccion = new URL(env.jitsiDireccion ?? `https://${env.jitsiDominio}`);
    if (["localhost", "127.0.0.1", "[::1]"].includes(direccion.hostname)) {
      const carpeta = new URL("../infraestructura/jitsi/servidor/", import.meta.url);
      if (!existsSync(new URL("docker-compose.yml", carpeta)) || !existsSync(new URL(".env", carpeta))) {
        throw new Error("Falta preparar Jitsi local. Sigue la preparación de docs/reuniones.md antes de npm start.");
      }

      console.log("Iniciando las reuniones con Jitsi local...");
      const resultado = spawnSync("docker", ["compose", "up", "-d", "--pull", "never", "--wait", "--wait-timeout", "90"], {
        cwd: fileURLToPath(carpeta),
        stdio: "inherit"
      });
      if (resultado.error) {
        throw new Error("No se pudo ejecutar Docker. Comprueba su instalación y que Docker Compose esté disponible.");
      }
      if (resultado.status !== 0) {
        throw new Error("No se pudo iniciar Jitsi local. Revisa Docker, las imágenes descargadas y su configuración.");
      }

      // Compose confirma los contenedores; espera además a que Nginx sirva Jitsi.
      const configuracion = new URL(`${direccion.href.replace(/\/$/, "")}/config.js`);
      const limite = Date.now() + 30_000;
      let disponible = false;
      while (Date.now() < limite) {
        try {
          const respuesta = await fetch(configuracion, { signal: AbortSignal.timeout(2_000) });
          disponible = respuesta.ok;
          await respuesta.body?.cancel();
          if (disponible) break;
        } catch {
          // El servidor web puede seguir arrancando tras iniciarse el contenedor.
        }
        await setTimeout(500);
      }
      if (!disponible) {
        throw new Error("Jitsi local no respondió a tiempo. Revisa sus contenedores con docker compose logs.");
      }
      console.log("Jitsi local está listo para las reuniones.");
    }
  }

  await import(servidor.href);
} catch (error) {
  console.error(error instanceof Error ? error.message : "No se pudo iniciar el backend.");
  process.exit(1);
}
