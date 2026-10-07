/**
 * Indica si el token ya no sirve para entrar a una ruta protegida.
 * Solo lee `exp` del JWT: la firma la verifica el servidor. Los tokens demo
 * (`demo-<id>`) y los JWT ilegibles o sin `exp` quedan a criterio del servidor.
 */
export function tokenExpirado(token: string | null, ahoraMs = Date.now()) {
  if (!token) return true

  const partes = token.split('.')
  if (partes.length !== 3) return false

  try {
    const base64 = partes[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(base64)) as { exp?: unknown }
    return typeof exp === 'number' && exp * 1000 <= ahoraMs
  } catch {
    return false
  }
}
