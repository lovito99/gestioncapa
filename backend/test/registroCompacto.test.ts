import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { Writable } from "node:stream";
import { lineaPeticion, RegistroCompacto } from "../src/plugins/registroCompacto.js";

test("resume la petición en una sola línea", () => {
  assert.equal(lineaPeticion("POST", "/api/auth/login", 401, 7.6), "POST /api/auth/login → 401 (8 ms)");
});

test("registra una entrada por petición con el nivel según el estado", async () => {
  const entradas: Array<{ level: number; msg: string }> = [];
  const destino = new Writable({
    write(trozo, _codificacion, listo) {
      for (const linea of String(trozo).split("\n").filter(Boolean)) entradas.push(JSON.parse(linea));
      listo();
    }
  });
  const app = Fastify({ logController: new RegistroCompacto(), logger: { level: "info", stream: destino } });
  app.get("/ok", async () => ({ ok: true }));
  app.get("/fallo", async (_request, reply) => reply.code(404).send());

  await app.inject("/ok");
  await app.inject("/fallo");
  await app.close();

  const peticiones = entradas.filter((entrada) => entrada.msg.includes("→"));
  assert.equal(entradas.some((entrada) => entrada.msg === "incoming request"), false);
  assert.deepEqual(peticiones.map((entrada) => [entrada.level, entrada.msg.replace(/\(\d+ ms\)/, "")]), [
    [30, "GET /ok → 200 "],
    [40, "GET /fallo → 404 "]
  ]);
});
