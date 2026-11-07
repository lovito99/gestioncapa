import { randomUUID } from 'node:crypto';
import { bloqueoLogin, registrarFalloLogin, aceptarLogin, revocarToken, tokenDeCabecera } from './seguridadAcceso.js';
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { validateUser, type PublicUser } from "./auth.service.js";
import { textoObligatorio } from "../../shared/validacion.js";

// El acceso de cada ruta lo aplica la matriz de backend/src/plugins/permisos.ts.

const loginSchema = z.object({
  email: textoObligatorio("Ingresa tu correo electrónico").pipe(z.email("Ingresa un correo válido")),
  password: z.string({ error: "Ingresa tu contraseña" }).min(1, "Ingresa tu contraseña")
});

function responderBloqueo(reply: FastifyReply, segundos: number) {
  return reply.header('Retry-After', String(segundos)).code(423).send({
    code: 'ACCESO_BLOQUEADO',
    message: 'Acceso bloqueado por intentos fallidos. Espera 15 minutos e intenta de nuevo.'
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const bloqueado = await bloqueoLogin(body.email);
    if (bloqueado > 0) return responderBloqueo(reply, bloqueado);
    const user = await validateUser(body.email, body.password);

    if (!user) {
      const espera = await registrarFalloLogin(body.email);
      if (espera > 0) return responderBloqueo(reply, espera);
      return reply.code(401).send({
        code: "CREDENCIALES_INVALIDAS",
        message: "Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo."
      });
    }

    if (user === "inactivo") {
      return reply.code(403).send({
        code: "USUARIO_INACTIVO",
        message: "Tu cuenta está desactivada. Comunícate con el administrador."
      });
    }

    const espera = await aceptarLogin(body.email);
    if (espera > 0) return responderBloqueo(reply, espera);
    const token = app.jwt.sign(
      { sub: String(user.id), email: user.email, jti: randomUUID() },
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Conserva `user` para consumidores existentes y ofrece el contrato de la UI.
    return { token, user, usuario: toUsuario(user) };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const payload = await request.jwtVerify<{ exp?: number }>();
    await revocarToken(tokenDeCabecera(request.headers.authorization), payload.exp);
    return reply.code(204).send();
  });

  app.get("/api/auth/me", async (request) => {
    const user = request.usuario!;
    return { user, usuario: toUsuario(user) };
  });
}

function toUsuario(user: PublicUser) {
  const cargos: Record<string, string> = {
    ADMIN: "Administrador",
    COORDINADOR: "Coordinador",
    INSTRUCTOR: "Instructor",
    PARTICIPANTE: "Agremiado"
  };
  const rol = user.role.toUpperCase();
  return {
    id: String(user.id),
    nombre: user.name,
    email: user.email,
    rol,
    cargo: cargos[rol] ?? user.role
  };
}
