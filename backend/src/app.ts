import Fastify from "fastify";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { registerHttpPlugins } from "./plugins/http.js";
import { ensureAdminUser } from "./modules/auth/auth.service.js";
import { ensureDatabase } from "./shared/database.js";
import { ensureRedis } from "./shared/redis.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL
    }
  });

  await registerHttpPlugins(app);
  await ensureDatabase();
  await ensureAdminUser();
  await ensureRedis();
  await app.register(healthRoutes);
  await app.register(authRoutes);

  return app;
}
