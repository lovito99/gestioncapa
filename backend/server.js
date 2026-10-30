import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

try {
  const servidor = new URL("./dist/server.js", import.meta.url);
  if (!existsSync(servidor)) {
    throw new Error("Falta compilar el backend. Ejecuta npm run build -w backend desde la raíz antes de npm start.");
  }

  // Valida la configuración antes de arrancar Docker o abrir el puerto de la API.
  const { env } = await import("./dist/config/env.js");
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
