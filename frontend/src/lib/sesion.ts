import type { Usuario } from '@/types/api'
import { tokenExpirado } from './token'

const CLAVE_TOKEN = 'gc.token'
const CLAVE_USUARIO = 'gc.usuario'
/** Aviso para el login: sobrevive a la recarga que hace el interceptor de 401. */
const CLAVE_EXPIRADA = 'gc.sesionExpirada'

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

  /** Token ausente o con `exp` vencido. */
  expirada(): boolean {
    return tokenExpirado(this.obtenerToken())
  },

  guardar(token: string, usuario: Usuario) {
    sessionStorage.removeItem(CLAVE_EXPIRADA)
    sessionStorage.setItem(CLAVE_TOKEN, token)
    sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario))
  },

  cerrar() {
    sessionStorage.removeItem(CLAVE_TOKEN)
    sessionStorage.removeItem(CLAVE_USUARIO)
  },

  /** Cierra la sesión local y deja el aviso «Tu sesión expiró» para el login. */
  expirar() {
    this.cerrar()
    sessionStorage.setItem(CLAVE_EXPIRADA, '1')
  },

  expiro(): boolean {
    return sessionStorage.getItem(CLAVE_EXPIRADA) === '1'
  },
}
