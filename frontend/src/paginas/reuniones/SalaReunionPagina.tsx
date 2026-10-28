import './sala.css'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Camera, CameraOff, Check, ChevronDown, Copy, Hand, Maximize, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Settings, Smile, Users } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { clasificarParticipantes } from '@/servicios/presenciaReunion'
import { intensidadMicrofono } from '@/servicios/intensidadMicrofono'
import { reaccionesDisponibles } from '@/servicios/interaccionesSala'
import { moderacionInicial, mediosModerados, type EstadoModeracion } from '@/servicios/moderacionSala'
import { reuniones } from '@/servicios/reuniones'
import { conectarSala, type EstadoSala, type MensajeSala, type ParticipanteSala, type ReaccionSala } from '@/servicios/salaJitsi'

const nombresMedios = { audio: 'Micrófono', video: 'Cámara', desktop: 'Pantalla compartida' }
const estadoInicial: EstadoSala = { conectada: false, microfonoActivo: false, camaraActiva: false, microfonoDisponible: false, camaraDisponible: false, compartiendoPantalla: false }
const boton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40'


export function SalaReunionPagina() {
  const { identificador = '' } = useParams()
  return <ContenidoSalaReunion key={identificador} identificador={identificador} />
}

function ContenidoSalaReunion({ identificador }: { identificador: string }) {
  const { usuario } = useAuth()
  const contenedor = useRef<HTMLDivElement>(null)
  const escenario = useRef<HTMLDivElement>(null)
  const contenedorChat = useRef<HTMLDivElement>(null)
  const sala = useRef<Awaited<ReturnType<typeof conectarSala>> | null>(null)
  const [moderacion, cambiarModeracion] = useState<EstadoModeracion>(moderacionInicial)
  const [pantallaCompleta, cambiarPantallaCompleta] = useState<Element | null>(null)
  const [estado, cambiarEstado] = useState('Conectando…')
  const [nivelMicrofono, cambiarNivelMicrofono] = useState(0)
  const [medios, cambiarMedios] = useState<EstadoSala>(estadoInicial)
  const [participantes, cambiarParticipantes] = useState<ParticipanteSala[]>([])
  const [mensajes, cambiarMensajes] = useState<MensajeSala[]>([])
  const [textoMensaje, cambiarTextoMensaje] = useState('')
  const [panel, cambiarPanel] = useState<'participantes' | 'chat' | 'opciones'>('participantes')
  const [panelVisible, cambiarPanelVisible] = useState(false)
  const [ocupado, cambiarOcupado] = useState(false)
  const [error, cambiarError] = useState('')
  const [selectorReacciones, cambiarSelectorReacciones] = useState(false)
  const [reacciones, cambiarReacciones] = useState<ReaccionSala[]>([])
  const [copiado, cambiarCopiado] = useState(false)
  const [dispositivos, cambiarDispositivos] = useState<MediaDeviceInfo[]>([])
  const puedeConsultarInscritos = !!usuario && usuario.rol !== 'PARTICIPANTE'
  const reunion = useQuery({ queryKey: ['reunion', identificador], queryFn: () => reuniones.obtener(identificador) })
  const inscritos = useQuery({ queryKey: ['participantesReunion', identificador], queryFn: () => reuniones.participantes(identificador), enabled: puedeConsultarInscritos, refetchInterval: 30000 })

  useEffect(() => {
    let cancelada = false
    void reuniones.credencial(identificador).then(async credencial => {
      if (cancelada || !contenedor.current || !usuario) return
      const conexion = await conectarSala(credencial, contenedor.current, mensaje => { if (!cancelada) cambiarEstado(mensaje) }, {
        usuarioIdentificador: usuario.id,
        estado: valor => { if (!cancelada) cambiarMedios(valor) },
        participantes: valor => { if (!cancelada) cambiarParticipantes(valor) },
        nivelMicrofono: nivel => { if (!cancelada) cambiarNivelMicrofono(nivel) },
        moderacion: valor => { if (!cancelada) cambiarModeracion(valor) },
        reaccion: reaccion => { if (!cancelada) cambiarReacciones(anteriores => [...anteriores.slice(-4), reaccion]) },
        mensaje: mensaje => { if (!cancelada) cambiarMensajes(anteriores => anteriores.some(anterior => anterior.identificador === mensaje.identificador) ? anteriores : [...anteriores.slice(-199), mensaje]) },
      })
      if (cancelada) await conexion.cerrar()
      else sala.current = conexion
    }).catch(fallo => { if (!cancelada) { cambiarEstado('No se pudo entrar'); cambiarError(fallo.message) } })
    return () => { cancelada = true; void sala.current?.cerrar().catch(() => undefined); sala.current = null }
  }, [identificador, usuario])

  useEffect(() => {
    const actualizar = () => { void navigator.mediaDevices?.enumerateDevices().then(cambiarDispositivos).catch(() => undefined) }
    actualizar()
    navigator.mediaDevices?.addEventListener('devicechange', actualizar)
    return () => navigator.mediaDevices?.removeEventListener('devicechange', actualizar)
  }, [medios.camaraDisponible, medios.microfonoDisponible])
  useEffect(() => { if (panel === 'chat' && contenedorChat.current) contenedorChat.current.scrollTop = contenedorChat.current.scrollHeight }, [mensajes, panel])

  useEffect(() => {
    if (!reacciones.length) return
    const temporizador = window.setTimeout(() => cambiarReacciones(anteriores => anteriores.filter(reaccion => Date.now() - reaccion.recibidaEn < 5000)), Math.max(0, reacciones[0].recibidaEn + 5000 - Date.now()))
    return () => window.clearTimeout(temporizador)
  }, [reacciones])
  useEffect(() => {
    if (!selectorReacciones) return
    const cerrarSelector = (evento: KeyboardEvent) => { if (evento.key === 'Escape') cambiarSelectorReacciones(false) }
    document.addEventListener('keydown', cerrarSelector)
    return () => document.removeEventListener('keydown', cerrarSelector)
  }, [selectorReacciones])

  useEffect(() => {
    const actualizar = () => cambiarPantallaCompleta(document.fullscreenElement)
    document.addEventListener('fullscreenchange', actualizar)
    return () => document.removeEventListener('fullscreenchange', actualizar)
  }, [])

  const ejecutar = async (accion: () => Promise<unknown>) => {
    if (ocupado) return
    cambiarOcupado(true); cambiarError('')
    try { await accion() } catch (fallo) { cambiarError((fallo as Error).name === 'NotAllowedError' ? 'Se canceló la selección o no se concedió permiso al dispositivo.' : (fallo as Error).message) }
    finally { cambiarOcupado(false) }
  }
  const usarSala = () => { if (!sala.current) throw new Error('Espera a que la sala esté conectada.'); return sala.current }
  const enviarMensaje = (evento: FormEvent) => {
    evento.preventDefault()
    void ejecutar(async () => { await usarSala().enviarMensaje(textoMensaje); cambiarTextoMensaje('') })
  }
  const copiarEnlace = () => ejecutar(async () => {
    await navigator.clipboard.writeText(window.location.href)
    cambiarCopiado(true)
  })
  const sinConexion = clasificarParticipantes(inscritos.data ?? [], participantes)
  const identidadesDesconocidas = participantes.some(persona => !persona.usuarioIdentificador)
  const colaManos = participantes.filter(persona => persona.turnoMano).sort((primera, segunda) => primera.turnoMano! - segunda.turnoMano!)
  const manoLocal = participantes.find(persona => persona.local)
  const mano = !!manoLocal?.manoLevantada
  const bloqueado = ocupado || !medios.conectada
  const intensidad = intensidadMicrofono(nivelMicrofono, medios.microfonoActivo && medios.conectada)
  const reaccionesVisibles = (<div className="salaReacciones" role="status" aria-live="polite" aria-label="Reacciones de la sala">
      {reacciones.map(reaccion => <div className="salaReaccion" key={reaccion.identificador} style={{ left: `${10 + parseInt(reaccion.identificador.slice(0, 8), 16) % 80}%` }}><span className="salaEmoji" aria-hidden>{reaccion.emoji}</span><span className="salaReaccionNombre">{reaccion.nombre}</span><span className="sr-only">{reaccionesDisponibles.find(opcion => opcion.emoji === reaccion.emoji)?.nombre}</span></div>)}
    </div>)
  return <main className="salaVentana bg-slate-950 text-slate-100">
    {pantallaCompleta ? createPortal(reaccionesVisibles, pantallaCompleta) : reaccionesVisibles}
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-2">
      <div className="min-w-0"><Link to="/reuniones" className="text-xs text-slate-400 hover:text-white">← Reuniones · GestionCapa</Link>
        <h1 className="truncate text-base font-semibold text-white">{reunion.data?.titulo ?? 'Sala de videoconferencia'}</h1>
        <p role="status" className="flex items-center gap-2 text-xs text-slate-300"><span className={`size-2 rounded-full ${medios.conectada ? 'bg-emerald-400' : 'bg-amber-400'}`} />{estado}{medios.compartiendoPantalla && <span className="text-emerald-300"> · Compartiendo pantalla</span>}</p></div>
      <button className={boton} onClick={() => void copiarEnlace()}>{copiado ? <Check size={17} /> : <Copy size={17} />}{copiado ? 'Enlace copiado' : 'Copiar invitación'}</button>
    </header>
    {!moderacion.moderador && mediosModerados.some(medio => !moderacion.permitidos[medio]) && <p role="status" className="shrink-0 bg-amber-950 px-4 py-2 text-xs text-amber-100">Para activar los dispositivos restringidos, levanta la mano y espera la autorización del anfitrión.</p>}
    {error && <div role="alert" className="m-4 flex items-center justify-between gap-3 rounded-xl border border-red-800 bg-red-950 p-4 text-sm text-red-100">{error}<button onClick={() => cambiarError('')} aria-label="Cerrar aviso">×</button></div>}
    <div className="salaContenido" data-panel-visible={panelVisible}>
      <section ref={escenario} aria-label="Vídeos de la reunión" className="salaEscenario relative bg-slate-950">
        <div ref={contenedor} className="salaMedios flex-1" />

        {!medios.camaraActiva && !medios.compartiendoPantalla && <p className="my-4 text-center text-sm text-slate-400">Tu cámara está apagada o no está disponible. Puedes participar con audio y chat.</p>}
        <div className="mt-2 flex shrink-0 items-center justify-between text-xs text-slate-400"><span>{participantes.length} conexiones en la sala</span><button className="inline-flex items-center gap-2" onClick={() => void ejecutar(async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await escenario.current?.requestFullscreen() })}><Maximize size={16} />Pantalla completa</button></div>
      </section>
      <aside hidden={!panelVisible} className="salaPanel border-l border-slate-800 bg-slate-900" aria-label="Herramientas de la reunión">
        <button onClick={() => cambiarPanelVisible(false)} className="self-end px-3 py-2 text-xs text-slate-300" aria-label="Ocultar panel lateral">Ocultar panel ×</button>
        <div className="flex border-b border-slate-700" role="tablist" aria-label="Panel de sala">
          {([['participantes', Users, 'Personas'], ['chat', MessageSquare, 'Chat'], ['opciones', Settings, 'Opciones']] as const).map(([valor, Icono, titulo]) =>
            <button key={valor} id={`pestana-${valor}`} role="tab" aria-selected={panel === valor} aria-controls="panel-sala" onClick={() => cambiarPanel(valor)} className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-2 py-4 text-sm ${panel === valor ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400'}`}><Icono size={16} />{titulo}</button>)}
        </div>
        <div role="tabpanel" id="panel-sala" aria-labelledby={`pestana-${panel}`} className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
          {panel === 'participantes' && <>
            {colaManos.length > 0 && <section aria-label="Cola de manos levantadas" className="mb-5 rounded-xl border border-amber-400/60 bg-amber-400/10 p-3">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-200"><Hand size={17} />Turnos para participar</h2>
              <ol className="space-y-3">{colaManos.map(persona => <li key={persona.identificador} className="flex items-center gap-2 text-sm"><span className="salaNumeroTurno" aria-label={`Turno ${persona.turnoMano}`}>{persona.turnoMano}</span><span>{persona.nombre}{persona.local ? ' (tú)' : ''}</span></li>)}</ol>
            </section>}
            <h2 className="mb-4 text-sm font-semibold">En la sala ({participantes.length})</h2>
            {!participantes.length && <p className="text-sm text-slate-400">Esperando conexión…</p>}
            <ul className="space-y-4">{participantes.map(persona => <li key={persona.identificador} className="flex flex-wrap items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-700 font-semibold">{persona.nombre.slice(0, 1).toUpperCase()}</span>
              <span className="flex-1 text-sm">{persona.nombre}{persona.local ? ' (tú)' : ''}</span>
              {persona.turnoMano && <span className="salaNumeroTurno" aria-label={`Mano levantada, turno ${persona.turnoMano}`}><Hand size={13} />{persona.turnoMano}</span>}
              {persona.microfonoActivo ? <Mic size={15} aria-label="Micrófono activo" /> : <MicOff size={15} className="text-slate-500" aria-label="Micrófono apagado" />}
              {persona.camaraActiva ? <Camera size={15} aria-label="Vídeo activo" /> : <CameraOff size={15} className="text-slate-500" aria-label="Vídeo apagado" />}
              {moderacion.moderador && !persona.local && <div className="flex w-full flex-wrap gap-2 pl-12">
                {mediosModerados.filter(medio => moderacion.restringidos[medio]).map(medio => {
                  const autorizado = !!moderacion.autorizaciones[persona.identificador]?.[medio]
                  return <button key={medio} disabled={ocupado || (!autorizado && !persona.manoLevantada)} className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-amber-200 disabled:opacity-40" aria-label={`${autorizado ? 'Retirar permiso de' : 'Autorizar'} ${nombresMedios[medio].toLowerCase()} a ${persona.nombre}`} onClick={() => void ejecutar(() => usarSala().autorizarParticipante(medio, persona.identificador, !autorizado))}>{autorizado ? 'Retirar' : 'Autorizar'} {nombresMedios[medio].toLowerCase()}</button>
                })}
              </div>}
            </li>)}</ul>
            {puedeConsultarInscritos && <div className="mt-7 border-t border-slate-700 pt-5">
              <h2 className="mb-3 text-sm font-semibold">Sin conexión detectada ({sinConexion.length})</h2>
              <p className="mb-4 text-xs leading-5 text-slate-400">Compara los inscritos con las conexiones actuales. No representa la asistencia acumulada ni quién estuvo antes.</p>
              {inscritos.isPending && <p className="text-sm">Cargando inscritos…</p>}
              {inscritos.isError && <p role="alert" className="text-sm text-amber-200">No se pudo consultar la lista de inscritos.</p>}
              {identidadesDesconocidas && <p className="mb-3 text-xs text-amber-200">Hay conexiones sin identidad verificable; pueden aparecer también en esta lista.</p>}
              <ul className="space-y-3">{sinConexion.map(persona => <li key={persona.identificador} className="text-sm text-slate-300">{persona.nombre}<span className="ml-2 text-xs text-slate-500">Sin conexión</span></li>)}</ul>
            </div>}
          </>}
          {panel === 'chat' && <>
            <p className="mb-4 text-xs text-slate-400">Mensajes de esta conferencia. El historial visible se limpia al salir.</p>
            <div ref={contenedorChat} role="log" aria-live="polite" aria-label="Mensajes de la reunión" className="min-h-40 flex-1 space-y-4 overflow-auto">
              {mensajes.length === 0 && <p className="text-sm text-slate-400">Aún no hay mensajes.</p>}
              {mensajes.map(mensaje => <article key={mensaje.identificador} className="rounded-xl bg-slate-800 p-3"><div className="mb-1 flex justify-between gap-3 text-xs text-slate-400"><strong className="text-slate-200">{mensaje.nombre}</strong><time>{new Date(mensaje.hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</time></div><p className="whitespace-pre-wrap break-words text-sm">{mensaje.texto}</p></article>)}
            </div>
            <form onSubmit={enviarMensaje} className="mt-4 flex flex-col gap-2"><label htmlFor="mensaje-sala" className="text-xs text-slate-300">Mensaje para todos</label><textarea id="mensaje-sala" value={textoMensaje} onChange={evento => cambiarTextoMensaje(evento.target.value)} maxLength={2000} rows={3} className="rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm text-white" placeholder="Escribe un mensaje…" /><button className={boton} disabled={bloqueado || !textoMensaje.trim()}>Enviar mensaje</button></form>
          </>}
          {panel === 'opciones' && <div className="space-y-6">
            <section aria-label="Permisos de los asistentes" className="space-y-4 border-b border-slate-700 pb-5">
              <h2 className="font-semibold">Permisos de los asistentes</h2>
              {moderacion.moderador && moderacion.disponible ? <>
                <p className="text-xs leading-5 text-slate-400">En modo autorización, el asistente levanta la mano y el anfitrión concede el permiso desde Personas. Se aplica a nuevas activaciones y detiene las transmisiones actuales de asistentes.</p>
                {mediosModerados.map(medio => <label key={medio} className="block text-sm">{nombresMedios[medio]}<select aria-label={`Permiso de ${nombresMedios[medio].toLowerCase()}`} value={moderacion.restringidos[medio] ? 'autorizar' : 'libre'} disabled={bloqueado} onChange={evento => { const restringido = evento.target.value === 'autorizar'; void ejecutar(() => usarSala().configurarModeracion(medio, restringido)) }} className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-800 p-2"><option value="libre">Permitir a todos</option><option value="autorizar">Levantar mano y autorizar</option></select></label>)}
              </> : <p className="text-xs leading-5 text-slate-400">{moderacion.disponible ? 'El anfitrión gestiona estos permisos. Puedes levantar la mano para solicitar autorización.' : 'La moderación requiere un servidor Jitsi compatible y un anfitrión con rol de moderador.'}</p>}
            </section>
            <h2 className="font-semibold">Mis dispositivos</h2>
            <div className="salaEstadoMicrofono" role="meter" aria-label="Intensidad del micrófono" aria-valuemin={0} aria-valuemax={100} aria-valuenow={intensidad} aria-valuetext={!medios.microfonoActivo ? 'Micrófono silenciado' : intensidad > 0 ? 'Captando audio' : 'Micrófono activo, sin sonido detectado'}>
              <MedidorMicrofono intensidad={intensidad} /><span>{!medios.microfonoActivo ? 'Micrófono silenciado' : intensidad > 0 ? 'Captando audio' : 'Sin sonido detectado'}</span>
            </div>
            {(['audio', 'video'] as const).map(tipo => <label key={tipo} className="block text-sm">{tipo === 'audio' ? 'Micrófono' : 'Cámara'}<select defaultValue="" disabled={bloqueado} onChange={evento => { const valor = evento.target.value; void ejecutar(() => usarSala().cambiarDispositivo(tipo, valor)) }} className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-800 p-3"><option value="" disabled>Seleccionar dispositivo</option>{dispositivos.filter(dispositivo => dispositivo.kind === (tipo === 'audio' ? 'audioinput' : 'videoinput')).map((dispositivo, indice) => <option key={dispositivo.deviceId || indice} value={dispositivo.deviceId}>{dispositivo.label || `${tipo === 'audio' ? 'Micrófono' : 'Cámara'} ${indice + 1}`}</option>)}</select></label>)}
            <p className="text-xs leading-5 text-slate-400">Si no aparecen dispositivos, permite su uso desde el candado del navegador. Compartir pantalla requiere un navegador compatible.</p>
            <button className={boton} onClick={() => void copiarEnlace()}><Copy size={16} />Copiar enlace de la sala</button>
          </div>}
        </div>
      </aside>
    </div>
    <footer className="relative flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-slate-700 bg-slate-900 p-2">
      <Control activo={medios.microfonoActivo} disabled={bloqueado || !medios.microfonoDisponible || (!moderacion.permitidos.audio && !medios.microfonoActivo)} onClick={() => void ejecutar(() => usarSala().alternar('audio'))} icono={<span className="salaIconoMicrofono">{medios.microfonoActivo ? <Mic size={20} /> : <MicOff size={20} />}<MedidorMicrofono intensidad={intensidad} /></span>}>{medios.microfonoActivo ? 'Silenciar' : 'Activar micrófono'}</Control>
      <Control activo={medios.camaraActiva} disabled={bloqueado || !medios.camaraDisponible || (!moderacion.permitidos.video && !medios.camaraActiva)} onClick={() => void ejecutar(() => usarSala().alternar('video'))} icono={medios.camaraActiva ? <Camera size={20} /> : <CameraOff size={20} />}>{medios.camaraActiva ? 'Apagar cámara' : 'Activar cámara'}</Control>
      <Control activo={medios.compartiendoPantalla} disabled={bloqueado || (!moderacion.permitidos.desktop && !medios.compartiendoPantalla)} onClick={() => void ejecutar(() => usarSala().compartirPantalla())} icono={<MonitorUp size={20} />}>{medios.compartiendoPantalla ? 'Dejar de compartir' : 'Compartir pantalla'}</Control>
      <Control activo={mano} disabled={bloqueado} onClick={() => void ejecutar(() => usarSala().levantarMano())} icono={<Hand size={20} />}>{mano ? 'Bajar mano' : 'Levantar mano'}</Control>
      <button className={`${boton} salaControl`} aria-pressed={panelVisible && panel === 'participantes'} onClick={() => { cambiarPanel('participantes'); cambiarPanelVisible(!(panelVisible && panel === 'participantes')) }}><Users size={18} />Personas</button>
      <button className={`${boton} salaControl`} aria-pressed={panelVisible && panel === 'chat'} onClick={() => { cambiarPanel('chat'); cambiarPanelVisible(!(panelVisible && panel === 'chat')) }}><MessageSquare size={18} />Chat</button>
      <button className={`${boton} salaControl`} aria-pressed={panelVisible && panel === 'opciones'} onClick={() => { cambiarPanel('opciones'); cambiarPanelVisible(!(panelVisible && panel === 'opciones')) }}><Settings size={20} /><ChevronDown size={14} /><span className="sr-only">Opciones de dispositivos</span></button>
      <div className="relative">
        <button className={`${boton} salaControl`} aria-pressed={selectorReacciones} aria-expanded={selectorReacciones} aria-controls="selector-reacciones" onClick={() => cambiarSelectorReacciones(!selectorReacciones)} disabled={!medios.conectada}><Smile size={20} /><span>Reacciones</span></button>
        {selectorReacciones && <div id="selector-reacciones" role="group" aria-label="Elegir reacción" className="absolute right-0 bottom-full z-30 mb-3 flex gap-1 rounded-2xl border border-slate-500 bg-slate-800 p-2 shadow-2xl">
          {reaccionesDisponibles.map(reaccion => <button key={reaccion.emoji} aria-label={`Enviar ${reaccion.nombre}`} title={reaccion.nombre} disabled={bloqueado} className="rounded-xl p-2 text-3xl transition-transform hover:scale-125 hover:bg-slate-600 disabled:opacity-40" onClick={() => void ejecutar(async () => { await usarSala().enviarReaccion(reaccion.emoji); cambiarSelectorReacciones(false) })}>{reaccion.emoji}</button>)}
        </div>}
      </div>
      <Link to="/reuniones" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500"><PhoneOff size={20} />Salir</Link>
    </footer>
  </main>
}

function Control({ activo, disabled, onClick, icono, children }: { activo: boolean; disabled: boolean; onClick: () => void; icono: ReactNode; children: ReactNode }) {
  return <button aria-pressed={activo} disabled={disabled} onClick={onClick} className={`${boton} salaControl`}>{icono}{children}</button>
}


function MedidorMicrofono({ intensidad }: { intensidad: number }) {
  return <span className="salaMedidorMicrofono" aria-hidden="true">{[1, 2, 3, 4, 5].map(barra => <i key={barra} data-activa={intensidad > (barra - 1) * 20} style={{ height: `${4 + barra * 3}px` }} />)}</span>
}
