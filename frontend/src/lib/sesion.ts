import type { Usuario } from '@/types/api'

const CLAVE_TOKEN = 'gc.token'
const CLAVE_USUARIO = 'gc.usuario'

/**
 * Guarda la sesión en sessionStorage (se borra al cerrar la pestaña).
 * Cuando el backend esté listo, lo ideal es que el token viaje en una cookie
 * httpOnly y aquí solo se guarde el usuario.
 */
export const sesion = {
  obtenerToken(): string | null {
    return sessionStorage.getItem(CLAVE_TOKEN)
  },

  obtenerUsuario(): Usuario | null {
    const crudo = sessionStorage.getItem(CLAVE_USUARIO)
    if (!crudo) return null
    try {
      return JSON.parse(crudo) as Usuario
    } catch {
      return null
    }
  },

  guardar(token: string, usuario: Usuario) {
    sessionStorage.setItem(CLAVE_TOKEN, token)
    sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
  },

  cerrar() {
    sessionStorage.removeItem(CLAVE_TOKEN)
    sessionStorage.removeItem(CLAVE_USUARIO)
  },
}
