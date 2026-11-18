/** Traduce los errores de cámara del navegador a mensajes accionables en español. */
export function mensajeCamara(error: unknown) {
  if (!window.isSecureContext) {
    return 'La cámara solo funciona en una conexión segura (https). Abre la aplicación desde la dirección https que te dio el equipo.'
  }
  const nombre = error instanceof DOMException ? error.name : String(error)
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
    return 'Para escanear el QR, permite el uso de la cámara en tu navegador y vuelve a intentarlo.'
  }
  if (nombre === 'NotReadableError') {
    return 'Otra aplicación está usando la cámara. Ciérrala y vuelve a intentar.'
  }
  if (/camera not found|NotFoundError|OverconstrainedError/i.test(nombre)) {
    return 'No encontramos una cámara en este dispositivo. Usa un celular con cámara.'
  }
  return 'No pudimos abrir la cámara. Vuelve a intentar.'
}
