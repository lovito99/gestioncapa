import { sembrarUsuarios } from "../modules/auth/auth.service.js";
import { ensureDatabase, pool } from "../shared/database.js";

try {
  await ensureDatabase();
  const usuarios = await sembrarUsuarios();
  console.log("Seed ejecutado correctamente. Usuarios disponibles:");
  console.table(usuarios.map(({ email, role }) => ({ email, rol: role })));
} catch (error) {
  console.error("Error ejecutando seed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
