import bcrypt from "bcryptjs";
import { pool } from "../shared/database.js";
import { usuariosController } from "../controllers/usuarios/usuariosController.js";
import { crearUsuariosRepository } from "../repositories/usuarios/usuariosRepository.js";
import { crearUsuariosService } from "../services/usuarios/usuariosService.js";

/** Raíz de composición: el único lugar del módulo que conoce el pool y el cifrado concreto. */
export const registrarUsuarios = usuariosController(crearUsuariosService({
  repositorio: crearUsuariosRepository(pool),
  cifrar: (clave) => bcrypt.hash(clave, 12)
}));
