import type { ParticipanteJitsi } from './salaJitsi'
import { instanteMano } from './interaccionesSala'

export const mediosModerados = ['audio', 'video', 'desktop'] as const
export type MedioModerado = typeof mediosModerados[number]
export type EstadoModeracion = {
  disponible: boolean; moderador: boolean
  restringidos: Record<MedioModerado, boolean>
  permitidos: Record<MedioModerado, boolean>
  autorizaciones: Record<string, Partial<Record<MedioModerado, boolean>>>
}
export const moderacionInicial: EstadoModeracion = {
  disponible: false, moderador: false,
  restringidos: { audio: false, video: false, desktop: false },
  permitidos: { audio: true, video: true, desktop: true }, autorizaciones: {},
}
export type ConferenciaModeracion = {
  on: (evento: string, funcion: (...argumentos: never[]) => void) => void
  isModerator: () => boolean; isAVModerationSupported: () => boolean
  getParticipants: () => ParticipanteJitsi[]
  enableAVModeration: (medio: MedioModerado) => void; disableAVModeration: (medio: MedioModerado) => void
  avModerationApprove: (medio: MedioModerado, participante: string) => void
  avModerationReject: (medio: MedioModerado, participante: string) => void
  muteParticipant: (participante: string, medio: MedioModerado) => void
}
export type EventosModeracion = Record<'AV_MODERATION_CHANGED' | 'AV_MODERATION_APPROVED' | 'AV_MODERATION_REJECTED' | 'AV_MODERATION_PARTICIPANT_APPROVED' | 'AV_MODERATION_PARTICIPANT_REJECTED' | 'USER_ROLE_CHANGED', string>

export function crearModeracion(conferencia: ConferenciaModeracion, eventos: EventosModeracion, notificar: (estado: EstadoModeracion) => void) {
  const restringidos = { audio: false, video: false, desktop: false }
  const aprobados = { audio: false, video: false, desktop: false }
  const autorizaciones: EstadoModeracion['autorizaciones'] = {}
  let cerrada = false
  const pendientes = new Map<string, { valor: boolean; resolver: () => void; rechazar: (error: Error) => void; temporizador: ReturnType<typeof setTimeout> }>()
  const estado = (): EstadoModeracion => ({
    disponible: conferencia.isAVModerationSupported(), moderador: conferencia.isModerator(),
    restringidos: { ...restringidos },
    permitidos: { audio: conferencia.isModerator() || !restringidos.audio || aprobados.audio,
      video: conferencia.isModerator() || !restringidos.video || aprobados.video,
      desktop: conferencia.isModerator() || !restringidos.desktop || aprobados.desktop },
    autorizaciones: Object.fromEntries(Object.entries(autorizaciones).map(([identificador, permisos]) => [identificador, { ...permisos }])),
  })
  const publicar = () => { if (!cerrada) notificar(estado()) }
  const confirmar = (clave: string, valor: boolean) => {
    const pendiente = pendientes.get(clave)
    if (pendiente?.valor === valor) { clearTimeout(pendiente.temporizador); pendientes.delete(clave); pendiente.resolver() }
  }
  const enviar = (clave: string, valor: boolean, accion: () => void) => new Promise<void>((resolver, rechazar) => {
    if (pendientes.has(clave)) { rechazar(new Error('Espera la confirmación de Jitsi.')); return }
    const temporizador = setTimeout(() => { pendientes.delete(clave); rechazar(new Error('Jitsi no confirmó el cambio. Revisa los permisos y vuelve a intentarlo.')) }, 8000)
    pendientes.set(clave, { valor, resolver, rechazar, temporizador })
    try { accion() } catch (error) { clearTimeout(temporizador); pendientes.delete(clave); rechazar(error) }
  })
  const exigirModerador = () => {
    if (cerrada || !conferencia.isModerator()) throw new Error('Solo el anfitrión o un moderador de Jitsi puede cambiar permisos.')
    if (!conferencia.isAVModerationSupported()) throw new Error('La moderación audiovisual no está disponible en este servidor.')
  }
  conferencia.on(eventos.AV_MODERATION_CHANGED, ({ mediaType, enabled }: { mediaType: MedioModerado; enabled: boolean }) => {
    if (!mediosModerados.includes(mediaType) || typeof enabled !== 'boolean') return
    restringidos[mediaType] = enabled
    if (!enabled) { aprobados[mediaType] = false; for (const permisos of Object.values(autorizaciones)) delete permisos[mediaType] }
    confirmar(`politica:${mediaType}`, enabled); publicar()
  })
  for (const [evento, valor] of [[eventos.AV_MODERATION_APPROVED, true], [eventos.AV_MODERATION_REJECTED, false]] as const) {
    conferencia.on(evento, ({ mediaType }: { mediaType: MedioModerado }) => { if (mediosModerados.includes(mediaType)) { aprobados[mediaType] = valor; publicar() } })
  }
  for (const [evento, valor] of [[eventos.AV_MODERATION_PARTICIPANT_APPROVED, true], [eventos.AV_MODERATION_PARTICIPANT_REJECTED, false]] as const) {
    conferencia.on(evento, ({ mediaType, participant }: { mediaType: MedioModerado; participant?: ParticipanteJitsi }) => {
      if (!participant || !mediosModerados.includes(mediaType)) return
      const identificador = participant.getId()
      autorizaciones[identificador] = { ...autorizaciones[identificador], [mediaType]: valor }
      confirmar(`${identificador}:${mediaType}`, valor); publicar()
    })
  }
  conferencia.on(eventos.USER_ROLE_CHANGED, publicar)
  return {
    estado, publicar,
    configurar: async (medio: MedioModerado, requierePermiso: boolean) => {
      exigirModerador()
      if (restringidos[medio] === requierePermiso) return
      await enviar(`politica:${medio}`, requierePermiso, () => requierePermiso ? conferencia.enableAVModeration(medio) : conferencia.disableAVModeration(medio))
      // El permiso controla futuras activaciones; también silencia las pistas que estaban en uso.
      if (requierePermiso) for (const persona of conferencia.getParticipants()) {
        if (persona.getRole?.() !== 'moderator') conferencia.muteParticipant(persona.getId(), medio)
      }
    },
    autorizar: async (medio: MedioModerado, identificador: string, permitir: boolean) => {
      exigirModerador()
      const persona = conferencia.getParticipants().find(persona => persona.getId() === identificador)
      if (!persona) throw new Error('El participante ya no está conectado.')
      if (!restringidos[medio]) throw new Error('Activa primero la autorización para este dispositivo.')
      if (permitir && persona.getProperty('raisedHand') !== 'true' && !instanteMano(persona.getProperty('raisedHand'))) throw new Error('El asistente debe levantar la mano antes de recibir autorización.')
      if (!!autorizaciones[identificador]?.[medio] === permitir) return
      await enviar(`${identificador}:${medio}`, permitir, () => permitir ? conferencia.avModerationApprove(medio, identificador) : conferencia.avModerationReject(medio, identificador))
      if (!permitir) conferencia.muteParticipant(identificador, medio)
    },
    cerrar: () => { cerrada = true; for (const pendiente of pendientes.values()) { clearTimeout(pendiente.temporizador); pendiente.rechazar(new Error('La sala se cerró.')) } pendientes.clear() },
  }
}
