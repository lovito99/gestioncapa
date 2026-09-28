import { ensureAdminUser } from "../modules/auth/auth.service.js";
import { ensureDatabase, pool } from "../shared/database.js";

try {
  await ensureDatabase();
  await ensureAdminUser();
  console.log("Seed ejecutado correctamente.");
} catch (error) {
  console.error("Error ejecutando seed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
