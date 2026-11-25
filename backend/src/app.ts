import { registrarUsuarios } from './routes/usuarios.routes.js';
import { registrarCertificados } from './routes/certificados.routes.js';
import { registrarEvaluaciones } from './routes/evaluaciones.routes.js';
import { registrarAccesoSesiones } from './plugins/accesoSesiones.js';
import { registrarHistorial } from './routes/historial.routes.js';
import { registrarCursos } from "./routes/cursos.routes.js";
import { registrarPagos } from './routes/pagos.routes.js';
import { registrarCorreo } from './routes/notificaciones.routes.js';
import { registrarRutasReuniones } from "./routes/reuniones.routes.js";
import { registrarEventosJitsi } from "./routes/jitsi.routes.js";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { authRoutes, ensureAdminUser, findUserById, limitarPeticiones, tokenRevocado } from "./routes/auth.routes.js";
import { asistenciaRoutes } from "./routes/asistencia.routes.js";
import { clasesRoutes } from "./routes/clases.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { rutasPendientes } from "./routes/pendientes.routes.js";
import { registrarAutorizacion } from "./plugins/autorizacion.js";
import { registrarErrores } from "./plugins/errores.js";
import { registerHttpPlugins } from "./plugins/http.js";
import { RegistroCompacto } from "./plugins/registroCompacto.js";
import { pool } from "./shared/database.js";
import { verificarMigraciones } from "./shared/migraciones.js";
import { ensureRedis } from "./shared/redis.js";

export async function buildApp() {
  const desarrollo = env.NODE_ENV === "development";
  const app = Fastify({
    // En desarrollo, una línea por petición; en producción se mantiene el JSON estructurado.
    ...(desarrollo ? { logController: new RegistroCompacto() } : {}),
    logger: {
      level: env.LOG_LEVEL,
      ...(desarrollo
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname,reqId"
              }
            }
          }
        : {})
    }
  });

  await registerHttpPlugins(app);
  registrarErrores(app);
  // Antes de registrar rutas: cada una recibe el guard de la matriz de permisos.
  registrarAutorizacion(app, findUserById, { tokenRevocado, limitar: limitarPeticiones });
  registrarAccesoSesiones(app);
  // No migra: exige que la base esté al día (npm run migrate) antes de aceptar tráfico.
  await verificarMigraciones(pool);
  await ensureAdminUser();
  await ensureRedis();
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(clasesRoutes);
  await app.register(registrarCursos);
  await app.register(registrarPagos);
  await app.register(registrarCorreo);
  await app.register(registrarHistorial);
  await app.register(registrarUsuarios);
  await app.register(registrarCertificados);
  await app.register(registrarEvaluaciones);
  await app.register(asistenciaRoutes);
  // Al final: solo agrega las rutas del contrato que aún no existen (501).
  await app.register(registrarRutasReuniones);
  await app.register(registrarEventosJitsi);
  await app.register(rutasPendientes);

  return app;
}
