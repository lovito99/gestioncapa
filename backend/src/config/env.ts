import { config } from "dotenv";
import { EnvError, parseEnv } from "./env.schema.js";

config({ quiet: true });

function loadEnv() {
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (error instanceof EnvError) {
      // Se detiene al importar la configuración, antes de abrir conexiones o el puerto.
      console.error(error.message);
      process.exit(1);
    }

    throw error;
  }
}

export const env = loadEnv();
