import type { Pool, PoolClient } from "pg";

/** Ejecuta la operación en una transacción: confirma al terminar, revierte si falla y siempre libera el cliente. */
export async function conTransaccion<T>(pool: Pick<Pool, "connect">, operacion: (cliente: PoolClient) => Promise<T>) {
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    const resultado = await operacion(cliente);
    await cliente.query("commit");
    return resultado;
  } catch (error) {
    await cliente.query("rollback");
    throw error;
  } finally {
    cliente.release();
  }
}
