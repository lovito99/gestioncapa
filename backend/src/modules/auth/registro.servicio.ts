import bcrypt from 'bcryptjs';
import { pool } from '../../shared/database.js';
import { env } from '../../config/env.js';
import type { PublicUser } from './auth.service.js';
import type { DatosRegistro } from './registro.validacion.js';

/** Los índices resuelven también carreras entre instancias del servidor. */
export async function registrarDocente(datos: DatosRegistro): Promise<PublicUser | null> {
  const hash = await bcrypt.hash(datos.password, 12);
  const cliente = await pool.connect();
  try {
    await cliente.query('begin');
    const usuario = (await cliente.query<PublicUser>(`insert into users
      (name,nombres,apellidos,email,celular,dni,password_hash,role,organization_id)
      values($1,$2,$3,$4,$5,$6,$7,'participante',$8) returning id,name,email,role`,
      [`${datos.nombres} ${datos.apellidos}`, datos.nombres, datos.apellidos, datos.email,
        datos.celular, datos.dni, hash, env.cpppOrganizacionId])).rows[0]!;
    await cliente.query(`insert into "auditoriaRegistro"("usuarioId","aceptaPrivacidad","versionAviso") values($1,true,$2)`, [usuario.id, 'https://www.cpppregion-cusco.com/privacidad.html']);
    await cliente.query('commit');
    return usuario;
  } catch (error) {
    await cliente.query('rollback');
    const fallo = error as { code?: string; constraint?: string };
    if (fallo.code === '23505' && ['usersDniUnico', 'usersCorreoNormalizadoUnico', 'users_email_key'].includes(fallo.constraint ?? '')) return null;
    throw error;
  } finally { cliente.release(); }
}
