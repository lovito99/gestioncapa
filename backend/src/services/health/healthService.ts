import type { HealthRepository } from "../../repositories/health/healthRepository.js";

export function crearHealthService({ repositorio }: { repositorio: HealthRepository }) {
  return {
    basico() {
      return { ok: true, service: "gestioncapa-backend", timestamp: new Date().toISOString() };
    },
    async detallado() {
      const base = await repositorio.consultarBase();
      const cache = await repositorio.consultarRedis();
      return { ok: true, api: "v1", database: base === 1 ? "ready" : "unknown", redis: cache === "PONG" ? "ready" : cache };
    }
  };
}

export type HealthService = ReturnType<typeof crearHealthService>;
