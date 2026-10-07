import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CARPETA_MIGRACIONES, nombreMigracionNueva } from "../shared/migraciones.js";

// No usa la base ni el .env: solo crea el archivo con el siguiente número.
try {
  const carpeta = fileURLToPath(CARPETA_MIGRACIONES);
  const nombre = nombreMigracionNueva(await readdir(carpeta), process.argv.slice(2).join(" "));
  await writeFile(join(carpeta, nombre), "-- Describe aquí el cambio. Una vez aplicada, esta migración no se edita.\n\n", {
    flag: "wx"
  });
  console.log(`Creada backend/migraciones/${nombre}. Escribe el SQL y ejecuta npm run migrate.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
