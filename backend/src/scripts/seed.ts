import { sembrarDatos } from "../shared/seed.js";
import { pool } from "../shared/database.js";
import { MigracionError, verificarMigraciones } from "../shared/migraciones.js";

try {
  await verificarMigraciones(pool);
  const { usuarios, clases, inscripciones, asistencias } = await sembrarDatos();
  console.log("Seed ejecutado correctamente. Usuarios disponibles:");
  console.table(usuarios.map(({ email, role }) => ({ email, rol: role })));
  console.table([{ clases, inscripciones, asistencias }]);
} catch (error) {
  if (error instanceof MigracionError) {
    console.error(error.message);
  } else {
    console.error("Error ejecutando seed:", error);
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
