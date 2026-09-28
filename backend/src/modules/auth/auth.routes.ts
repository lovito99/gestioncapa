import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";
import { findUserById, validateUser } from "./auth.service.js";

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
      return reply.unauthorized("Credenciales invalidas");
    }

    const token = app.jwt.sign(
      { sub: String(user.id), email: user.email },
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return { token, user };
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

    return { user };
  });
}

async function readBearerToken(request: FastifyRequest, app: FastifyInstance) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    throw app.httpErrors.unauthorized("Token requerido");
  }

  return app.jwt.verify<JwtPayload>(authorization.slice("Bearer ".length));
}
