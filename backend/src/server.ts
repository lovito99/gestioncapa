import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { MigracionError } from "./shared/migraciones.js";

let app: Awaited<ReturnType<typeof buildApp>>;

try {
  app = await buildApp();
} catch (error) {
  // Base desactualizada: mensaje claro y sin traza, antes de aceptar tráfico.
  if (error instanceof MigracionError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
