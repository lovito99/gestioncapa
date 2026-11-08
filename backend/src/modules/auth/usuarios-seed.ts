import type { Env } from "../../config/env.schema.js";

export type UsuarioSeed = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "instructor" | "agremiado";
};

// Mismas cuentas que el modo demo (MSW), para probar igual con el backend real.
const CLAVE_DEMO = "demo123";

const usuariosDemo: UsuarioSeed[] = [
  { name: "Ana Torres", email: "ana.torres@cpppregion-cusco.com", password: CLAVE_DEMO, role: "admin" },
  { name: "Carlos Mendoza Ríos", email: "carlos.mendoza@cpppregion-cusco.com", password: CLAVE_DEMO, role: "instructor" },
  // Segunda instructora: permite probar que el solapamiento es por instructor (HU-05).
  { name: "Lucía Paredes Quispe", email: "lucia.paredes@cpppregion-cusco.com", password: CLAVE_DEMO, role: "instructor" },
  { name: "María Quispe", email: "maria.quispe@demo.cpppregion-cusco.com", password: CLAVE_DEMO, role: "agremiado" },
  { name: "Luz Apaza", email: "luz.apaza@demo.cpppregion-cusco.com", password: CLAVE_DEMO, role: "agremiado" }
];

export type EnvSeed = Pick<Env, "NODE_ENV" | "ADMIN_NAME" | "ADMIN_EMAIL" | "ADMIN_PASSWORD">;

export function usuariosSeed(env: EnvSeed): UsuarioSeed[] {
  const admin: UsuarioSeed = {
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL.toLowerCase(),
    password: env.ADMIN_PASSWORD,
    role: "admin"
  };

  // Las cuentas demo tienen una clave pública: nunca se crean en producción.
  return env.NODE_ENV === "production" ? [admin] : [admin, ...usuariosDemo];
}
