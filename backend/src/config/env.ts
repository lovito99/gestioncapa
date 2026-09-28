import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  TZ: z.string().default("America/Lima"),
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default("0.0.0.0"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().default("gestiondecapacitacion"),
  DB_USER: z.string().default("gestiondecapacitacion"),
  DB_PASSWORD: z.string().min(1).default("gestiondecapacitacion"),
  DB_SSL: z.coerce.boolean().default(false),
  DB_TIMEZONE: z.string().default("America/Lima"),
  REDIS_URL: z
    .string()
    .url()
    .default("redis://:gestiondecapacitacion@localhost:6379"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres")
    .default("cambia_este_secreto_jwt_de_32_caracteres_minimo"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  ADMIN_NAME: z.string().default("Administrador"),
  ADMIN_EMAIL: z.string().email().default("admin@gestioncapa.local"),
  ADMIN_PASSWORD: z.string().min(12).default("CambiaEstaClave123!")
});

export const env = envSchema.parse(process.env);
