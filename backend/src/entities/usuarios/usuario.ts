export type Rol = "admin" | "instructor" | "agremiado";

/** Cuenta tal como se muestra en la gestión de usuarios; nunca incluye la clave. */
export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
};
