import { ensureDatabase, pool } from "../shared/database.js";

try {
  await ensureDatabase();
  console.log("Migraciones ejecutadas correctamente.");
} catch (error) {
  console.error("Error ejecutando migraciones:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
