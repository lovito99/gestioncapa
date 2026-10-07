import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { findUserById, validateUser, type PublicUser } from "./auth.service.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

type JwtPayload = {
  sub: string;
  email: string;
};

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await validateUser(body.email, body.password);

    if (!user) {
      return reply.code(401).send({
        code: "CREDENCIALES_INVALIDAS",
        message: "Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo."
      });
    }

    const token = app.jwt.sign(
      { sub: String(user.id), email: user.email },
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Conserva `user` para consumidores existentes y ofrece el contrato de la UI.
    return { token, user, usuario: toUsuario(user) };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    await readBearerToken(request, app);
    // JWT stateless: el cliente descarta el token; no se revoca un token emitido.
    return reply.code(204).send();
  });

  app.get("/api/auth/me", async (request, reply) => {
    const payload = await readBearerToken(request, app);
    const userId = Number(payload.sub);

    if (!Number.isFinite(userId)) {
      return reply.unauthorized("Token invalido");
    }

    const user = await findUserById(userId);

    if (!user) {
      return reply.unauthorized("Usuario no encontrado");
    }

    return { user, usuario: toUsuario(user) };
  });
}

function toUsuario(user: PublicUser) {
  const cargos: Record<string, string> = {
    ADMIN: "Administrador",
    COORDINADOR: "Coordinador",
    INSTRUCTOR: "Instructor",
    PARTICIPANTE: "Participante"
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

async function readBearerToken(request: FastifyRequest, app: FastifyInstance) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    throw app.httpErrors.unauthorized("Token requerido");
  }

  return app.jwt.verify<JwtPayload>(authorization.slice("Bearer ".length));
}
