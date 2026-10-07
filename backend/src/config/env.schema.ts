import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n", ""].includes(normalized)) {
    return false;
  }

  return value;
}, z.boolean());

const MOTIVO_FALTA = "falta";
const MOTIVO_EJEMPLO = "tiene el valor de ejemplo; reemplázalo por uno propio";

// Los marcadores de backend/.env.example contienen "CAMBIA".
const esValorDeEjemplo = (value: string) => /cambia/i.test(value);

// Variable sin valor por defecto: ausente o vacía cuenta como faltante.
const requerida = (validar: (schema: z.ZodString) => z.ZodString = (schema) => schema) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    validar(z.string({ error: (issue) => (issue.input === undefined ? MOTIVO_FALTA : undefined) }))
      .refine((value) => !esValorDeEjemplo(value), MOTIVO_EJEMPLO)
  );

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
  DB_HOST: requerida(),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: requerida(),
  DB_USER: requerida(),
  DB_PASSWORD: requerida(),
  DB_SSL: booleanFromEnv.default(false),
  DB_TIMEZONE: z.string().default("America/Lima"),
  REDIS_URL: requerida((s) => s.url("debe ser una URL, por ejemplo redis://:clave@localhost:6379")),
  JWT_SECRET: requerida((s) => s.min(32, "debe tener al menos 32 caracteres")),
  JWT_EXPIRES_IN: z.string().default("1d"),
  ADMIN_NAME: z.string().default("Administrador"),
  ADMIN_EMAIL: requerida((s) => s.email("debe ser un correo válido")),
  ADMIN_PASSWORD: requerida((s) => s.min(12, "debe tener al menos 12 caracteres"))
});

export type Env = z.infer<typeof envSchema>;

export type ProblemaEnv = { variable: string; motivo: string };

export class EnvError extends Error {
  constructor(readonly problemas: ProblemaEnv[]) {
    super(
      [
        "Configuración inválida: el servidor no arrancará hasta corregir estas variables de backend/.env:",
        ...problemas.map(({ variable, motivo }) => `  - ${variable}: ${motivo}`),
        "Copia los nombres de backend/.env.example o genera un .env local con: npm run env:init"
      ].join("\n")
    );
    this.name = "EnvError";
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (result.success) {
    return result.data;
  }

  // Solo se informan el nombre y el motivo: nunca el valor recibido.
  const problemas = result.error.issues.map((issue) => ({
    variable: String(issue.path[0] ?? "desconocida"),
    motivo: issue.message
  }));

  throw new EnvError(problemas);
}
