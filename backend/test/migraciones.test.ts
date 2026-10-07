import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import {
  MigracionError,
  leerMigraciones,
  nombreMigracionNueva,
  planificar,
  type ArchivoMigracion
} from "../src/shared/migraciones.js";

const archivo = (version: string, nombre = `${version}_cambio`, checksum = `c${version}`): ArchivoMigracion => ({
  version,
  nombre,
  checksum,
  sql: "select 1;"
});

function problemasDe(accion: () => unknown) {
  try {
    accion();
  } catch (error) {
    assert.ok(error instanceof MigracionError, "debe lanzar MigracionError");
    return error.problemas.join("\n");
  }
  assert.fail("debía fallar");
}

describe("Característica: Base de datos versionada del Sprint 1", () => {
  describe("planificar", () => {
    test("BD-01: Dado una base vacía, entonces todas las migraciones están pendientes en orden", () => {
      const pendientes = planificar([archivo("0002"), archivo("0001")], []);

      assert.deepEqual(pendientes.map((m) => m.version), ["0001", "0002"]);
    });

    test("BD-01: Dado todo aplicado, entonces no hay pendientes", () => {
      const archivos = [archivo("0001"), archivo("0002")];

      assert.deepEqual(planificar(archivos, archivos), []);
    });

    test("BD-01: Dado migraciones nuevas, entonces solo esas están pendientes", () => {
      const pendientes = planificar([archivo("0001"), archivo("0002"), archivo("0003")], [archivo("0001")]);

      assert.deepEqual(pendientes.map((m) => m.version), ["0002", "0003"]);
    });

    test("BD-07: Dado una migración aplicada cuyo archivo cambió, entonces falla nombrándola", () => {
      const problemas = problemasDe(() => planificar([archivo("0001", "0001_usuarios.sql", "nuevo")], [archivo("0001", "0001_usuarios.sql", "viejo")]));

      assert.match(problemas, /0001_usuarios\.sql/);
      assert.match(problemas, /cambió después de aplicarse/);
    });

    test("BD-08: Dado dos archivos con la misma versión, entonces falla", () => {
      const problemas = problemasDe(() => planificar([archivo("0002", "0002_a.sql"), archivo("0002", "0002_b.sql")], []));

      assert.match(problemas, /0002_a\.sql/);
      assert.match(problemas, /0002_b\.sql/);
    });

    test("BD-08: Dado una versión menor que la última aplicada, entonces pide renumerarla", () => {
      const problemas = problemasDe(() =>
        planificar([archivo("0001"), archivo("0002", "0002_otra_rama.sql"), archivo("0003")], [archivo("0001"), archivo("0003")])
      );

      assert.match(problemas, /0002_otra_rama\.sql/);
      assert.match(problemas, /renumera/i);
    });

    test("BD-08: Dado una migración aplicada sin archivo, entonces falla", () => {
      const problemas = problemasDe(() => planificar([archivo("0001")], [archivo("0001"), archivo("0002", "0002_borrada.sql")]));

      assert.match(problemas, /0002_borrada\.sql/);
    });
  });

  describe("leerMigraciones", () => {
    let carpeta: string;

    before(async () => {
      carpeta = await mkdtemp(join(tmpdir(), "gestioncapa-migraciones-"));
    });

    after(() => rm(carpeta, { recursive: true, force: true }));

    test("BD-08: lee los .sql ordenados con checksum que no depende de CRLF/LF", async () => {
      await writeFile(join(carpeta, "0002_segunda.sql"), "select 2;\r\n");
      await writeFile(join(carpeta, "0001_primera.sql"), "select 1;\n");
      await writeFile(join(carpeta, "LEEME.md"), "no es migración");
      const leidas = await leerMigraciones(carpeta);

      assert.deepEqual(leidas.map((m) => m.nombre), ["0001_primera.sql", "0002_segunda.sql"]);
      assert.equal(leidas[0]?.version, "0001");
      assert.match(leidas[0]?.checksum ?? "", /^[0-9a-f]{64}$/);

      await writeFile(join(carpeta, "0002_segunda.sql"), "select 2;\n");
      assert.equal((await leerMigraciones(carpeta))[1]?.checksum, leidas[1]?.checksum);
    });

    test("BD-08: Dado un .sql con nombre inválido, entonces falla nombrándolo", async () => {
      await writeFile(join(carpeta, "3_Sin-Formato.sql"), "select 3;");

      await assert.rejects(leerMigraciones(carpeta), /3_Sin-Formato\.sql/);
      await rm(join(carpeta, "3_Sin-Formato.sql"));
    });

    test("BD-12: lee nombres camelCase nuevos sin alterar las migraciones anteriores", async () => {
      await writeFile(join(carpeta, "0003-indiceDeAsistencia.sql"), "select 3;\n");
      const leidas = await leerMigraciones(carpeta);
      assert.deepEqual(leidas.map((m) => m.nombre), [
        "0001_primera.sql", "0002_segunda.sql", "0003-indiceDeAsistencia.sql"
      ]);
    });
  });

  describe("nombreMigracionNueva", () => {
    test("BD-11: usa el siguiente número de 4 dígitos", () => {
      assert.equal(nombreMigracionNueva(["0001_usuarios.sql", "0004_asistencias.sql"], "agregar campo"), "0005-agregarCampo.sql");
      assert.equal(nombreMigracionNueva([], "inicial"), "0001-inicial.sql");
    });

    test("BD-11: normaliza la descripción y rechaza una vacía", () => {
      assert.equal(nombreMigracionNueva([], "Agregar Campo-Teléfono"), "0001-agregarCampoTelefono.sql");
      assert.throws(() => nombreMigracionNueva([], "  "), /descripción/);
    });

    test("BD-12: los nombres nuevos no llevan guiones bajos y continúan el historial antiguo", () => {
      const nombre = nombreMigracionNueva(["0004_asistencias.sql", "0005-agregarCampo.sql"], "índice de asistencia");
      assert.equal(nombre, "0006-indiceDeAsistencia.sql");
      assert.ok(!nombre.includes("_"));
    });
  });
});
