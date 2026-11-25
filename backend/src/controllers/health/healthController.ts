import type { FastifyPluginAsync } from "fastify";
import type { HealthService } from "../../services/health/healthService.js";

export function healthController(servicio: HealthService): FastifyPluginAsync {
  return async (app) => {
    app.get("/health", async () => servicio.basico());
    app.get("/api/health", async () => servicio.detallado());
  };
}
