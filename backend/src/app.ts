import Fastify from "fastify";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { clasesRoutes } from "./modules/clases/clases.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { rutasPendientes } from "./modules/pendientes/pendientes.routes.js";
import { registrarAutorizacion } from "./plugins/autorizacion.js";
import { registerHttpPlugins } from "./plugins/http.js";
import { ensureAdminUser, findUserById } from "./modules/auth/auth.service.js";
import { pool } from "./shared/database.js";
import { verificarMigraciones } from "./shared/migraciones.js";
import { ensureRedis } from "./shared/redis.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL
    }
  });

  await registerHttpPlugins(app);
  // Antes de registrar rutas: cada una recibe el guard de la matriz de permisos.
  registrarAutorizacion(app, findUserById);
  // No migra: exige que la base esté al día (npm run migrate) antes de aceptar tráfico.
  await verificarMigraciones(pool);
  await ensureAdminUser();
  await ensureRedis();
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(clasesRoutes);
  // Al final: solo agrega las rutas del contrato que aún no existen (501).
  await app.register(rutasPendientes);

  return app;
}
