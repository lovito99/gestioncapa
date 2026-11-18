import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crearServidorFrontend } from "./servidor.js";

const carpetaFrontend = path.dirname(fileURLToPath(import.meta.url));
const archivoEnv = path.join(carpetaFrontend, ".env");
if (existsSync(archivoEnv)) process.loadEnvFile(archivoEnv);

const distPath = path.join(carpetaFrontend, "dist");
const port = Number(process.env.PORT ?? 3000);
const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:8080";

if (!existsSync(distPath)) {
  console.error("No existe frontend/dist. Ejecute npm run build -w frontend antes de iniciar.");
  process.exit(1);
}

const app = crearServidorFrontend({ carpetaDist: distPath, backendUrl });

app.listen(port, () => {
  console.log(`Frontend listo en http://localhost:${port}`);
});
