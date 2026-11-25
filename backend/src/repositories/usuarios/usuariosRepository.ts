import type { Pool } from "pg";
import { esViolacionUnica, type Consultor } from "../../shared/database.js";
import { conTransaccion } from "../../shared/transaccion.js";
import type { Rol, Usuario } from "../../entities/usuarios/usuario.js";

type DatosUsuario = { nombre: string; email: string; rol: Rol; activo: boolean };
type Auditoria = { usuarioId: string; actorId: number; anterior?: string; nuevo: string; motivo: string };

/** Operaciones disponibles dentro de la transacción de gestión de usuarios. */
export type UsuariosTransaccion = {
  /** Serializa las altas y ediciones para que no se pierda el último administrador. */
  bloquearGestion(): Promise<void>;
  esAdminActivo(id: number): Promise<boolean>;
  bloquearUsuario(id: number): Promise<{ rol: string; activo: boolean } | null>;
  /** Devuelve null si el correo ya pertenece a otra cuenta; la transacción debe abandonarse. */
  crear(datos: DatosUsuario & { hash: string }): Promise<Usuario | null>;
  /** Devuelve null si el correo ya pertenece a otra cuenta; la transacción debe abandonarse. */
  actualizar(id: number, datos: DatosUsuario): Promise<Usuario | null>;
  auditar(registro: Auditoria): Promise<void>;
};

export type UsuariosRepository = {
  buscar(filtro: { buscar: string; limite: number; desplazamiento: number }): Promise<{ items: Usuario[]; total: number }>;
  enTransaccion<T>(trabajo: (tx: UsuariosTransaccion) => Promise<T>): Promise<T>;
};

const columnas = "id::text,name as nombre,email,role as rol,active as activo";
// Bloqueo consultivo compartido por todas las operaciones de gestión de usuarios.
const claveGestion = 351426;

async function siCorreoLibre(consulta: Promise<{ rows: Usuario[] }>) {
  try {
    return (await consulta).rows[0] ?? null;
  } catch (error) {
    if (esViolacionUnica(error)) return null;
    throw error;
  }
}

function transaccion(cliente: Consultor): UsuariosTransaccion {
  return {
    async bloquearGestion() {
      await cliente.query(`select pg_advisory_xact_lock(${claveGestion})`);
    },
    async esAdminActivo(id) {
      return Boolean((await cliente.query("select id from users where id=$1 and role='admin' and active for share", [id])).rowCount);
    },
    async bloquearUsuario(id) {
      return (await cliente.query<{ rol: string; activo: boolean }>("select role as rol,active as activo from users where id=$1 for update", [id])).rows[0] ?? null;
    },
    crear({ nombre, email, hash, rol, activo }) {
      return siCorreoLibre(cliente.query<Usuario>(`insert into users(name,email,password_hash,role,active) values($1,$2,$3,$4,$5) returning ${columnas}`,
        [nombre, email, hash, rol, activo]));
    },
    actualizar(id, { nombre, email, rol, activo }) {
      return siCorreoLibre(cliente.query<Usuario>(`update users set name=$2,email=$3,role=$4,active=$5,updated_at=now() where id=$1 returning ${columnas}`,
        [id, nombre, email, rol, activo]));
    },
    async auditar({ usuarioId, actorId, anterior, nuevo, motivo }) {
      await cliente.query(`insert into "auditoriaRoles"("usuarioId","actorId",anterior,nuevo,motivo) values($1,$2,$3,$4,$5)`,
        [usuarioId, actorId, anterior ?? null, nuevo, motivo]);
    }
  };
}

export function crearUsuariosRepository(pool: Pick<Pool, "query" | "connect">): UsuariosRepository {
  return {
    async buscar({ buscar, limite, desplazamiento }) {
      const filtro = "strpos(lower(name||' '||email),lower($1))>0";
      const items = (await pool.query<Usuario>(`select ${columnas} from users where ${filtro} order by name,id limit $2 offset $3`, [buscar, limite, desplazamiento])).rows;
      const total = (await pool.query<{ total: number }>(`select count(*)::int as total from users where ${filtro}`, [buscar])).rows[0]!.total;
      return { items, total };
    },
    enTransaccion(trabajo) {
      return conTransaccion(pool, (cliente) => trabajo(transaccion(cliente)));
    }
  };
}
