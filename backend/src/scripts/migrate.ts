import { pool } from "../shared/database.js";
import { MigracionError, migrar } from "../shared/migraciones.js";

try {
  const aplicadas = await migrar(pool);

  if (aplicadas.length === 0) {
    console.log("La base de datos ya está al día.");
  } else {
    console.log(`Migraciones aplicadas (${aplicadas.length}):`);
    for (const nombre of aplicadas) console.log(`  ✓ ${nombre}`);
  }
} catch (error) {
  console.error(error instanceof MigracionError ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
