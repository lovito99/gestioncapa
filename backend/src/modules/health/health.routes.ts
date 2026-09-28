import type { FastifyInstance } from "fastify";
import { pool } from "../../shared/database.js";
import { redis } from "../../shared/redis.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    service: "gestioncapa-backend",
    timestamp: new Date().toISOString()
  }));

  app.get("/api/health", async () => {
    const db = await pool.query("select 1 as ok");
    const cache = redis.status === "ready" ? await redis.ping() : "disabled";

    return {
      ok: true,
      api: "v1",
      database: db.rows[0]?.ok === 1 ? "ready" : "unknown",
      redis: cache === "PONG" ? "ready" : cache
    };
  });
}
