import { readFile, writeFile } from "node:fs/promises";
import { parse } from "dotenv";
import { generarEnv } from "../config/env-init.js";

const plantilla = new URL("../../.env.example", import.meta.url);
const destino = new URL("../../.env", import.meta.url);

try {
  // "wx" falla si el archivo existe: nunca se sobrescribe un .env local.
  const contenido = generarEnv(await readFile(plantilla, "utf8"));
  await writeFile(destino, contenido, { flag: "wx" });
  console.log("Se creó backend/.env con JWT_SECRET y ADMIN_PASSWORD aleatorios.");
  console.log(`Administrador: ${parse(contenido).ADMIN_EMAIL} / ${parse(contenido).ADMIN_PASSWORD}`);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "EEXIST") {
    console.log("backend/.env ya existe; no se modificó.");
  } else {
    throw error;
  }
}
