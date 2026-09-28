import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    service: "gestioncapa-backend",
    timestamp: new Date().toISOString()
  }));

  app.get("/api/health", async () => ({
    ok: true,
    api: "v1"
  }));
}
