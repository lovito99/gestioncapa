import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const servidor = fileURLToPath(new URL("../src/server.ts", import.meta.url));
// Ruta absoluta del cargador: la carpeta temporal no tiene node_modules.
const cargadorTsx = import.meta.resolve("tsx");

// Arranca el servidor real en una carpeta vacía para que dotenv no lea backend/.env.
async function arrancarSin(variable: string) {
  const carpeta = await mkdtemp(join(tmpdir(), "gestioncapa-arranque-"));
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    DB_HOST: "127.0.0.1",
    DB_NAME: "gestiondecapacitacion",
    DB_USER: "gestiondecapacitacion",
    DB_PASSWORD: "gestiondecapacitacion",
    REDIS_URL: "redis://127.0.0.1:6379",
    JWT_SECRET: "secreto-propio-de-prueba-con-mas-de-32-caracteres",
    ADMIN_EMAIL: "admin@gestioncapa.local",
    ADMIN_PASSWORD: "ClavePropia123!",
    QR_SECRET: "secreto-propio-del-qr-con-mas-de-32-caracteres",
    // Puerto improbable: si el servidor llegara a escuchar, la prueba lo detecta en stdout.
    PORT: "18999"
  };
  delete env[variable];

  try {
    return await new Promise<{ codigo: number | null; salida: string }>((resolve, reject) => {
      const hijo = spawn(process.execPath, ["--import", cargadorTsx, servidor], { cwd: carpeta, env });
      let salida = "";
      hijo.stdout.on("data", (d) => (salida += d));
      hijo.stderr.on("data", (d) => (salida += d));
      const limite = setTimeout(() => {
        hijo.kill();
        reject(new Error(`El servidor no terminó a tiempo:\n${salida}`));
      }, 15_000);
      hijo.on("exit", (codigo) => {
        clearTimeout(limite);
        resolve({ codigo, salida });
      });
    });
  } finally {
    await rm(carpeta, { recursive: true, force: true });
  }
}

describe("Característica: Configuración validada al arrancar", () => {
  test("CFG-01: Dado que falta JWT_SECRET, cuando el servidor arranca, entonces termina antes de escuchar", async () => {
    const { codigo, salida } = await arrancarSin("JWT_SECRET");

    assert.equal(codigo, 1);
    assert.match(salida, /JWT_SECRET: falta/);
    assert.match(salida, /npm run env:init/);
    assert.doesNotMatch(salida, /Server listening/i);
  });
});
