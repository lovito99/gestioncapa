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

// Distingue marcadores locales y ejemplos de credenciales externas.
const esValorDeEjemplo = (value: string) => /cambia|ejemplo_/i.test(value);

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
  limitePeticiones: z.coerce.number().int().min(1).max(10000).default(300),
  JWT_EXPIRES_IN: z.string().default("1d"),
  // Firma los tokens del QR de asistencia; distinto de JWT_SECRET.
  QR_SECRET: requerida((s) => s.min(32, "debe tener al menos 32 caracteres")),
  jitsiHabilitado: booleanFromEnv.default(false),
  pagosEntorno: z.enum(['sandbox','produccion']).default('sandbox'),
  pagosUrlPublica: z.string().url().optional(),
  transferenciaHabilitada: booleanFromEnv.default(false),
  transferenciaBanco: z.string().trim().min(2).max(80).optional(),
  transferenciaTitular: z.string().trim().min(3).max(160).optional(),
  transferenciaCuenta: z.string().regex(/^\d{6,34}$/).optional(),
  transferenciaCci: z.string().regex(/^\d{20}$/).optional(),
  voucherRetencionMeses: z.coerce.number().refine(valor=>valor===3,'la política acordada conserva vouchers tres meses').default(3),
  correoPlazoEnvioMs: z.coerce.number().int().min(100).max(60000).default(60000),
  correoHabilitado: booleanFromEnv.default(false),
  correoServidor: z.string().regex(/^[a-zA-Z0-9.-]+$/).max(253).optional(),
  correoPuerto: z.coerce.number().int().min(1).max(65535).default(587),
  correoSeguro: booleanFromEnv.default(false),
  correoUsuario: z.string().min(1).max(180).optional(),
  correoClave: z.string().min(1).max(1024).optional(),
  correoRemitente: z.email().max(180).optional(),
  correoSinTlsParaPruebas: booleanFromEnv.default(false),
  izipayHabilitado: booleanFromEnv.default(false),
  izipayCodigoComercio: z.string().min(1).max(15).optional(),
  izipayClavePublica: z.string().min(16).max(400).optional(),
  izipayClaveHash: z.string().min(32).optional(),
  izipayRsaPublica: z.string().min(20).max(4096).optional(),
  culqiHabilitado: booleanFromEnv.default(false),
  culqiClavePublica: z.string().optional(),
  culqiClaveSecreta: z.string().optional(),
  jitsiDominio: z.string().regex(/^[a-zA-Z0-9.-]+$/).optional(),
  jitsiDireccion: z.string().url().refine(valor => new URL(valor).protocol === "https:" || (new URL(valor).protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(valor).hostname)), "debe usar HTTPS; HTTP solo se admite en localhost").optional(),
  jitsiAplicacion: z.string().min(3).optional(),
  jitsiSecreto: z.string().min(32).optional(),
  jitsiEventosSecreto: z.string().min(32).optional(),
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
  const result = envSchema.superRefine((configuracion, contexto) => {
    if(configuracion.correoSinTlsParaPruebas&&(configuracion.NODE_ENV!=='test'||!['127.0.0.1','localhost'].includes(configuracion.correoServidor??''))) contexto.addIssue({code:'custom',path:['correoSinTlsParaPruebas'],message:'solo se permite SMTP sin TLS en loopback de pruebas'});
    if(configuracion.correoHabilitado) {
      for(const nombre of ['correoServidor','correoRemitente',...(configuracion.correoSinTlsParaPruebas?[]:['correoUsuario','correoClave'] as const)] as const) {
        const valor=configuracion[nombre];
        if(!valor||esValorDeEjemplo(valor)) contexto.addIssue({code:'custom',path:[nombre],message:'configura el servicio SMTP antes de habilitar correo'});
      }
    }
    if (configuracion.transferenciaHabilitada) {
      for (const nombre of ['transferenciaBanco','transferenciaTitular','transferenciaCuenta','transferenciaCci'] as const) {
        if (!configuracion[nombre] || esValorDeEjemplo(configuracion[nombre])) contexto.addIssue({code:'custom',path:[nombre],message:'configura el destino institucional antes de habilitar transferencias'});
      }
    }
    if (configuracion.pagosEntorno === 'produccion' && configuracion.NODE_ENV !== 'production') contexto.addIssue({ code:'custom',path:['pagosEntorno'],message:'los cobros de producción requieren NODE_ENV=production' });
    const requeridos = [
      ...(configuracion.izipayHabilitado ? ['izipayCodigoComercio','izipayClavePublica','izipayClaveHash','izipayRsaPublica','pagosUrlPublica'] as const : []),
      ...(configuracion.culqiHabilitado ? ['culqiClavePublica','culqiClaveSecreta','pagosUrlPublica'] as const : []),
    ];
    for (const nombre of requeridos) {
      const valor = configuracion[nombre];
      if (!valor || esValorDeEjemplo(valor)) contexto.addIssue({ code:'custom',path:[nombre],message:'configura credenciales propias para habilitar la pasarela' });
    }
    if ((configuracion.izipayHabilitado || configuracion.culqiHabilitado) && configuracion.pagosUrlPublica) {
      const url = new URL(configuracion.pagosUrlPublica);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') contexto.addIssue({ code:'custom',path:['pagosUrlPublica'],message:'usa el origen público HTTPS sin ruta ni credenciales' });
    }
    if (configuracion.culqiHabilitado) {
      const entorno = configuracion.pagosEntorno === 'sandbox' ? 'test' : 'live';
      if (!configuracion.culqiClavePublica?.startsWith(`pk_${entorno}_`) || !configuracion.culqiClaveSecreta?.startsWith(`sk_${entorno}_`)) contexto.addIssue({ code:'custom',path:['culqiClaveSecreta'],message:'las llaves deben corresponder al entorno seleccionado' });
    }
    if (!configuracion.jitsiHabilitado) return;
    for (const nombre of ["jitsiDominio", "jitsiAplicacion", "jitsiSecreto", "jitsiEventosSecreto"] as const) {
      if (!configuracion[nombre] || esValorDeEjemplo(configuracion[nombre])) {
        contexto.addIssue({ code: "custom", path: [nombre], message: "configura un valor propio para habilitar Jitsi" });
      }
    }
    if (configuracion.NODE_ENV === "production" && configuracion.jitsiDireccion && new URL(configuracion.jitsiDireccion).protocol !== "https:") {
      contexto.addIssue({ code: "custom", path: ["jitsiDireccion"], message: "producción requiere HTTPS" });
    }
    if (configuracion.jitsiDireccion && new URL(configuracion.jitsiDireccion).hostname !== configuracion.jitsiDominio) {
      contexto.addIssue({ code: "custom", path: ["jitsiDireccion"], message: "el host debe coincidir con jitsiDominio" });
    }
    if (configuracion.jitsiSecreto === configuracion.JWT_SECRET || configuracion.jitsiSecreto === configuracion.QR_SECRET) {
      contexto.addIssue({ code: "custom", path: ["jitsiSecreto"], message: "debe ser distinto de los secretos de sesión y QR" });
    }
    // El webhook de Prosody no debe aceptar un secreto que firme tokens de usuarios.
    if ([configuracion.jitsiSecreto, configuracion.JWT_SECRET, configuracion.QR_SECRET].includes(configuracion.jitsiEventosSecreto)) {
      contexto.addIssue({ code: "custom", path: ["jitsiEventosSecreto"], message: "debe ser distinto de los secretos de Jitsi, sesión y QR" });
    }
  }).safeParse(source);

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
