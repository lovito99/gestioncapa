import type { DatosRegistro } from "../../dto/auth/authDto.js";
import { randomUUID } from "node:crypto";
import type { PublicUser, ReclamosSesion } from "../../entities/auth/usuarioPublico.js";
import type { SeguridadAccesoRepository } from "../../repositories/auth/seguridadAccesoRepository.js";
import type { UsuariosAuthRepository } from "../../repositories/auth/usuariosAuthRepository.js";

export type AuthServiceDeps = {
  usuarios: UsuariosAuthRepository;
  acceso: SeguridadAccesoRepository;
  claves: { cifrar(clave: string): Promise<string>; comparar(clave: string, hash: string): Promise<boolean> };
  configuracion: { ADMIN_NAME: string; ADMIN_EMAIL: string; ADMIN_PASSWORD: string };
};

export type ResultadoLogin =
  | { tipo: "aceptado"; usuario: PublicUser }
  | { tipo: "bloqueado"; segundos: number }
  | { tipo: "credencialesInvalidas" }
  | { tipo: "inactivo" };

export type ResultadoRegistro =
  | { tipo: "creado"; usuario: PublicUser }
  | { tipo: "limite"; espera: number }
  | { tipo: "duplicado" };

export function crearAuthService({ usuarios, acceso, claves, configuracion }: AuthServiceDeps) {
  return {
    async login(email: string, password: string): Promise<ResultadoLogin> {
      const bloqueado = await acceso.bloqueoLogin(email);
      if (bloqueado > 0) return { tipo: "bloqueado", segundos: bloqueado };

      const cuenta = await usuarios.buscarPorEmail(email.toLowerCase());
      if (!cuenta || !(await claves.comparar(password, cuenta.password_hash))) {
        const espera = await acceso.registrarFalloLogin(email);
        return espera > 0 ? { tipo: "bloqueado", segundos: espera } : { tipo: "credencialesInvalidas" };
      }
      // Se informa solo tras validar la contraseña, para no revelar qué cuentas existen.
      if (!cuenta.active) return { tipo: "inactivo" };

      const espera = await acceso.aceptarLogin(email);
      if (espera > 0) return { tipo: "bloqueado", segundos: espera };
      return { tipo: "aceptado", usuario: { id: Number(cuenta.id), name: cuenta.name, email: cuenta.email, role: cuenta.role } };
    },

    async registrar({ dni, nombres, apellidos, email, celular, password }: DatosRegistro, direccion: string): Promise<ResultadoRegistro> {
      // El límite por dirección acota el trabajo de bcrypt antes de crear la cuenta.
      const espera = await acceso.limitarRegistros(direccion);
      if (espera > 0) return { tipo: "limite", espera };
      const usuario = await usuarios.registrarDocente({ dni, nombres, apellidos, email, celular }, await claves.cifrar(password));
      return usuario ? { tipo: "creado", usuario } : { tipo: "duplicado" };
    },

    /** Cada token lleva un identificador propio para poder revocarlo sin afectar otras sesiones. */
    reclamosSesion(usuario: PublicUser): ReclamosSesion {
      return { sub: String(usuario.id), email: usuario.email, jti: randomUUID() };
    },

    cerrarSesion(token: string, expiracion?: number) {
      return acceso.revocarToken(token, expiracion);
    },

    /** Usado por el guard en cada solicitud; null si el usuario no existe o está inactivo. */
    buscarUsuarioActivo(id: number) {
      return usuarios.buscarActivoPorId(id);
    },

    async asegurarAdministrador() {
      const hash = await claves.cifrar(configuracion.ADMIN_PASSWORD);
      await usuarios.insertarAdministrador(configuracion.ADMIN_NAME, configuracion.ADMIN_EMAIL.toLowerCase(), hash);
    }
  };
}

export type AuthService = ReturnType<typeof crearAuthService>;
