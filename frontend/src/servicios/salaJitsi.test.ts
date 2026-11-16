// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conectarSala, type BibliotecaJitsi, type ConexionJitsi, type ConferenciaJitsi, type EstadoSala, type ParticipanteJitsi, type PistaJitsi } from './salaJitsi'
import { clasificarParticipantes } from './presenciaReunion'

type Escucha = (...argumentos: never[]) => void
const credencial = { token: 'credencial', dominio: 'localhost', direccionServidor: 'http://localhost:8000', nombreSala: 'prueba', nombre: 'María' }
const eventos = Object.fromEntries(['TRACK_ADDED', 'TRACK_REMOVED', 'TRACK_MUTE_CHANGED', 'CONFERENCE_JOINED', 'CONFERENCE_FAILED', 'CONFERENCE_LEFT', 'USER_JOINED', 'USER_LEFT', 'DISPLAY_NAME_CHANGED', 'PARTICIPANT_PROPERTY_CHANGED', 'MESSAGE_RECEIVED', 'ENDPOINT_MESSAGE_RECEIVED', 'TRACK_UNMUTE_REJECTED', 'TRACK_AUDIO_LEVEL_CHANGED', 'AV_MODERATION_CHANGED', 'AV_MODERATION_APPROVED', 'AV_MODERATION_REJECTED', 'AV_MODERATION_PARTICIPANT_APPROVED', 'AV_MODERATION_PARTICIPANT_REJECTED', 'USER_ROLE_CHANGED', 'KICKED', 'LOBBY_USER_JOINED', 'LOBBY_USER_UPDATED', 'LOBBY_USER_LEFT'].map(nombre => [nombre, nombre])) as BibliotecaJitsi['events']['conference']
function crearPista(tipo: string, video = 'camera') {
  let silenciada = false
  const escuchas = new Map<string, () => void>()
  const pista: PistaJitsi = {
    attach: vi.fn(), detach: vi.fn(), dispose: vi.fn(async () => undefined), isLocal: () => true, getType: () => tipo,
    getParticipantId: () => 'local', getVideoType: () => video,
    isMuted: () => silenciada, mute: vi.fn(async () => { silenciada = true }), unmute: vi.fn(async () => { silenciada = false }),
    addEventListener: (evento, funcion) => { escuchas.set(evento, funcion) },
  }
  return { pista, detener: () => escuchas.get('detenida')?.() }
}
let escuchas: Map<string, Escucha>
let conexion: ConexionJitsi
let conferencia: ConferenciaJitsi
let biblioteca: BibliotecaJitsi
let remotos: ParticipanteJitsi[]
let microfono: ReturnType<typeof crearPista>
let camara: ReturnType<typeof crearPista>
let pantalla: ReturnType<typeof crearPista>
const contenedor = () => document.createElement('div')
const observadores = () => ({ usuarioIdentificador: '1', estado: vi.fn<(estado: EstadoSala) => void>(), participantes: vi.fn(), mensaje: vi.fn(), reaccion: vi.fn(), moderacion: vi.fn(), nivelMicrofono: vi.fn() })
const emitir = (evento: string, ...argumentos: unknown[]) => escuchas.get(evento)?.(...argumentos as never[])

beforeEach(() => {
  escuchas = new Map(); remotos = []
  microfono = crearPista('audio'); camara = crearPista('video'); pantalla = crearPista('video', 'desktop')
  conferencia = { isModerator: () => false, isAVModerationSupported: () => true, enableAVModeration: vi.fn(), disableAVModeration: vi.fn(), avModerationApprove: vi.fn(), avModerationReject: vi.fn(), muteParticipant: vi.fn(), kickParticipant: vi.fn(), joinLobby: vi.fn(async () => undefined), lobbyApproveAccess: vi.fn(), lobbyDenyAccess: vi.fn(), on: (evento, funcion) => { escuchas.set(evento, funcion) }, addTrack: vi.fn(async () => undefined), replaceTrack: vi.fn(async (anterior, nueva) => { if (anterior && nueva && anterior.getVideoType() !== nueva.getVideoType()) throw new Error('Jitsi no admite reemplazar camera por desktop directamente') }), join: () => emitir('CONFERENCE_JOINED'), leave: vi.fn(async () => undefined), setDisplayName: vi.fn(), myUserId: () => 'local', getParticipants: () => remotos, sendMessage: vi.fn(), sendTextMessage: vi.fn(), setLocalParticipantProperty: vi.fn() }
  const conexionEscuchas = new Map<string, () => void>()
  conexion = { addEventListener: (evento, funcion) => { conexionEscuchas.set(evento, funcion) }, initJitsiConference: () => conferencia, connect: () => conexionEscuchas.get('establecida')?.(), disconnect: vi.fn() }
  class Conexion implements ConexionJitsi {
    addEventListener = conexion.addEventListener
    initJitsiConference = conexion.initJitsiConference
    connect = conexion.connect
    disconnect = conexion.disconnect
  }
  biblioteca = { init: vi.fn(), JitsiConnection: Conexion, createLocalTracks: vi.fn(async (opciones: object) => {
    const tipo = (opciones as { devices: string[] }).devices[0]
    return [tipo === 'audio' ? microfono.pista : tipo === 'desktop' ? pantalla.pista : camara.pista]
  }), events: { connection: { CONNECTION_ESTABLISHED: 'establecida', CONNECTION_FAILED: 'fallida', CONNECTION_DISCONNECTED: 'desconectada' }, conference: eventos, track: { LOCAL_TRACK_STOPPED: 'detenida' } }, errors: { conference: { MEMBERS_ONLY_ERROR: 'soloMiembros', CONFERENCE_ACCESS_DENIED: 'accesoDenegado' } } }
  window.JitsiMeetJS = biblioteca
  vi.stubGlobal('navigator', { mediaDevices: { getDisplayMedia: vi.fn() } })
})
afterEach(() => { delete window.JitsiMeetJS; vi.unstubAllGlobals() })
async function entrar() {
  const observar = observadores()
  const elementos = contenedor()
  const sala = await conectarSala(credencial, elementos, vi.fn(), observar)
  await vi.waitFor(() => expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ microfonoDisponible: true, camaraDisponible: true })))
  return { sala, observar, elementos }
}

describe('Controles de la conferencia', () => {
  it('entrar sin dispositivos no solicita captura y permite activarlos después', async () => {
    const observar = observadores()
    const sala = await conectarSala(credencial, contenedor(), vi.fn(), observar, { habilitarMedios: false })
    expect(biblioteca.createLocalTracks).not.toHaveBeenCalled()
    await sala.alternar('audio')
    expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ microfonoActivo: true, camaraActiva: false }))
    await sala.alternar('video')
    expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ microfonoActivo: true, camaraActiva: true }))
    await sala.cerrar()
  })
  it('permite reintentar desde el control después de denegar el micrófono al entrar', async () => {
    vi.mocked(biblioteca.createLocalTracks).mockRejectedValueOnce(new DOMException('Sin permiso', 'NotAllowedError'))
    const observar = observadores()
    const sala = await conectarSala(credencial, contenedor(), vi.fn(), observar)
    await vi.waitFor(() => expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ microfonoDisponible: false, camaraDisponible: true })))
    await sala.alternar('audio')
    expect(conferencia.addTrack).toHaveBeenCalledWith(microfono.pista)
    expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ microfonoActivo: true, camaraActiva: true }))
    await sala.cerrar()
  })
  it('comparte cámara y pantalla simultáneamente y retira solo pantalla al detener', async () => {
    const { sala, observar } = await entrar()
    await sala.compartirPantalla()
    expect(conferencia.addTrack).toHaveBeenCalledWith(pantalla.pista)
    expect(conferencia.replaceTrack).not.toHaveBeenCalled()
    expect(camara.pista.isMuted()).toBe(false)
    expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ compartiendoPantalla: true, camaraActiva: true }))
    pantalla.detener()
    await vi.waitFor(() => expect(conferencia.replaceTrack).toHaveBeenLastCalledWith(pantalla.pista, null))
    await vi.waitFor(() => expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ compartiendoPantalla: false, camaraActiva: true })))
    expect(pantalla.pista.dispose).toHaveBeenCalledOnce()
    await sala.cerrar()
  })
  it('prioriza pantallas locales o remotas y mantiene las cámaras en la franja lateral', async () => {
    const { sala, elementos } = await entrar()
    expect(elementos.dataset.compartiendo).toBe('false')
    await sala.compartirPantalla()
    expect(elementos.dataset.compartiendo).toBe('true')
    expect(elementos.querySelectorAll('.salaPantallas video')).toHaveLength(1)
    expect(elementos.querySelectorAll('.salaCamaras video')).toHaveLength(1)
    const remota = { ...crearPista('video', 'desktop').pista, isLocal: () => false, getParticipantId: () => 'remoto' }
    emitir('TRACK_ADDED', remota)
    await sala.compartirPantalla()
    expect(elementos.dataset.compartiendo).toBe('true')
    expect(elementos.querySelectorAll('.salaPantallas video')).toHaveLength(1)
    emitir('TRACK_REMOVED', remota)
    expect(elementos.dataset.compartiendo).toBe('false')
    expect(elementos.querySelectorAll('.salaCamaras video')).toHaveLength(1)
    await sala.cerrar()
  })
  it('cancelar el selector no elimina la cámara ni deja el estado compartiendo', async () => {
    const { sala, observar } = await entrar()
    vi.mocked(biblioteca.createLocalTracks).mockRejectedValueOnce(new DOMException('Cancelado', 'NotAllowedError'))
    await expect(sala.compartirPantalla()).rejects.toThrow('Cancelado')
    expect(conferencia.replaceTrack).not.toHaveBeenCalled()
    expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ compartiendoPantalla: false, camaraActiva: true }))
    await sala.cerrar()
  })
  it('si Jitsi rechaza la pantalla, conserva la cámara sin modificarla', async () => {
    const { sala } = await entrar()
    vi.mocked(conferencia.addTrack).mockRejectedValueOnce(new Error('Fallo al añadir pantalla'))
    await expect(sala.compartirPantalla()).rejects.toThrow('Fallo al añadir pantalla')
    expect(conferencia.replaceTrack).not.toHaveBeenCalled()
    expect(camara.pista.mute).not.toHaveBeenCalled()
    expect(pantalla.pista.dispose).toHaveBeenCalledOnce()
    await sala.cerrar()
  })
  it('cambiar de micrófono mantiene el silencio y libera el dispositivo anterior', async () => {
    const { sala } = await entrar()
    await sala.alternar('audio')
    const nueva = crearPista('audio').pista
    vi.mocked(biblioteca.createLocalTracks).mockResolvedValueOnce([nueva])
    await sala.cambiarDispositivo('audio', 'otroMicrofono')
    expect(nueva.isMuted()).toBe(true)
    expect(microfono.pista.dispose).toHaveBeenCalledOnce()
    expect(conferencia.replaceTrack).toHaveBeenCalledWith(microfono.pista, nueva)
    await sala.cerrar()
    expect(nueva.dispose).toHaveBeenCalledOnce()
  })
  it('continúa con micrófono si la cámara no tiene permiso', async () => {
    vi.mocked(biblioteca.createLocalTracks).mockImplementation(async opciones => {
      if ((opciones as { devices: string[] }).devices[0] === 'video') throw new Error('Sin permiso')
      return [microfono.pista]
    })
    const observar = observadores()
    const sala = await conectarSala(credencial, contenedor(), vi.fn(), observar)
    await vi.waitFor(() => expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ microfonoDisponible: true, camaraDisponible: false, conectada: true })))
    await sala.cerrar()
  })
  it('publica participantes reales, manos y mensajes sin duplicar el envío local', async () => {
    const { sala, observar } = await entrar()
    remotos = [{ getId: () => 'remoto', getIdentity: () => ({ user: { id: '2' } }), getDisplayName: () => 'Luz', isAudioMuted: () => true, isVideoMuted: () => false, getProperty: () => 'true' }]
    emitir('USER_JOINED')
    expect(observar.participantes).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ usuarioIdentificador: '2', nombre: 'Luz', manoLevantada: true })]))
    await sala.levantarMano()
    expect(conferencia.setLocalParticipantProperty).toHaveBeenCalledWith('raisedHand', expect.stringMatching(/^\d+$/))
    await sala.enviarMensaje(' Hola ')
    expect(conferencia.sendTextMessage).toHaveBeenCalledWith('Hola')
    expect(observar.mensaje).not.toHaveBeenCalled()
    emitir('MESSAGE_RECEIVED', 'remoto', '<b>Hola</b>', undefined, 'Luz', false, 'mensaje1')
    expect(observar.mensaje).toHaveBeenCalledWith(expect.objectContaining({ texto: '<b>Hola</b>', nombre: 'Luz', identificador: 'mensaje1' }))
    remotos = []; emitir('USER_LEFT')
    expect(observar.participantes.mock.lastCall?.[0]).toHaveLength(1)
    await sala.cerrar()
  })
  it('permite apagar y encender la cámara mientras sigue compartiendo pantalla', async () => {
    const { sala, observar } = await entrar()
    await sala.compartirPantalla()
    await sala.alternar('video')
    expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ compartiendoPantalla: true, camaraActiva: false }))
    await sala.alternar('video')
    expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ compartiendoPantalla: true, camaraActiva: true }))
    expect(pantalla.pista.dispose).not.toHaveBeenCalled()
    await sala.cerrar()
  })
  it('envía reacciones a toda la sala, deduplica y rechaza símbolos no admitidos', async () => {
    const { sala, observar } = await entrar()
    await sala.enviarReaccion('👏')
    expect(conferencia.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'reaccionGestionCapa', emoji: '👏' }))
    expect(observar.reaccion).toHaveBeenCalledOnce()
    const enviado = vi.mocked(conferencia.sendMessage).mock.calls[0][0]
    const persona = { getId: () => 'local', getDisplayName: () => 'María' }
    emitir('ENDPOINT_MESSAGE_RECEIVED', persona, enviado)
    expect(observar.reaccion).toHaveBeenCalledOnce()
    await expect(sala.enviarReaccion('<script>')).rejects.toThrow('reacción disponible')
    await expect(sala.enviarReaccion('👍')).rejects.toThrow('Espera un segundo')
    await sala.cerrar()
  })
  it('impide reactivar micrófono, cámara o pantalla antes de la autorización nativa', async () => {
    const { sala, observar } = await entrar()
    emitir('AV_MODERATION_CHANGED', { mediaType: 'audio', enabled: true })
    emitir('AV_MODERATION_CHANGED', { mediaType: 'video', enabled: true })
    emitir('AV_MODERATION_CHANGED', { mediaType: 'desktop', enabled: true })
    await vi.waitFor(() => expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ microfonoActivo: false, camaraActiva: false })))
    await expect(sala.alternar('audio')).rejects.toThrow('autorización')
    await expect(sala.alternar('video')).rejects.toThrow('autorización')
    await expect(sala.compartirPantalla()).rejects.toThrow('solicita permiso')
    emitir('AV_MODERATION_APPROVED', { mediaType: 'audio' })
    await sala.alternar('audio')
    expect(microfono.pista.isMuted()).toBe(false)
    await sala.cerrar()
  })
  it('informa niveles reales solo del micrófono local y los reinicia al silenciar o salir', async () => {
    const { sala, observar } = await entrar()
    const reloj = vi.spyOn(performance, 'now').mockReturnValue(1000)
    try {
      observar.nivelMicrofono.mockClear()
      emitir('TRACK_AUDIO_LEVEL_CHANGED', 'remoto', 0.9)
      expect(observar.nivelMicrofono).not.toHaveBeenCalled()
      emitir('TRACK_AUDIO_LEVEL_CHANGED', 'local', 0.25)
      expect(observar.nivelMicrofono).toHaveBeenLastCalledWith(0.25)
      reloj.mockReturnValue(1040)
      emitir('TRACK_AUDIO_LEVEL_CHANGED', 'local', 0.8)
      expect(observar.nivelMicrofono).toHaveBeenCalledTimes(1)
      reloj.mockReturnValue(1100)
      emitir('TRACK_AUDIO_LEVEL_CHANGED', 'local', 2)
      expect(observar.nivelMicrofono).toHaveBeenLastCalledWith(1)
      await sala.alternar('audio')
      expect(observar.nivelMicrofono).toHaveBeenLastCalledWith(0)
      reloj.mockReturnValue(1200)
      emitir('TRACK_AUDIO_LEVEL_CHANGED', 'local', 0.9)
      expect(observar.nivelMicrofono).toHaveBeenLastCalledWith(0)
      await sala.cerrar()
      expect(observar.nivelMicrofono).toHaveBeenLastCalledWith(0)
    } finally { reloj.mockRestore() }
  })
  it('limpia la intensidad si dejan de llegar muestras de audio', async () => {
    const { sala, observar } = await entrar()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      emitir('TRACK_AUDIO_LEVEL_CHANGED', 'local', 0.6)
      expect(observar.nivelMicrofono).toHaveBeenLastCalledWith(0.6)
      await vi.advanceTimersByTimeAsync(401)
      expect(observar.nivelMicrofono).toHaveBeenLastCalledWith(0)
      await sala.cerrar()
    } finally { vi.useRealTimers() }
  })
  it('conserva la cámara apagada al dejar de compartir pantalla', async () => {
    const { sala, observar } = await entrar()
    await sala.alternar('video')
    await sala.compartirPantalla()
    await sala.compartirPantalla()
    expect(camara.pista.isMuted()).toBe(true)
    expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ compartiendoPantalla: false, camaraActiva: false }))
    await sala.cerrar()
  })
  it('libera una pista que termina de abrirse después de salir', async () => {
    const { sala } = await entrar()
    let resolver!: (pistas: PistaJitsi[]) => void
    vi.mocked(biblioteca.createLocalTracks).mockImplementationOnce(() => new Promise(resolverPromesa => { resolver = resolverPromesa }))
    const pendiente = sala.compartirPantalla()
    const rechazo = expect(pendiente).rejects.toThrow('No se pudo abrir el dispositivo.')
    await vi.waitFor(() => expect(resolver).toBeDefined())
    await sala.cerrar()
    resolver([pantalla.pista])
    await rechazo
    expect(pantalla.pista.dispose).toHaveBeenCalledOnce()
    expect(conferencia.replaceTrack).not.toHaveBeenCalled()
  })
  it('salir libera cámara, micrófono y pantalla incluso si Jitsi falla al salir', async () => {
    const { sala, elementos } = await entrar()
    await sala.compartirPantalla()
    vi.mocked(conferencia.leave).mockRejectedValueOnce(new Error('Red caída'))
    await expect(sala.cerrar()).rejects.toThrow('Red caída')
    for (const pista of [microfono.pista, camara.pista, pantalla.pista]) expect(pista.dispose).toHaveBeenCalledOnce()
    expect(conexion.disconnect).toHaveBeenCalledOnce()
    expect(elementos.children).toHaveLength(0)
  })
})

it('no identifica por nombre, excluye retirados y agrupa varias conexiones de la misma cuenta', () => {
  const inscritos = [{ identificador: '1', estado: 'autorizado' }, { identificador: '2', estado: 'autorizado' }, { identificador: '3', estado: 'retirado' }]
  const conexiones = [{ usuarioIdentificador: '1' }, { usuarioIdentificador: '1' }, { nombre: 'Luz' }] as import('./salaJitsi').ParticipanteSala[]
  expect(clasificarParticipantes(inscritos, conexiones)).toEqual([{ identificador: '2', estado: 'autorizado' }])
})

describe('Sala segura HU-26', () => {
  const remoto = (identificador: string, usuario?: string, rol = 'participant'): ParticipanteJitsi => ({
    getId: () => identificador, getIdentity: () => usuario ? { user: { id: usuario } } : undefined, getDisplayName: () => 'Nombre elegido',
    isAudioMuted: () => true, isVideoMuted: () => true, getProperty: () => undefined, getRole: () => rol })
  const pistaRemota = (participante: string, video = 'desktop', silenciada = false) => ({ ...crearPista('video', video).pista, isLocal: () => false, getParticipantId: () => participante, isMuted: () => silenciada })
  const comoModerador = () => {
    conferencia.isModerator = () => true
    vi.mocked(conferencia.enableAVModeration).mockImplementation(medio => emitir('AV_MODERATION_CHANGED', { mediaType: medio, enabled: true }))
  }
  const politicas = { camaraPermitida: true, microfonoPermitido: false, pantallaPermitida: false, manoPermitida: true }

  it('HU26-03: el colegiado sin admisión espera en la sala de espera hasta que el instructor lo admite', async () => {
    conferencia.join = () => emitir('CONFERENCE_FAILED', 'soloMiembros')
    const observar = { ...observadores(), espera: vi.fn() }
    const informar = vi.fn()
    const sala = await conectarSala(credencial, contenedor(), informar, observar, { habilitarMedios: false })
    expect(conferencia.joinLobby).toHaveBeenCalledWith('María')
    expect(observar.espera).toHaveBeenLastCalledWith(true)
    expect(informar).toHaveBeenLastCalledWith(expect.stringMatching(/sala de espera/i))
    expect(observar.estado).not.toHaveBeenCalledWith(expect.objectContaining({ conectada: true }))
    emitir('CONFERENCE_JOINED')
    expect(observar.espera).toHaveBeenLastCalledWith(false)
    expect(observar.estado).toHaveBeenLastCalledWith(expect.objectContaining({ conectada: true }))
    await sala.cerrar()
  })
  it('HU26-03: si el instructor no lo admite, lo informa sin reintentar', async () => {
    conferencia.join = () => emitir('CONFERENCE_FAILED', 'accesoDenegado')
    const informar = vi.fn()
    const sala = await conectarSala(credencial, contenedor(), informar, { ...observadores(), espera: vi.fn() }, { habilitarMedios: false })
    expect(informar).toHaveBeenLastCalledWith(expect.stringMatching(/no te admitió/i))
    expect(conferencia.joinLobby).not.toHaveBeenCalled()
    await sala.cerrar()
  })
  it('HU26-03: el moderador ve solicitudes con la identidad del JWT y admite solo inscritos verificables', async () => {
    comoModerador()
    Object.assign(conferencia, { room: { getLobby: () => ({ lobbyRoom: { members: { 'sala@lobby.localhost/abc': { identity: { user: { id: '45' } } } } } }) } })
    const observar = { ...observadores(), solicitudesEspera: vi.fn() }
    const sala = await conectarSala(credencial, contenedor(), vi.fn(), observar, { habilitarMedios: false })
    emitir('LOBBY_USER_JOINED', 'abc', 'Nombre falso')
    emitir('LOBBY_USER_JOINED', 'xyz', 'Sin identidad')
    expect(observar.solicitudesEspera).toHaveBeenLastCalledWith([
      { identificador: 'abc', nombre: 'Nombre falso', usuarioIdentificador: '45' },
      { identificador: 'xyz', nombre: 'Sin identidad', usuarioIdentificador: undefined }])
    expect(sala.admitirInscritos(new Set(['45', '99']))).toBe(1)
    expect(conferencia.lobbyApproveAccess).toHaveBeenCalledExactlyOnceWith('abc')
    sala.rechazar('xyz')
    expect(conferencia.lobbyDenyAccess).toHaveBeenCalledWith('xyz')
    emitir('LOBBY_USER_LEFT', 'abc')
    expect(observar.solicitudesEspera).toHaveBeenLastCalledWith([{ identificador: 'xyz', nombre: 'Sin identidad', usuarioIdentificador: undefined }])
    await sala.cerrar()
  })
  it('HU26-06/07: el moderador aplica las políticas guardadas al conectarse', async () => {
    comoModerador()
    const sala = await conectarSala(credencial, contenedor(), vi.fn(), observadores(), { habilitarMedios: false, politicas })
    await vi.waitFor(() => expect(conferencia.enableAVModeration).toHaveBeenCalledTimes(2))
    expect(vi.mocked(conferencia.enableAVModeration).mock.calls.map(([medio]) => medio).sort()).toEqual(['audio', 'desktop'])
    await sala.cerrar()
  })
  it('HU26-07: el vigilante silencia y expulsa a quien publica pantalla sin autorización', async () => {
    comoModerador()
    remotos = [remoto('intruso', '77'), remoto('autorizado', '78'), remoto('otroModerador', '79', 'moderator')]
    const observar = { ...observadores(), infraccion: vi.fn() }
    const sala = await conectarSala(credencial, contenedor(), vi.fn(), observar, { habilitarMedios: false, politicas })
    await vi.waitFor(() => expect(conferencia.enableAVModeration).toHaveBeenCalledWith('desktop'))
    emitir('AV_MODERATION_PARTICIPANT_APPROVED', { mediaType: 'desktop', participant: remotos[1] })
    emitir('TRACK_ADDED', pistaRemota('intruso', 'camera'))
    emitir('TRACK_ADDED', pistaRemota('autorizado'))
    emitir('TRACK_ADDED', pistaRemota('otroModerador'))
    expect(conferencia.kickParticipant).not.toHaveBeenCalled()
    // La interfaz no ofrece expulsar a otro moderador.
    expect(observar.participantes).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ identificador: 'otroModerador', moderador: true }), expect.objectContaining({ identificador: 'intruso', moderador: false })]))
    emitir('TRACK_ADDED', pistaRemota('intruso'))
    expect(conferencia.muteParticipant).toHaveBeenCalledWith('intruso', 'desktop')
    expect(conferencia.kickParticipant).toHaveBeenCalledExactlyOnceWith('intruso', expect.any(String))
    expect(observar.infraccion).toHaveBeenCalledWith({ participanteIdentificador: 'intruso', usuarioIdentificador: '77' })
    // Reactivar una pantalla silenciada también es una infracción.
    emitir('TRACK_MUTE_CHANGED', pistaRemota('intruso', 'desktop', true))
    expect(conferencia.kickParticipant).toHaveBeenCalledOnce()
    emitir('TRACK_MUTE_CHANGED', pistaRemota('intruso'))
    expect(conferencia.kickParticipant).toHaveBeenCalledTimes(2)
    await sala.cerrar()
  })
  it('HU26-07: sin restricción de pantalla el vigilante no actúa', async () => {
    comoModerador()
    remotos = [remoto('ponente', '80')]
    const sala = await conectarSala(credencial, contenedor(), vi.fn(), observadores(), { habilitarMedios: false, politicas: { ...politicas, pantallaPermitida: true } })
    emitir('TRACK_ADDED', pistaRemota('ponente'))
    expect(conferencia.kickParticipant).not.toHaveBeenCalled()
    await sala.cerrar()
  })
  it('HU26-09: expulsar cierra todas las conexiones del usuario y rechaza sus solicitudes en espera', async () => {
    comoModerador()
    remotos = [remoto('pestanaUno', '77'), remoto('pestanaDos', '77'), remoto('otro', '78')]
    Object.assign(conferencia, { room: { getLobby: () => ({ lobbyRoom: { members: { 'sala@lobby/vuelve': { identity: { user: { id: '77' } } } } } }) } })
    const sala = await conectarSala(credencial, contenedor(), vi.fn(), { ...observadores(), solicitudesEspera: vi.fn() }, { habilitarMedios: false })
    emitir('LOBBY_USER_JOINED', 'vuelve', 'Otro nombre')
    expect(sala.expulsar('77')).toBe(2)
    expect(vi.mocked(conferencia.kickParticipant).mock.calls.map(([id]) => id)).toEqual(['pestanaUno', 'pestanaDos'])
    expect(conferencia.lobbyDenyAccess).toHaveBeenCalledWith('vuelve')
    await sala.cerrar()
  })
  it('HU26-09: el colegiado expulsado recibe el aviso y la sala se desconecta', async () => {
    const informar = vi.fn()
    const sala = await conectarSala(credencial, contenedor(), informar, observadores(), { habilitarMedios: false })
    emitir('KICKED')
    expect(informar).toHaveBeenLastCalledWith(expect.stringMatching(/retiró de la sesión/i))
    await sala.cerrar()
  })
  it('HU26-11: sin permiso de mano el colegiado no puede levantarla', async () => {
    const sala = await conectarSala(credencial, contenedor(), vi.fn(), observadores(), { habilitarMedios: false, politicas: { ...politicas, manoPermitida: false } })
    await expect(sala.levantarMano()).rejects.toThrow(/mano/i)
    expect(conferencia.setLocalParticipantProperty).not.toHaveBeenCalled()
    await sala.cerrar()
  })
})
