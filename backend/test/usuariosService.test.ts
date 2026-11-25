import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Rol, Usuario } from "../src/entities/usuarios/usuario.js";
import type { UsuariosRepository, UsuariosTransaccion } from "../src/repositories/usuarios/usuariosRepository.js";
import { crearUsuariosService } from "../src/services/usuarios/usuariosService.js";
import { ErrorAplicacion } from "../src/shared/errorAplicacion.js";

type Fila = Usuario & { hash: string };
type Auditoria = { usuarioId: string; actorId: number; anterior?: string; nuevo: string; motivo: string };

/** Repositorio en memoria: una transacción fallida descarta sus cambios, como PostgreSQL. */
function repositorioFalso(filas: Fila[]) {
  let usuarios = filas.map((fila) => ({ ...fila }));
  let auditorias: Auditoria[] = [];
  const publico = ({ hash, ...usuario }: Fila): Usuario => usuario;
  const correoOcupado = (email: string, salvo?: string) => usuarios.some((u) => u.email === email && u.id !== salvo);
  const tx: UsuariosTransaccion = {
    bloquearGestion: async () => {},
    esAdminActivo: async (id) => usuarios.some((u) => u.id === String(id) && u.rol === "admin" && u.activo),
    bloquearUsuario: async (id) => {
      const usuario = usuarios.find((u) => u.id === String(id));
      return usuario ? { rol: usuario.rol, activo: usuario.activo } : null;
    },
    crear: async ({ hash, ...datos }) => {
      if (correoOcupado(datos.email)) return null;
      const fila = { ...datos, hash, id: String(usuarios.length + 100) };
      usuarios.push(fila);
      return publico(fila);
    },
    actualizar: async (id, datos) => {
      if (correoOcupado(datos.email, String(id))) return null;
      const fila = usuarios.find((u) => u.id === String(id))!;
      Object.assign(fila, datos);
      return publico(fila);
    },
    auditar: async (registro) => { auditorias.push(registro); }
  };
  const repositorio: UsuariosRepository = {
    buscar: async ({ buscar, limite, desplazamiento }) => {
      const coincidencias = usuarios.filter((u) => `${u.nombre} ${u.email}`.toLowerCase().includes(buscar.toLowerCase()));
      return { items: coincidencias.slice(desplazamiento, desplazamiento + limite).map(publico), total: coincidencias.length };
    },
    enTransaccion: async (trabajo) => {
      const copia = { usuarios: usuarios.map((u) => ({ ...u })), auditorias: [...auditorias] };
      try {
        return await trabajo(tx);
      } catch (error) {
        ({ usuarios, auditorias } = copia);
        throw error;
      }
    }
  };
  return { repositorio, usuarios: () => usuarios, auditorias: () => auditorias };
}

const fila = (id: string, rol: Rol, activo = true): Fila =>
  ({ id, nombre: `Persona ${id}`, email: `p${id}@cppp.local`, rol, activo, hash: "previo" });
const base = () => [fila("1", "admin"), fila("2", "agremiado"), fila("3", "admin", false)];
const servicio = (repositorio: UsuariosRepository) =>
  crearUsuariosService({ repositorio, cifrar: async (clave) => `cifrada:${clave}` });

async function rechazo(promesa: Promise<unknown>, status: number, code: string, message: string) {
  await assert.rejects(promesa, (error) => {
    assert.ok(error instanceof ErrorAplicacion);
    assert.deepEqual({ status: error.status, code: error.code, message: error.message }, { status, code, message });
    return true;
  });
}

const alta = { nombre: "Docente", email: "nuevo@cppp.local", rol: "instructor" as const, activo: true, password: "abcdefgh", motivo: "Alta" };
const edicion = { nombre: "Persona 2", email: "p2@cppp.local", rol: "instructor" as const, activo: false, motivo: "Cambio de funciones" };

describe("T-26 usuarios: alta", () => {
  test("guarda la clave cifrada, no la devuelve y audita el rol nuevo", async () => {
    const falso = repositorioFalso(base());
    const usuario = await servicio(falso.repositorio).crear(alta, 1);
    assert.deepEqual(Object.keys(usuario).sort(), ["activo", "email", "id", "nombre", "rol"]);
    assert.equal(falso.usuarios().find((u) => u.id === usuario.id)!.hash, "cifrada:abcdefgh");
    assert.deepEqual(falso.auditorias(), [{ usuarioId: usuario.id, actorId: 1, nuevo: "instructor", motivo: "Alta" }]);
  });

  test("un actor que ya no es administrador activo recibe 403 y no se crea nada", async () => {
    const falso = repositorioFalso(base());
    await rechazo(servicio(falso.repositorio).crear(alta, 3), 403, "SIN_PERMISO", "No tienes permiso para gestionar usuarios.");
    assert.equal(falso.usuarios().length, 3);
  });

  test("un correo ya registrado devuelve 409 sin auditoría", async () => {
    const falso = repositorioFalso(base());
    await rechazo(servicio(falso.repositorio).crear({ ...alta, email: "p2@cppp.local" }, 1), 409, "CORREO_REGISTRADO", "Este correo ya tiene una cuenta.");
    assert.deepEqual(falso.auditorias(), []);
  });
});

describe("T-26 usuarios: edición", () => {
  test("actualiza y audita el estado anterior y el nuevo", async () => {
    const falso = repositorioFalso(base());
    const usuario = await servicio(falso.repositorio).actualizar(2, edicion, 1);
    assert.deepEqual(usuario, { id: "2", nombre: "Persona 2", email: "p2@cppp.local", rol: "instructor", activo: false });
    assert.deepEqual(falso.auditorias(), [{ usuarioId: "2", actorId: 1, anterior: "agremiado:true", nuevo: "instructor:false", motivo: "Cambio de funciones" }]);
  });

  test("el administrador no puede retirarse el rol ni desactivarse", async () => {
    const falso = repositorioFalso(base());
    const mensaje = "No puedes desactivar tu propia cuenta ni retirar tu rol de administrador.";
    await rechazo(servicio(falso.repositorio).actualizar(1, { ...edicion, rol: "agremiado", activo: true }, 1), 409, "CUENTA_PROPIA", mensaje);
    await rechazo(servicio(falso.repositorio).actualizar(1, { ...edicion, rol: "admin", activo: false }, 1), 409, "CUENTA_PROPIA", mensaje);
  });

  test("el administrador sí puede editar sus datos conservando rol y estado", async () => {
    const falso = repositorioFalso(base());
    const usuario = await servicio(falso.repositorio).actualizar(1, { ...edicion, email: "p1@cppp.local", rol: "admin", activo: true }, 1);
    assert.equal(usuario.rol, "admin");
  });

  test("un usuario inexistente devuelve 404", async () => {
    await rechazo(servicio(repositorioFalso(base()).repositorio).actualizar(999, edicion, 1), 404, "USUARIO_NO_EXISTE", "El usuario no existe.");
  });

  test("un actor sin permiso recibe 403 y un correo ajeno 409, sin cambios", async () => {
    const falso = repositorioFalso(base());
    await rechazo(servicio(falso.repositorio).actualizar(2, edicion, 3), 403, "SIN_PERMISO", "No tienes permiso para gestionar usuarios.");
    await rechazo(servicio(falso.repositorio).actualizar(2, { ...edicion, email: "p1@cppp.local" }, 1), 409, "CORREO_REGISTRADO", "Este correo ya tiene una cuenta.");
    assert.equal(falso.usuarios().find((u) => u.id === "2")!.rol, "agremiado");
    assert.deepEqual(falso.auditorias(), []);
  });
});

test("T-26 usuarios: la lista pagina con el filtro y devuelve el total", async () => {
  const filas = Array.from({ length: 5 }, (_, i) => fila(String(i + 1), "agremiado"));
  const pagina = await servicio(repositorioFalso(filas).repositorio).listar({ pagina: 2, tamanoPagina: 2, buscar: "persona" });
  assert.deepEqual(pagina.items.map((u) => u.id), ["3", "4"]);
  assert.deepEqual({ total: pagina.total, pagina: pagina.pagina, tamanoPagina: pagina.tamanoPagina }, { total: 5, pagina: 2, tamanoPagina: 2 });
});
