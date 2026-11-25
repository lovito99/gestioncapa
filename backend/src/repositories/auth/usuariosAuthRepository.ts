import { pool } from "../../shared/database.js";
import type { CredencialesUsuario, NuevoDocente, PublicUser } from "../../entities/auth/usuarioPublico.js";

export type UsuariosAuthRepository = {
  buscarPorEmail(email: string): Promise<CredencialesUsuario | null>;
  /** Solo usuarios activos: un usuario desactivado deja de estar autenticado. */
  buscarActivoPorId(id: number): Promise<PublicUser | null>;
  /** Idempotente: no cambia la clave de un administrador que ya existe. */
  insertarAdministrador(nombre: string, email: string, hash: string): Promise<void>;
  /** Devuelve null si el DNI o el correo ya están registrados; los índices resuelven carreras entre instancias. */
  registrarDocente(datos: NuevoDocente, hash: string): Promise<PublicUser | null>;
};

const restriccionesDuplicado = ["usersDniUnico", "usersCorreoNormalizadoUnico", "users_email_key"];

export const usuariosAuthRepository: UsuariosAuthRepository = {
  async buscarPorEmail(email) {
    const result = await pool.query<CredencialesUsuario>(
      `
      select id, name, email, role, password_hash, active
      from users
      where email = $1
      limit 1
    `,
      [email]
    );
    return result.rows[0] ?? null;
  },
  async buscarActivoPorId(id) {
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
  },
  async insertarAdministrador(nombre, email, hash) {
    await pool.query(
      `
      insert into users (name, email, password_hash, role)
      values ($1, $2, $3, 'admin')
      on conflict (email) do nothing
    `,
      [nombre, email, hash]
    );
  },
  async registrarDocente(datos, hash) {
    const cliente = await pool.connect();
    try {
      await cliente.query("begin");
      const usuario = (await cliente.query<PublicUser>(`insert into users
      (name,nombres,apellidos,email,celular,dni,password_hash,role)
      values($1,$2,$3,$4,$5,$6,$7,'agremiado') returning id,name,email,role`,
      [`${datos.nombres} ${datos.apellidos}`, datos.nombres, datos.apellidos, datos.email,
        datos.celular, datos.dni, hash])).rows[0]!;
      await cliente.query(`insert into "auditoriaRegistro"("usuarioId","aceptaPrivacidad","versionAviso") values($1,true,$2)`, [usuario.id, "https://www.cpppregion-cusco.com/privacidad.html"]);
      await cliente.query("commit");
      return usuario;
    } catch (error) {
      await cliente.query("rollback");
      const fallo = error as { code?: string; constraint?: string };
      if (fallo.code === "23505" && restriccionesDuplicado.includes(fallo.constraint ?? "")) return null;
      throw error;
    } finally {
      cliente.release();
    }
  }
};
