import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2
});

export async function ensureRedis() {
  if (redis.status === "end") {
    return;
  }

  if (redis.status === "wait") {
    await redis.connect();
  }

  await redis.ping();
}
