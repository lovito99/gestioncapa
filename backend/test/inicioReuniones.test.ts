import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";

const lanzador = await readFile(new URL("../server.js", import.meta.url), "utf8");

async function webJitsi(t: TestContext, fallosIniciales = 0) {
  const peticiones: string[] = [];
  const web = createServer((solicitud, respuesta) => {
    peticiones.push(solicitud.url!);
    respuesta.writeHead(peticiones.length <= fallosIniciales ? 503 : 200);
    respuesta.end("var config = {};");
  });
  await new Promise<void>(resolve => web.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve, reject) => {
    web.close(error => error ? reject(error) : resolve());
    web.closeAllConnections();
  }));
  const direccion = web.address();
  assert.ok(direccion && typeof direccion !== "string");
  return { direccion: `http://127.0.0.1:${direccion.port}`, peticiones };
}

async function escenario(t: TestContext, opciones: {
  habilitado?: boolean;
  modo?: string;
  direccion?: string;
  preparado?: boolean;
  compilado?: boolean;
  docker?: boolean;
  codigoDocker?: number;
} = {}) {
  const raiz = await mkdtemp(join(tmpdir(), "gestioncapa-inicio-reuniones-"));
  t.after(() => rm(raiz, { recursive: true, force: true }));
  const backend = join(raiz, "backend");
  const bin = join(raiz, "bin");
  const compose = join(raiz, "infraestructura", "jitsi", "servidor");
  await mkdir(backend);
  await mkdir(bin);
  await writeFile(join(raiz, "package.json"), '{"type":"module"}');
  await writeFile(join(backend, "server.js"), lanzador);
  if (opciones.compilado !== false) {
    await mkdir(join(backend, "dist", "config"), { recursive: true });
    await writeFile(join(backend, "dist", "config", "env.js"), `export const env = ${JSON.stringify({
      NODE_ENV: opciones.modo ?? "development",
      jitsiHabilitado: opciones.habilitado ?? true,
      jitsiDominio: "localhost",
      jitsiDireccion: opciones.direccion ?? "http://localhost:8000"
    })};`);
    await writeFile(join(backend, "dist", "server.js"), 'console.log("BACKEND_INICIADO");');
  }
  if (opciones.preparado !== false) {
    await mkdir(compose, { recursive: true });
    await writeFile(join(compose, "docker-compose.yml"), "services: {}\n");
    await writeFile(join(compose, ".env"), "COMPOSE_PROJECT_NAME=prueba\n");
  }
  if (opciones.docker !== false) {
    const docker = join(bin, "docker");
    await writeFile(docker, `#!${process.execPath}
console.log('DOCKER_ARGS:' + JSON.stringify(process.argv.slice(2)));
console.log('DOCKER_CWD:' + process.cwd());
process.exit(${opciones.codigoDocker ?? 0});
`);
    await chmod(docker, 0o755);
  }
  const ejecutar = () => new Promise<{ codigo: number | null; salida: string }>((resolve, reject) => {
    const proceso = spawn(process.execPath, [join(backend, "server.js")], {
      cwd: backend,
      env: { ...process.env, PATH: bin }
    });
    let salida = "";
    proceso.stdout.on("data", datos => salida += datos);
    proceso.stderr.on("data", datos => salida += datos);
    const limite = setTimeout(() => {
      proceso.kill();
      reject(new Error(`El arranque no terminó a tiempo: ${salida}`));
    }, 15_000);
    proceso.once("error", error => { clearTimeout(limite); reject(error); });
    proceso.once("close", codigo => { clearTimeout(limite); resolve({ codigo, salida }); });
  });
  return { ejecutar, compose };
}

test("npm start inicia Jitsi local y espera su web antes de iniciar la API", async t => {
  const web = await webJitsi(t);
  const prueba = await escenario(t, { direccion: web.direccion });
  const resultado = await prueba.ejecutar();

  assert.equal(resultado.codigo, 0, resultado.salida);
  assert.match(resultado.salida, /DOCKER_ARGS:\["compose","up","-d","--pull","never","--wait","--wait-timeout","90"\]/);
  assert.ok(resultado.salida.includes(`DOCKER_CWD:${prueba.compose}`));
  assert.deepEqual(web.peticiones, ["/config.js"]);
  assert.ok(resultado.salida.indexOf("Jitsi local está listo") < resultado.salida.indexOf("BACKEND_INICIADO"));
});

test("el arranque tolera que la web de Jitsi tarde en estar disponible", async t => {
  const web = await webJitsi(t, 1);
  const prueba = await escenario(t, { direccion: web.direccion });
  const resultado = await prueba.ejecutar();

  assert.equal(resultado.codigo, 0, resultado.salida);
  assert.deepEqual(web.peticiones, ["/config.js", "/config.js"]);
  assert.match(resultado.salida, /BACKEND_INICIADO/);
});

for (const opciones of [
  { habilitado: false },
  { modo: "production" },
  { direccion: "https://meet.empresa.pe" }
]) {
  test(`inicia la API sin Docker cuando no corresponde gestionar Jitsi local: ${JSON.stringify(opciones)}`, async t => {
    const prueba = await escenario(t, { ...opciones, preparado: false, docker: false });
    const resultado = await prueba.ejecutar();
    assert.equal(resultado.codigo, 0, resultado.salida);
    assert.match(resultado.salida, /BACKEND_INICIADO/);
    assert.doesNotMatch(resultado.salida, /DOCKER_ARGS|Iniciando las reuniones/);
  });
}

for (const [opciones, mensaje] of [
  [{ compilado: false }, /Falta compilar el backend/],
  [{ preparado: false }, /Falta preparar Jitsi local/],
  [{ docker: false }, /No se pudo ejecutar Docker/],
  [{ codigoDocker: 1 }, /No se pudo iniciar Jitsi local/]
] as const) {
  test(`el fallo de arranque impide iniciar la API: ${JSON.stringify(opciones)}`, async t => {
    const prueba = await escenario(t, opciones);
    const resultado = await prueba.ejecutar();
    assert.equal(resultado.codigo, 1, resultado.salida);
    assert.match(resultado.salida, mensaje);
    assert.doesNotMatch(resultado.salida, /BACKEND_INICIADO/);
  });
}
