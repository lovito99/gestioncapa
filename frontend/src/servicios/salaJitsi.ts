import { crearModeracion, type ConferenciaModeracion, type EventosModeracion, type EstadoModeracion } from './moderacionSala'
import { esReaccion, instanteMano, numerarManos, reaccionesDisponibles } from './interaccionesSala'
import { adaptarServiciosJitsi } from './compatibilidadJitsi'
import type { CredencialReunion } from './reuniones'

export type ParticipanteSala = {
  identificador: string; usuarioIdentificador?: string; nombre: string; local: boolean
  microfonoActivo: boolean; camaraActiva: boolean; manoLevantada: boolean; manoLevantadaEn?: number; turnoMano?: number
}
export type EstadoSala = {
  conectada: boolean; microfonoActivo: boolean; camaraActiva: boolean
  microfonoDisponible: boolean; camaraDisponible: boolean; compartiendoPantalla: boolean
}
export type ReaccionSala = { identificador: string; emoji: string; nombre: string; participanteIdentificador: string; recibidaEn: number }
export type MensajeSala = { identificador: string; nombre: string; texto: string; hora: string }
export type ObservadoresSala = {
  usuarioIdentificador: string
  estado: (estado: EstadoSala) => void
  participantes: (participantes: ParticipanteSala[]) => void
  mensaje: (mensaje: MensajeSala) => void
  reaccion: (reaccion: ReaccionSala) => void
  moderacion: (estado: EstadoModeracion) => void
  nivelMicrofono: (nivel: number) => void
}
export type PistaJitsi = {
  attach: (elemento: HTMLMediaElement) => void; detach: (elemento: HTMLMediaElement) => void
  dispose: () => Promise<void>; isLocal: () => boolean; getType: () => string; isMuted: () => boolean
  mute: () => Promise<void>; unmute: () => Promise<void>
  getParticipantId: () => string; getVideoType: () => string
  addEventListener: (evento: string, funcion: () => void) => void
}
export type ParticipanteJitsi = {
  getId: () => string; getIdentity: () => { user?: { id?: string } } | undefined
  getDisplayName: () => string; isAudioMuted: () => boolean; isVideoMuted: () => boolean
  getProperty: (nombre: string) => unknown
  getRole?: () => string
}
export type ConferenciaJitsi = ConferenciaModeracion & {
  on: (evento: string, funcion: (...argumentos: never[]) => void) => void
  addTrack: (pista: PistaJitsi) => Promise<void>
  replaceTrack: (anterior: PistaJitsi | null, nueva: PistaJitsi | null) => Promise<void>
  join: () => void; leave: () => Promise<void>; setDisplayName: (nombre: string) => void
  myUserId: () => string; getParticipants: () => ParticipanteJitsi[]
  sendMessage: (mensaje: object) => void
  sendTextMessage: (mensaje: string) => void
  setLocalParticipantProperty: (nombre: string, valor: string) => void
}
export type ConexionJitsi = {
  addEventListener: (evento: string, funcion: () => void) => void
  initJitsiConference: (nombre: string, opciones: object) => ConferenciaJitsi
  connect: () => void; disconnect: () => void
}
export type BibliotecaJitsi = {
  init: (opciones: object) => void
  JitsiConnection: new (aplicacion: null, token: string, opciones: object) => ConexionJitsi
  createLocalTracks: (opciones: object) => Promise<PistaJitsi[]>
  events: { connection: Record<'CONNECTION_ESTABLISHED' | 'CONNECTION_FAILED' | 'CONNECTION_DISCONNECTED', string>
    conference: Record<'TRACK_ADDED' | 'TRACK_REMOVED' | 'TRACK_MUTE_CHANGED' | 'CONFERENCE_JOINED' | 'CONFERENCE_FAILED' | 'CONFERENCE_LEFT' | 'USER_JOINED' | 'USER_LEFT' | 'DISPLAY_NAME_CHANGED' | 'PARTICIPANT_PROPERTY_CHANGED' | 'MESSAGE_RECEIVED' | 'ENDPOINT_MESSAGE_RECEIVED' | 'TRACK_UNMUTE_REJECTED' | 'TRACK_AUDIO_LEVEL_CHANGED', string> & EventosModeracion
    track: { LOCAL_TRACK_STOPPED: string } }
}
declare global { interface Window { JitsiMeetJS?: BibliotecaJitsi } }

let cargaBiblioteca: Promise<BibliotecaJitsi> | undefined
async function cargarBiblioteca(direccionServidor: string) {
  if (window.JitsiMeetJS) return window.JitsiMeetJS
  if (!cargaBiblioteca) cargaBiblioteca = new Promise<BibliotecaJitsi>((resolver, rechazar) => {
    const script = document.createElement('script')
    const temporizador = setTimeout(() => fallo(), 20000)
    const fallo = () => { clearTimeout(temporizador); script.remove(); rechazar(new Error('No se pudo cargar Jitsi. Revisa el servidor y su conexión.')) }
    script.src = `${direccionServidor}/libs/lib-jitsi-meet.min.js`
    script.onload = () => { clearTimeout(temporizador); if (window.JitsiMeetJS) resolver(window.JitsiMeetJS); else fallo() }
    script.onerror = fallo
    document.head.append(script)
  }).catch(error => { cargaBiblioteca = undefined; throw error })
  return cargaBiblioteca
}

export async function conectarSala(credencial: CredencialReunion, contenedor: HTMLElement, informar: (mensaje: string) => void, observadores: ObservadoresSala, opciones: { habilitarMedios?: boolean } = {}) {
  const biblioteca = await cargarBiblioteca(credencial.direccionServidor)
  biblioteca.init({ disableAudioLevels: false })
  const conexion = new biblioteca.JitsiConnection(null, credencial.token, {
    hosts: { domain: credencial.dominio, muc: `conference.${credencial.dominio}` },
    serviceUrl: `${credencial.direccionServidor}/http-bind?room=${encodeURIComponent(credencial.nombreSala)}`, clientNode: 'https://gestioncapa.local',
  })
  const zonaPantallas = document.createElement('div')
  zonaPantallas.className = 'salaPantallas'
  zonaPantallas.setAttribute('aria-label', 'Pantallas compartidas')
  const zonaCamaras = document.createElement('div')
  zonaCamaras.className = 'salaCamaras'
  zonaCamaras.setAttribute('aria-label', 'Cámaras de participantes')
  contenedor.append(zonaPantallas, zonaCamaras)
  contenedor.dataset.compartiendo = 'false'
  const locales = new Set<PistaJitsi>()
  const elementos = new Map<PistaJitsi, { elemento: HTMLMediaElement; tarjeta: HTMLElement; etiqueta: HTMLElement }>()
  let conferencia: ConferenciaJitsi | undefined
  let moderacion: ReturnType<typeof crearModeracion> | undefined
  let cerrada = false
  let conectada = false
  let microfono: PistaJitsi | null = null
  let camara: PistaJitsi | null = null
  let pantalla: PistaJitsi | null = null
  let manoLevantada = false
  let manoLevantadaEn: number | undefined
  const reaccionesVistas = new Set<string>()
  const ultimaReaccion = new Map<string, number>()
  let ultimoEnvioReaccion = 0
  let ultimoNivelPublicado = 0
  let temporizadorNivel: ReturnType<typeof setTimeout> | undefined
  const publicarReaccion = (identificador: string, emoji: string, participanteIdentificador: string, nombre: string) => {
    if (cerrada || reaccionesVistas.has(identificador)) return
    const ahora = Date.now()
    if (ahora - (ultimaReaccion.get(participanteIdentificador) ?? 0) < 700) return
    ultimaReaccion.set(participanteIdentificador, ahora)
    reaccionesVistas.add(identificador)
    if (reaccionesVistas.size > 200) reaccionesVistas.delete(reaccionesVistas.values().next().value!)
    observadores.reaccion({ identificador, emoji, nombre, participanteIdentificador, recibidaEn: ahora })
  }
  let restaurandoPantalla: Promise<void> | undefined
  let operacion = Promise.resolve<unknown>(undefined)
  const serializar = <Resultado,>(funcion: () => Promise<Resultado>): Promise<Resultado> => {
    const siguiente = operacion.then(() => { if (cerrada || !conectada) throw new Error('Espera a estar conectado a la sala.'); return funcion() })
    operacion = siguiente.catch(() => undefined)
    return siguiente
  }
  const publicarEstado = () => {
    if (cerrada) return
    if (!conectada || !microfono || microfono.isMuted()) { clearTimeout(temporizadorNivel); observadores.nivelMicrofono(0) }
    observadores.estado({ conectada, microfonoActivo: !!microfono && !microfono.isMuted(), camaraActiva: !!camara && !camara.isMuted(), microfonoDisponible: !!microfono, camaraDisponible: !!camara, compartiendoPantalla: !!pantalla })
    publicarParticipantes()
  }
  const publicarParticipantes = () => {
    if (cerrada) return
    const remotos = conferencia?.getParticipants() ?? []
    const participantes: ParticipanteSala[] = remotos.map(participante => ({
      identificador: participante.getId(), usuarioIdentificador: participante.getIdentity()?.user?.id,
      nombre: participante.getDisplayName() || 'Participante', local: false,
      microfonoActivo: !participante.isAudioMuted(), camaraActiva: !participante.isVideoMuted(),
      manoLevantada: participante.getProperty('raisedHand') === 'true' || instanteMano(participante.getProperty('raisedHand')) !== undefined,
      manoLevantadaEn: instanteMano(participante.getProperty('raisedHand')),
    }))
    if (conectada) participantes.unshift({ identificador: conferencia!.myUserId(), usuarioIdentificador: observadores.usuarioIdentificador,
      nombre: credencial.nombre, local: true, microfonoActivo: !!microfono && !microfono.isMuted(), camaraActiva: !!camara && !camara.isMuted(), manoLevantada, manoLevantadaEn })
    const numerados = numerarManos(participantes)
    observadores.participantes(numerados)
    for (const [pista, vista] of elementos) {
      const persona = numerados.find(persona => persona.identificador === pista.getParticipantId() || (pista.isLocal() && persona.local))
      vista.etiqueta.textContent = `${persona?.nombre ?? 'Participante'}${pista.isLocal() ? ' (tú)' : ''}${pista.getVideoType() === 'desktop' ? ' · Pantalla' : ''}`
    }
  }
  const actualizarDistribucion = () => {
    contenedor.dataset.compartiendo = String([...elementos.keys()].some(pista => pista.getType() === 'video' && pista.getVideoType() === 'desktop'))
  }
  const mostrarPista = (pista: PistaJitsi) => {
    if (cerrada || elementos.has(pista)) return
    const elemento = document.createElement(pista.getType() === 'video' ? 'video' : 'audio')
    elemento.autoplay = true
    elemento.muted = pista.isLocal()
    if (elemento instanceof HTMLVideoElement) elemento.playsInline = true
    elemento.className = 'salaVideo'
    const tarjeta = document.createElement('figure')
    tarjeta.className = pista.getType() === 'audio' ? 'hidden' : 'salaTarjeta'
    tarjeta.dataset.tipo = pista.getVideoType() === 'desktop' ? 'pantalla' : 'camara'
    const etiqueta = document.createElement('figcaption')
    etiqueta.className = 'absolute bottom-3 left-3 rounded-md bg-black/70 px-3 py-1 text-sm text-white'
    tarjeta.append(elemento, etiqueta)
    const zona = pista.getVideoType() === 'desktop' ? zonaPantallas : zonaCamaras
    zona.append(tarjeta)
    elementos.set(pista, { elemento, tarjeta, etiqueta })
    pista.attach(elemento)
    actualizarDistribucion()
    publicarParticipantes()
  }
  const quitarPista = (pista: PistaJitsi) => {
    const vista = elementos.get(pista)
    if (vista) { pista.detach(vista.elemento); vista.tarjeta.remove(); elementos.delete(pista); actualizarDistribucion() }
  }
  const liberarPista = async (pista: PistaJitsi) => {
    quitarPista(pista)
    try { await pista.dispose() } finally { locales.delete(pista) }
  }
  const crearPista = async (tipo: 'audio' | 'video' | 'desktop', identificador?: string) => {
    const pistas = await biblioteca.createLocalTracks({ devices: [tipo], ...(tipo === 'audio' ? { micDeviceId: identificador } : tipo === 'video' ? { cameraDeviceId: identificador } : {}) })
    for (const pista of pistas) locales.add(pista)
    const seleccionada = pistas.find(pista => pista.getType() === (tipo === 'audio' ? 'audio' : 'video'))
    await Promise.all(pistas.filter(pista => pista !== seleccionada || cerrada).map(liberarPista))
    if (cerrada || !seleccionada) throw new Error('No se pudo abrir el dispositivo.')
    return seleccionada
  }
  const detenerPantalla = async () => {
    if (restaurandoPantalla) return restaurandoPantalla
    const anterior = pantalla
    if (!anterior) return
    restaurandoPantalla = (async () => {
      await conferencia!.replaceTrack(anterior, null)
      pantalla = null
      await liberarPista(anterior)
      publicarEstado()
    })().finally(() => { restaurandoPantalla = undefined })
    return restaurandoPantalla
  }
  const desconectada = () => {
    conectada = false
    publicarEstado()
    if (!cerrada) informar('Se perdió la conexión. Sal de la sala y vuelve a entrar.')
  }
  conexion.addEventListener(biblioteca.events.connection.CONNECTION_FAILED, desconectada)
  conexion.addEventListener(biblioteca.events.connection.CONNECTION_DISCONNECTED, desconectada)
  conexion.addEventListener(biblioteca.events.connection.CONNECTION_ESTABLISHED, () => {
    if (cerrada) return
    adaptarServiciosJitsi(conexion)
    conferencia = conexion.initJitsiConference(credencial.nombreSala, { openBridgeChannel: true, p2p: { enabled: false } })
    conferencia.setDisplayName(credencial.nombre)
    const eventos = biblioteca.events.conference
    moderacion = crearModeracion(conferencia, eventos, estado => {
      observadores.moderacion(estado)
      if (!conectada || cerrada) return
      void serializar(async () => {
        if (!estado.permitidos.audio && microfono && !microfono.isMuted()) await microfono.mute()
        if (!estado.permitidos.video && camara && !camara.isMuted()) await camara.mute()
        if (!estado.permitidos.desktop && pantalla) await detenerPantalla()
        publicarEstado()
      }).catch(() => { if (!cerrada) informar('No se pudo aplicar el permiso audiovisual. Sal y vuelve a entrar.') })
    })
    conferencia.on(eventos.ENDPOINT_MESSAGE_RECEIVED, (participante: ParticipanteJitsi, contenido: unknown) => {
      if (!conectada || !esReaccion(contenido)) return
      publicarReaccion(contenido.identificador, contenido.emoji, participante.getId(), participante.getDisplayName() || 'Participante')
    })
    conferencia.on(eventos.TRACK_AUDIO_LEVEL_CHANGED, (identificador: string, nivel: number) => {
      if (cerrada || !conectada || identificador !== conferencia!.myUserId()) return
      const ahora = performance.now()
      if (ahora - ultimoNivelPublicado < 80) return
      ultimoNivelPublicado = ahora
      const valor = microfono && !microfono.isMuted() && Number.isFinite(nivel) ? Math.min(1, Math.max(0, nivel)) : 0
      clearTimeout(temporizadorNivel)
      observadores.nivelMicrofono(valor)
      if (valor > 0) temporizadorNivel = setTimeout(() => { if (!cerrada) observadores.nivelMicrofono(0) }, 400)
    })
    conferencia.on(eventos.TRACK_ADDED, mostrarPista)
    conferencia.on(eventos.TRACK_REMOVED, quitarPista)
    conferencia.on(eventos.TRACK_MUTE_CHANGED, (pista: PistaJitsi) => {
      const medio = pista.getType() === 'audio' ? 'audio' : pista.getVideoType() === 'desktop' ? 'desktop' : 'video'
      if (!cerrada && pista.isLocal() && !pista.isMuted() && moderacion && !moderacion.estado().permitidos[medio]) {
        void pista.mute().then(publicarEstado).catch(() => informar('No se pudo sincronizar el estado del dispositivo. Sal y vuelve a entrar.'))
      }
      publicarEstado()
    })
    conferencia.on(eventos.TRACK_UNMUTE_REJECTED, (pista: PistaJitsi) => {
      if (cerrada) return
      void pista.mute().then(publicarEstado).catch(() => informar('El servidor rechazó la activación. Sal y vuelve a entrar.'))
    })
    for (const evento of [eventos.USER_JOINED, eventos.USER_LEFT, eventos.DISPLAY_NAME_CHANGED, eventos.PARTICIPANT_PROPERTY_CHANGED]) conferencia.on(evento, (identificador?: string) => { if (evento === eventos.USER_LEFT && identificador) ultimaReaccion.delete(identificador); publicarParticipantes() })
    conferencia.on(eventos.CONFERENCE_FAILED, desconectada)
    conferencia.on(eventos.CONFERENCE_LEFT, desconectada)
    conferencia.on(eventos.MESSAGE_RECEIVED, (remitente: string, texto: string, fecha: string | number | undefined, nombre: string, visitante: boolean, identificador: string) => {
      if (cerrada) return
      const instante = fecha ? new Date(fecha) : new Date()
      observadores.mensaje({ identificador: identificador || crypto.randomUUID(), nombre: nombre || (remitente === conferencia?.myUserId() ? credencial.nombre : visitante ? 'Visitante' : 'Participante'), texto: texto.slice(0, 4000), hora: Number.isNaN(instante.getTime()) ? new Date().toISOString() : instante.toISOString() })
    })
    conferencia.on(eventos.CONFERENCE_JOINED, () => {
      if (cerrada) return
      conectada = true
      informar('Conectado')
      moderacion?.publicar()
      publicarEstado()
      void serializar(async () => {
        for (const tipo of opciones.habilitarMedios === false ? [] : ['audio', 'video'] as const) {
          try {
            const pista = await crearPista(tipo)
            if (moderacion && !moderacion.estado().permitidos[tipo]) await pista.mute()
            try { await conferencia!.addTrack(pista) } catch (error) { await liberarPista(pista); throw error }
            if (tipo === 'audio') microfono = pista
            else camara = pista
            mostrarPista(pista)
          } catch { if (!cerrada) informar(`Conectado. No se pudo abrir ${tipo === 'audio' ? 'el micrófono' : 'la cámara'}. Puedes elegir un dispositivo en Opciones.`) }
          publicarEstado()
        }
      }).catch(() => undefined)
    })
    conferencia.join()
  })
  conexion.connect()
  return {
    alternar: (tipo: 'audio' | 'video') => serializar(async () => {
      const pista = tipo === 'audio' ? microfono : camara
      if (!pista) {
        if (moderacion && !moderacion.estado().permitidos[tipo]) throw new Error('Levanta la mano y espera la autorización del anfitrión.')
        const nueva = await crearPista(tipo)
        try { await conferencia!.addTrack(nueva) } catch (error) { await liberarPista(nueva); throw error }
        if (tipo === 'audio') microfono = nueva
        else camara = nueva
        mostrarPista(nueva)
        publicarEstado()
        return
      }
      if (pista.isMuted()) {
        if (moderacion && !moderacion.estado().permitidos[tipo]) throw new Error('Levanta la mano y espera la autorización del anfitrión.')
        await pista.unmute()
      } else await pista.mute()
      publicarEstado()
    }),
    compartirPantalla: () => serializar(async () => {
      if (pantalla) { await detenerPantalla(); return }
      if (moderacion && !moderacion.estado().permitidos.desktop) throw new Error('Levanta la mano y solicita permiso para compartir pantalla.')
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Este navegador no permite compartir pantalla. Usa un navegador de escritorio con HTTPS o localhost.')
      const nueva = await crearPista('desktop')
      try { await conferencia!.addTrack(nueva) } catch (error) { await liberarPista(nueva); throw error }
      pantalla = nueva
      mostrarPista(nueva)
      nueva.addEventListener(biblioteca.events.track.LOCAL_TRACK_STOPPED, () => {
        if (!cerrada && pantalla === nueva) void serializar(detenerPantalla).catch(() => informar('No se pudo detener la pantalla. Sal y vuelve a entrar.'))
      })
      publicarEstado()
    }),
    cambiarDispositivo: (tipo: 'audio' | 'video', identificador: string) => serializar(async () => {
      const anterior = tipo === 'audio' ? microfono : camara
      const nueva = await crearPista(tipo, identificador)
      try {
        if (anterior?.isMuted() || (moderacion && !moderacion.estado().permitidos[tipo])) await nueva.mute()
        await conferencia!.replaceTrack(anterior, nueva)
      } catch (error) { await liberarPista(nueva); throw error }
      if (tipo === 'audio') microfono = nueva; else camara = nueva
      if (anterior) await liberarPista(anterior)
      mostrarPista(nueva)
      publicarEstado()
    }),
    levantarMano: () => serializar(async () => {
      manoLevantada = !manoLevantada
      const instantes = conferencia!.getParticipants().map(persona => instanteMano(persona.getProperty('raisedHand')) ?? 0)
      manoLevantadaEn = manoLevantada ? Math.max(Date.now(), ...instantes.map(instante => instante + 1)) : undefined
      conferencia!.setLocalParticipantProperty('raisedHand', manoLevantadaEn ? String(manoLevantadaEn) : 'false')
      publicarParticipantes()
      return manoLevantada
    }),
    configurarModeracion: (medio: import('./moderacionSala').MedioModerado, restringido: boolean) => {
      if (!moderacion || !conectada) return Promise.reject(new Error('Espera a que se conecte la sala.'))
      return moderacion.configurar(medio, restringido)
    },
    autorizarParticipante: (medio: import('./moderacionSala').MedioModerado, identificador: string, permitir: boolean) => {
      if (!moderacion || !conectada) return Promise.reject(new Error('Espera a que se conecte la sala.'))
      return moderacion.autorizar(medio, identificador, permitir)
    },
    enviarReaccion: (emoji: string) => serializar(async () => {
      if (!reaccionesDisponibles.some(reaccion => reaccion.emoji === emoji)) throw new Error('Selecciona una reacción disponible.')
      if (Date.now() - ultimoEnvioReaccion < 1000) throw new Error('Espera un segundo antes de enviar otra reacción.')
      const identificador = crypto.randomUUID()
      conferencia!.sendMessage({ tipo: 'reaccionGestionCapa', identificador, emoji })
      ultimoEnvioReaccion = Date.now()
      publicarReaccion(identificador, emoji, conferencia!.myUserId(), credencial.nombre)
    }),
    enviarMensaje: (texto: string) => serializar(async () => {
      const mensaje = texto.trim()
      if (!mensaje || mensaje.length > 2000) throw new Error('Escribe un mensaje de hasta 2000 caracteres.')
      conferencia!.sendTextMessage(mensaje)
    }),
    cerrar: async () => {
      if (cerrada) return
      cerrada = true
      clearTimeout(temporizadorNivel)
      observadores.nivelMicrofono(0)
      moderacion?.cerrar()
      await Promise.allSettled([...locales].map(liberarPista))
      for (const pista of elementos.keys()) quitarPista(pista)
      zonaPantallas.remove()
      zonaCamaras.remove()
      contenedor.dataset.compartiendo = 'false'
      try { if (conferencia) await conferencia.leave() } finally { conexion.disconnect() }
    },
  }
}
