import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
import type { AltaUsuarioDto, ConsultaUsuariosDto, EdicionUsuarioDto, PaginaUsuariosDto } from "../../dto/usuarios/usuarioDto.js";
import type { Usuario } from "../../entities/usuarios/usuario.js";
import type { UsuariosRepository, UsuariosTransaccion } from "../../repositories/usuarios/usuariosRepository.js";

export type UsuariosServiceDeps = {
  repositorio: UsuariosRepository;
  cifrar: (clave: string) => Promise<string>;
};

const sinPermiso = () => new ErrorAplicacion(403, "SIN_PERMISO", "No tienes permiso para gestionar usuarios.");
const correoRegistrado = () => new ErrorAplicacion(409, "CORREO_REGISTRADO", "Este correo ya tiene una cuenta.");

/** El rol se vuelve a comprobar dentro del bloqueo: el JWT pudo emitirse antes de un cambio de rol. */
async function exigirAdministrador(tx: UsuariosTransaccion, actorId: number) {
  await tx.bloquearGestion();
  if (!(await tx.esAdminActivo(actorId))) throw sinPermiso();
}

export function crearUsuariosService({ repositorio, cifrar }: UsuariosServiceDeps) {
  return {
    async listar({ buscar, pagina, tamanoPagina }: ConsultaUsuariosDto): Promise<PaginaUsuariosDto> {
      const { items, total } = await repositorio.buscar({ buscar, limite: tamanoPagina, desplazamiento: (pagina - 1) * tamanoPagina });
      return { items, total, pagina, tamanoPagina };
    },

    async crear({ password, motivo, ...datos }: AltaUsuarioDto, actorId: number): Promise<Usuario> {
      const hash = await cifrar(password);
      return repositorio.enTransaccion(async (tx) => {
        await exigirAdministrador(tx, actorId);
        const usuario = await tx.crear({ ...datos, hash });
        if (!usuario) throw correoRegistrado();
        await tx.auditar({ usuarioId: usuario.id, actorId, nuevo: datos.rol, motivo });
        return usuario;
      });
    },

    async actualizar(id: number, { motivo, ...datos }: EdicionUsuarioDto, actorId: number): Promise<Usuario> {
      if (id === actorId && (datos.rol !== "admin" || !datos.activo)) {
        throw new ErrorAplicacion(409, "CUENTA_PROPIA", "No puedes desactivar tu propia cuenta ni retirar tu rol de administrador.");
      }
      return repositorio.enTransaccion(async (tx) => {
        await exigirAdministrador(tx, actorId);
        const anterior = await tx.bloquearUsuario(id);
        if (!anterior) throw new ErrorAplicacion(404, "USUARIO_NO_EXISTE", "El usuario no existe.");
        const usuario = await tx.actualizar(id, datos);
        if (!usuario) throw correoRegistrado();
        await tx.auditar({ usuarioId: usuario.id, actorId, anterior: `${anterior.rol}:${anterior.activo}`, nuevo: `${datos.rol}:${datos.activo}`, motivo });
        return usuario;
      });
    }
  };
}

export type UsuariosService = ReturnType<typeof crearUsuariosService>;
