import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { authController } from "../controllers/auth/authController.js";
import { crearSeguridadAccesoRepository } from "../repositories/auth/seguridadAccesoRepository.js";
import { usuariosAuthRepository } from "../repositories/auth/usuariosAuthRepository.js";
import { crearAuthService } from "../services/auth/authService.js";

// Se pasa el objeto env, no una copia: los límites y la configuración se leen en cada uso.
const acceso = crearSeguridadAccesoRepository(env);
const servicio = crearAuthService({
  usuarios: usuariosAuthRepository,
  acceso,
  claves: { cifrar: (clave) => bcrypt.hash(clave, 12), comparar: (clave, hash) => bcrypt.compare(clave, hash) },
  configuracion: env
});

export const authRoutes = authController(servicio, env);

/** Piezas que usa el arranque: el guard de autorización y la cuenta de administrador. */
export const findUserById = servicio.buscarUsuarioActivo;
export const ensureAdminUser = servicio.asegurarAdministrador;
export const { tokenRevocado, limitarPeticiones } = acceso;
