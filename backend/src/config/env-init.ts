import { randomBytes } from "node:crypto";

const VARIABLES_GENERADAS = ["JWT_SECRET", "ADMIN_PASSWORD", "QR_SECRET"] as const;

const aleatorioPorDefecto = () => randomBytes(24).toString("base64url");

// Copia la plantilla y reemplaza los marcadores de secretos por valores aleatorios.
export function generarEnv(plantilla: string, aleatorio: () => string = aleatorioPorDefecto) {
  return plantilla
    .split("\n")
    .map((linea) => {
      const variable = VARIABLES_GENERADAS.find((nombre) => linea.startsWith(`${nombre}=`));
      return variable ? `${variable}=${aleatorio()}` : linea;
    })
    .join("\n");
}
