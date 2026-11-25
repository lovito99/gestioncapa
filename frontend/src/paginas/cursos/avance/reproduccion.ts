import { fechaCompleta, horaCorta } from '@/lib/formato'

type Muestra = { posicion: number; instante: number }

export function fuenteHttps(valor: string | null) {
  if (!valor) return null
  try {
    const url = new URL(valor)
    return url.protocol === 'https:' && !url.username && !url.password ? url : null
  } catch {
    return null
  }
}

export function fuenteVideo(valor: string | null) {
  const url = fuenteHttps(valor)
  return url && /\.(mp4|webm|ogv|ogg|m4v)$/i.test(url.pathname) ? url.href : null
}

export function validarDuracion(segundos: number, referenciaMs: number) {
  const ms = Math.round(segundos * 1000)
  return ms > 0 && Math.abs(ms - referenciaMs) <= Math.min(250, referenciaMs / 100)
}

export function posicionPermitida(ms: number, vistoMs: number) {
  return Number.isFinite(ms) && ms >= 0 && ms <= vistoMs
}

export function avanceObservado(vistoMs: number, previa: Muestra | null, actual: Muestra) {
  if (!previa || !posicionPermitida(previa.posicion, vistoMs)) return null
  const lapso = actual.instante - previa.instante
  const desplazamiento = actual.posicion - previa.posicion
  if (lapso < 0 || lapso > 2000 || desplazamiento < 0 || desplazamiento > lapso + 120) return null
  return Math.max(vistoMs, actual.posicion)
}

export function fechaFinalizacion(fecha: string) {
  return `${fechaCompleta(fecha)} a las ${horaCorta(fecha)} (Lima)`
}
