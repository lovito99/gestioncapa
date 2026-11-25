import assert from "node:assert/strict";
import { test } from "node:test";
import type { PoolClient } from "pg";
import { conTransaccion } from "../src/shared/transaccion.js";

function poolFalso() {
  const sentencias: string[] = [];
  let liberado = 0;
  const cliente = {
    query: async (sql: string) => { sentencias.push(sql); return { rows: [], rowCount: 0 }; },
    release: () => { liberado++; }
  } as unknown as PoolClient;
  return { pool: { connect: async () => cliente }, sentencias, liberaciones: () => liberado };
}

test("T-26: conTransaccion confirma, devuelve el resultado y libera el cliente", async () => {
  const { pool, sentencias, liberaciones } = poolFalso();
  const resultado = await conTransaccion(pool, async (cliente) => {
    await cliente.query("select 1");
    return "hecho";
  });
  assert.equal(resultado, "hecho");
  assert.deepEqual(sentencias, ["begin", "select 1", "commit"]);
  assert.equal(liberaciones(), 1);
});

test("T-26: conTransaccion revierte, propaga el error y libera el cliente", async () => {
  const { pool, sentencias, liberaciones } = poolFalso();
  const fallo = new Error("regla incumplida");
  await assert.rejects(conTransaccion(pool, async () => { throw fallo; }), fallo);
  assert.deepEqual(sentencias, ["begin", "rollback"]);
  assert.equal(liberaciones(), 1);
});
