export const reaccionesDisponibles = [
  { emoji: '👍', nombre: 'Me gusta' }, { emoji: '👏', nombre: 'Aplausos' },
  { emoji: '❤️', nombre: 'Corazón' }, { emoji: '😂', nombre: 'Risa' },
  { emoji: '🎉', nombre: 'Celebración' }, { emoji: '😮', nombre: 'Sorpresa' },
] as const

export function instanteMano(valor: unknown): number | undefined {
  const numero = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : NaN
  return Number.isSafeInteger(numero) && numero > 0 ? numero : undefined
}

export function numerarManos<Persona extends { identificador: string; manoLevantada: boolean; manoLevantadaEn?: number }>(personas: Persona[]): (Persona & { turnoMano?: number })[] {
  const cola = personas.filter(persona => persona.manoLevantada).sort((primera, segunda) =>
    (primera.manoLevantadaEn ?? Number.MAX_SAFE_INTEGER) - (segunda.manoLevantadaEn ?? Number.MAX_SAFE_INTEGER)
    || (primera.identificador < segunda.identificador ? -1 : primera.identificador > segunda.identificador ? 1 : 0))
  const turnos = new Map(cola.map((persona, indice) => [persona.identificador, indice + 1]))
  return personas.map(persona => ({ ...persona, turnoMano: turnos.get(persona.identificador) }))
}

export function esReaccion(valor: unknown): valor is { tipo: 'reaccionGestionCapa'; identificador: string; emoji: string } {
  if (!valor || typeof valor !== 'object') return false
  const datos = valor as Record<string, unknown>
  return datos.tipo === 'reaccionGestionCapa' && typeof datos.identificador === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(datos.identificador)
    && reaccionesDisponibles.some(reaccion => reaccion.emoji === datos.emoji)
}
