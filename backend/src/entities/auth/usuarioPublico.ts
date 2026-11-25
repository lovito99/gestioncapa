/** Datos de la cuenta que viajan en la sesión; nunca incluyen la clave. */
export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

/** Fila usada solo para validar credenciales. */
export type CredencialesUsuario = PublicUser & {
  password_hash: string;
  active: boolean;
};

/** Datos con los que se crea la cuenta de un docente agremiado. */
export type NuevoDocente = { dni: string; nombres: string; apellidos: string; email: string; celular: string };

/** Datos que se firman en el token de sesión; `jti` permite revocar ese token. */
export type ReclamosSesion = { sub: string; email: string; jti: string };
