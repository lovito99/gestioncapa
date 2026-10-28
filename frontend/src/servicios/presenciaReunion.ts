import type { ParticipanteSala } from './salaJitsi'

/** Identidad de JWT transmitida por Jitsi; no se intenta identificar por nombre o correo visible. */
export function clasificarParticipantes<Participante extends { identificador: string; estado: string }>(inscritos: Participante[], conectados: ParticipanteSala[]): Participante[] {
  const identidades = new Set(conectados.map(persona => persona.usuarioIdentificador).filter(Boolean))
  return inscritos.filter(persona => persona.estado !== 'retirado' && !identidades.has(String(persona.identificador)))
}
