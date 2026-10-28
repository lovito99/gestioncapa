import { expect, it, vi } from 'vitest'
import { crearModeracion, type ConferenciaModeracion, type EventosModeracion } from './moderacionSala'
import type { ParticipanteJitsi } from './salaJitsi'

const nombres = ['AV_MODERATION_CHANGED', 'AV_MODERATION_APPROVED', 'AV_MODERATION_REJECTED', 'AV_MODERATION_PARTICIPANT_APPROVED', 'AV_MODERATION_PARTICIPANT_REJECTED', 'USER_ROLE_CHANGED'] as const
function preparar(moderador: boolean) {
  const eventos = Object.fromEntries(nombres.map(nombre => [nombre, nombre])) as EventosModeracion
  const escuchas = new Map<string, (...argumentos: never[]) => void>()
  const emitir = (nombre: string, objeto: unknown) => escuchas.get(nombre)?.(objeto as never)
  let mano = false
  const persona = { getId: () => 'asistente', getRole: () => 'participant', getProperty: () => mano ? '1700000000000' : 'false' } as unknown as ParticipanteJitsi
  const conferencia: ConferenciaModeracion = { on: (evento, funcion) => { escuchas.set(evento, funcion) }, isModerator: () => moderador, isAVModerationSupported: () => true, getParticipants: () => [persona], enableAVModeration: vi.fn(), disableAVModeration: vi.fn(), avModerationApprove: vi.fn(), avModerationReject: vi.fn(), muteParticipant: vi.fn() }
  const notificar = vi.fn()
  const control = crearModeracion(conferencia, eventos, notificar)
  return { control, conferencia, emitir, persona, levantarMano: () => { mano = true } }
}
it('un asistente no puede cambiar políticas ni autorizarse', async () => {
  const { control, conferencia } = preparar(false)
  await expect(control.configurar('audio', true)).rejects.toThrow('Solo el anfitrión')
  await expect(control.autorizar('audio', 'asistente', true)).rejects.toThrow('Solo el anfitrión')
  expect(conferencia.enableAVModeration).not.toHaveBeenCalled()
})
it('espera confirmación de Jitsi antes de confirmar una restricción', async () => {
  const { control, emitir, conferencia } = preparar(true)
  const pendiente = control.configurar('audio', true)
  expect(control.estado().restringidos.audio).toBe(false)
  emitir('AV_MODERATION_CHANGED', { mediaType: 'audio', enabled: true })
  await pendiente
  expect(control.estado().restringidos.audio).toBe(true)
  expect(conferencia.muteParticipant).toHaveBeenCalledWith('asistente', 'audio')
  control.cerrar()
})
it('autoriza solo después de levantar la mano y permite revocar aunque la mano se baje', async () => {
  const { control, emitir, conferencia, persona, levantarMano } = preparar(true)
  emitir('AV_MODERATION_CHANGED', { mediaType: 'desktop', enabled: true })
  await expect(control.autorizar('desktop', 'asistente', true)).rejects.toThrow('levantar la mano')
  levantarMano()
  const permiso = control.autorizar('desktop', 'asistente', true)
  emitir('AV_MODERATION_PARTICIPANT_APPROVED', { mediaType: 'desktop', participant: persona })
  await permiso
  expect(conferencia.avModerationApprove).toHaveBeenCalledWith('desktop', 'asistente')
  const revocacion = control.autorizar('desktop', 'asistente', false)
  emitir('AV_MODERATION_PARTICIPANT_REJECTED', { mediaType: 'desktop', participant: persona })
  await revocacion
  expect(conferencia.muteParticipant).toHaveBeenCalledWith('asistente', 'desktop')
  expect(control.estado().autorizaciones.asistente.desktop).toBe(false)
  control.cerrar()
})
it('el permiso local cambia por confirmaciones nativas y se libera al desactivar la restricción', () => {
  const { control, emitir } = preparar(false)
  emitir('AV_MODERATION_CHANGED', { mediaType: 'video', enabled: true })
  expect(control.estado().permitidos.video).toBe(false)
  emitir('AV_MODERATION_APPROVED', { mediaType: 'video' })
  expect(control.estado().permitidos.video).toBe(true)
  emitir('AV_MODERATION_REJECTED', { mediaType: 'video' })
  expect(control.estado().permitidos.video).toBe(false)
  emitir('AV_MODERATION_CHANGED', { mediaType: 'video', enabled: false })
  expect(control.estado().permitidos.video).toBe(true)
  control.cerrar()
})
