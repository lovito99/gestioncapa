/** Nivel visual a partir de amplitud real; no identifica palabras ni graba audio. */
export function intensidadMicrofono(nivel: number, activo: boolean): number {
  if (!activo || !Number.isFinite(nivel) || nivel < 0.005) return 0
  return Math.round(Math.sqrt(Math.min(1, nivel)) * 100)
}
