import assert from "node:assert/strict";
import { test } from "node:test";
import { crearHealthService } from "../src/services/health/healthService.js";

const servicio = (base: unknown, redis: string) =>
  crearHealthService({ repositorio: { consultarBase: async () => base, consultarRedis: async () => redis } });

test("T-26 health: informa base y Redis listos cuando ambos responden", async () => {
  assert.deepEqual(await servicio(1, "PONG").detallado(), { ok: true, api: "v1", database: "ready", redis: "ready" });
});

test("T-26 health: una respuesta inesperada de la base es unknown y Redis sin conexión es disabled", async () => {
  assert.deepEqual(await servicio(undefined, "disabled").detallado(), { ok: true, api: "v1", database: "unknown", redis: "disabled" });
});

test("T-26 health: el estado básico identifica el servicio con una marca ISO", () => {
  const estado = servicio(1, "PONG").basico();
  assert.equal(estado.service, "gestioncapa-backend");
  assert.ok(!Number.isNaN(Date.parse(estado.timestamp)));
});
