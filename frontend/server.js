import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "dist");
const port = Number(process.env.PORT ?? 3000);

if (!existsSync(distPath)) {
  console.error("No existe frontend/dist. Ejecute npm run build -w frontend antes de iniciar.");
  process.exit(1);
}

const app = express();

app.use(express.static(distPath));
app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Frontend listo en http://localhost:${port}`);
});
