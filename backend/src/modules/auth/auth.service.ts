import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import { env } from "../../config/env.js";
import { pool } from "../../shared/database.js";
import { usuariosSeed, type EnvSeed } from "./usuarios-seed.js";

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type UserRow = PublicUser & {
  password_hash: string;
  active: boolean;
};

export async function ensureAdminUser() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  await pool.query(
    `
      insert into users (name, email, password_hash, role)
      values ($1, $2, $3, 'admin')
      on conflict (email) do nothing
    `,
    [env.ADMIN_NAME, env.ADMIN_EMAIL.toLowerCase(), passwordHash]
  );
}

// Idempotente: no duplica ni cambia la clave de usuarios que ya existen.
export async function sembrarUsuarios(consultor: Pick<Pool, "query"> = pool, configuracion: EnvSeed = env) {
  const usuarios = usuariosSeed(configuracion);

  for (const usuario of usuarios) {
    const passwordHash = await bcrypt.hash(usuario.password, 12);

    await consultor.query(
      `
        insert into users (name, email, password_hash, role)
        values ($1, $2, $3, $4)
        on conflict (email) do nothing
      `,
      [usuario.name, usuario.email, passwordHash, usuario.role]
    );
  }

  return usuarios;
}

/** Devuelve el usuario, null si las credenciales no coinciden o "inactivo". */
export async function validateUser(email: string, password: string) {
  const result = await pool.query<UserRow>(
    `
      select id, name, email, role, password_hash, active
      from users
      where email = $1
      limit 1
    `,
    [email.toLowerCase()]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return null;
  }

  // Se informa solo tras validar la contraseña, para no revelar qué cuentas existen.
  if (!user.active) {
    return "inactivo" as const;
  }

  return toPublicUser(user);
}

/** Solo usuarios activos: un usuario desactivado deja de estar autenticado. */
export async function findUserById(id: number) {
  const result = await pool.query<PublicUser>(
    `
      select id, name, email, role
      from users
      where id = $1 and active
      limit 1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role
  };
}
