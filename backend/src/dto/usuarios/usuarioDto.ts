import { z } from "zod";
import type { Usuario } from "../../entities/usuarios/usuario.js";

const rol = z.enum(["admin", "instructor", "agremiado"]);
const campos = {
  nombre: z.string().trim().min(1).max(120),
  email: z.email().trim().toLowerCase().max(180),
  rol,
  activo: z.boolean(),
  motivo: z.string().trim().min(1).max(1000)
};
// bcrypt solo usa los primeros 72 bytes: una clave más larga se rechaza en lugar de truncarse.
const clave = z.string().min(8).refine((valor) => Buffer.byteLength(valor, "utf8") <= 72, "La contraseña supera los 72 bytes permitidos.");

export const esquemaAlta = z.object({ ...campos, password: clave }).strict();
export const esquemaEdicion = z.object(campos).strict();
export const esquemaConsulta = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanoPagina: z.coerce.number().int().min(1).max(50).default(20),
  buscar: z.string().trim().max(180).default("")
});
export const esquemaIdUsuario = z.object({ id: z.coerce.number().int().positive().safe() });

export type AltaUsuarioDto = z.infer<typeof esquemaAlta>;
export type EdicionUsuarioDto = z.infer<typeof esquemaEdicion>;
export type ConsultaUsuariosDto = z.infer<typeof esquemaConsulta>;
export type PaginaUsuariosDto = { items: Usuario[]; total: number; pagina: number; tamanoPagina: number };
