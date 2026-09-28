import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export async function registerHttpPlugins(app: FastifyInstance) {
  await app.register(helmet);
  await app.register(sensible);
  await app.register(jwt, {
    secret: env.JWT_SECRET
  });
  await app.register(cors, {
    origin: env.NODE_ENV === "development" ? true : env.FRONTEND_URL,
    credentials: true
  });
}
