import Fastify from "fastify";
import { env } from "./config/env.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { registerHttpPlugins } from "./plugins/http.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL
    }
  });

  await registerHttpPlugins(app);
  await app.register(healthRoutes);

  return app;
}
