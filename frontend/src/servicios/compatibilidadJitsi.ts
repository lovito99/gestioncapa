/** Interoperabilidad de docker-jitsi-meet stable-11248-2 con lib-jitsi-meet.
 * Prosody serializa una tabla Lua vacía como {}. El cliente espera services: []
 * y, de lo contrario, trata todo el objeto JSON como una respuesta XML extdisco.
 * Mantiene intactas las respuestas XML y las listas con credenciales reales.
 */
type ReceptorServicios = { onReceiveStunAndTurnCredentials: (respuesta: unknown) => unknown }
type ConexionConServicios = { _xmpp?: { connection?: { jingle?: ReceptorServicios } } }

export function normalizarServiciosVacios(respuesta: unknown): unknown {
  if (!respuesta || typeof respuesta !== 'object' || 'querySelectorAll' in respuesta || !('services' in respuesta)) return respuesta
  const servicios = respuesta.services
  if (servicios && typeof servicios === 'object' && !Array.isArray(servicios) && Object.getPrototypeOf(servicios) === Object.prototype && Object.keys(servicios).length === 0) {
    return { ...respuesta, services: [] }
  }
  return respuesta
}

const receptoresAdaptados = new WeakSet<ReceptorServicios>()

/** El acceso al adaptador interno del SDK queda aislado aquí, sin modificar el bundle descargado. */
export function adaptarServiciosJitsi(conexion: object): boolean {
  const receptor = (conexion as ConexionConServicios)._xmpp?.connection?.jingle
  if (!receptor || typeof receptor.onReceiveStunAndTurnCredentials !== 'function') return false
  if (receptoresAdaptados.has(receptor)) return true
  const recibir = receptor.onReceiveStunAndTurnCredentials
  receptor.onReceiveStunAndTurnCredentials = function (respuesta: unknown) {
    return recibir.call(this, normalizarServiciosVacios(respuesta))
  }
  receptoresAdaptados.add(receptor)
  return true
}
