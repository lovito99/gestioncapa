import { pool } from "../shared/database.js";
import { estadoMigraciones } from "../shared/migraciones.js";

try {
  const { aplicadas, pendientes } = await estadoMigraciones(pool);
  for (const nombre of aplicadas) console.log(`  ✓ ${nombre}`);
  for (const nombre of pendientes) console.log(`  · ${nombre} (pendiente)`);
  console.log(pendientes.length === 0 ? "La base de datos está al día." : "Ejecuta npm run migrate para aplicar las pendientes.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
