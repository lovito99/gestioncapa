import type { PoolClient } from "pg";
import type { IdentidadGoogle } from "../../entities/auth/identidadGoogle.js";
import type { CredencialesUsuario, NuevoDocente, PublicUser } from "../../entities/auth/usuarioPublico.js";
import { pool } from "../../shared/database.js";
import { conTransaccion } from "../../shared/transaccion.js";
import { insertarDocente, restriccionesDuplicado, usuariosAuthRepository } from "./usuariosAuthRepository.js";

async function insertarVinculo(cliente: PoolClient, identidad: IdentidadGoogle, usuario: PublicUser) {
  await cliente.query('insert into "identidadesGoogle" (emisor,sujeto,"usuarioId") values ($1,$2,$3)',
    [identidad.emisor, identidad.sujeto, usuario.id]);
  return usuario;
}

async function resolverColision(limite: number, trabajo: (cliente: PoolClient) => Promise<PublicUser | null>) {
  try {
    return await conTransaccion(pool, async cliente => {
      if (Date.now() >= limite) throw new Error("El plazo para confirmar la identidad venció.");
      await cliente.query("set local transaction_timeout = '12s'");
      return trabajo(cliente);
    });
  } catch (error) {
    const fallo = error as { code?: string; constraint?: string };
    if (fallo.code === "23505" && [...restriccionesDuplicado, "identidadesGoogle_pkey", "identidadesGoogle_usuarioId_key"].includes(fallo.constraint ?? "")) return null;
    throw error;
  }
}

export const identidadesGoogleRepository = {
  async vinculada(identidad: IdentidadGoogle) {
    return (await pool.query<PublicUser & { active: boolean }>(
      `select u.id,u.name,u.email,u.role,u.active from "identidadesGoogle" g
       join users u on u.id=g."usuarioId" where g.emisor=$1 and g.sujeto=$2`,
      [identidad.emisor, identidad.sujeto])).rows[0] ?? null;
  },
  porCorreo: usuariosAuthRepository.buscarPorEmail,
  vincular(identidad: IdentidadGoogle, confirmada: CredencialesUsuario, limite: number) {
    return resolverColision(limite, async (cliente) => {
      const cuenta = (await cliente.query<PublicUser>(
        `select id,name,email,role from users
         where id=$1 and lower(email)=$2 and password_hash=$3 and active and role='agremiado' for update`,
        [confirmada.id, identidad.correo, confirmada.password_hash])).rows[0];
      return cuenta ? insertarVinculo(cliente, identidad, cuenta) : null;
    });
  },
  registrar(identidad: IdentidadGoogle, datos: Omit<NuevoDocente, "email">, limite: number) {
    return resolverColision(limite, async (cliente) =>
      insertarVinculo(cliente, identidad, await insertarDocente(cliente, { ...datos, email: identidad.correo }, null)));
  }
};

export type IdentidadesGoogleRepository = typeof identidadesGoogleRepository;
