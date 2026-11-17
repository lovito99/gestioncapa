import './sala.css'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { CircleDot, Hand, Lock, LogOut, MessageSquare, Mic, MicOff, MonitorUp, MoreVertical, SlidersHorizontal, UserX, Users, Video, VideoOff } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Dialogo } from '@/components/ui/Dialogo'
import { Boton } from '@/components/ui/Boton'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { clasificarParticipantes } from '@/servicios/presenciaReunion'
import { moderacionInicial, mediosModerados, type EstadoModeracion } from '@/servicios/moderacionSala'
import { reuniones } from '@/servicios/reuniones'
import { conectarSala, type EstadoSala, type MensajeSala, type ParticipanteSala, type PoliticasSala, type SolicitudEspera } from '@/servicios/salaJitsi'
import { PanelSalaEspera } from './salaSegura'
import { Avatar, BotonBarra, DialogoExpulsar, DialogoGrabacion, PanelPermisos, PantallaFinSala, VestibuloSala, type PermisosSala } from './piezasSala'

const estadoInicial: EstadoSala = { conectada: false, microfonoActivo: false, camaraActiva: false, microfonoDisponible: false, camaraDisponible: false, compartiendoPantalla: false }
type Pestana = 'participantes' | 'chat' | 'manos'

export function SalaReunionPagina() {
  const { identificador = '' } = useParams()
  return <ContenidoSalaReunion key={identificador} identificador={identificador} />
}

/**
 * HU-26 · SCRUM-208 (Figma S3 9.1–9.4): vestíbulo con sala de espera, aviso de grabación,
 * sala oscura con panel de participantes, permisos del anfitrión y expulsión con motivo.
 */
function ContenidoSalaReunion({ identificador }: { identificador: string }) {
  const { usuario } = useAuth()
  const navegar = useNavigate()
  const contenedor = useRef<HTMLDivElement>(null)
  const contenedorChat = useRef<HTMLDivElement>(null)
  const sala = useRef<Awaited<ReturnType<typeof conectarSala>> | null>(null)
  const deseoAplicado = useRef(false)
  const [moderacion, cambiarModeracion] = useState<EstadoModeracion>(moderacionInicial)
  const [habilitarMedios, cambiarHabilitarMedios] = useState<boolean | null>(null)
  // Políticas guardadas al entrar: un cambio posterior en la reunión no reinicia la conexión.
  const [politicasSala, cambiarPoliticasSala] = useState<(PoliticasSala & { aceptaGrabacion: boolean }) | null>(null)
  const [preguntaGrabacion, cambiarPreguntaGrabacion] = useState(false)
  const [deseo, cambiarDeseo] = useState({ audio: false, video: false })
  const [enEspera, cambiarEnEspera] = useState(false)
  const [fin, cambiarFin] = useState<'retirado' | 'rechazado' | 'sinAcceso' | null>(null)
  const [solicitudes, cambiarSolicitudes] = useState<SolicitudEspera[]>([])
  const [aviso, cambiarAviso] = useState('')
  const [estado, cambiarEstado] = useState('')
  const [medios, cambiarMedios] = useState<EstadoSala>(estadoInicial)
  const [participantes, cambiarParticipantes] = useState<ParticipanteSala[]>([])
  const [mensajes, cambiarMensajes] = useState<MensajeSala[]>([])
  const [textoMensaje, cambiarTextoMensaje] = useState('')
  const [pestana, cambiarPestana] = useState<Pestana>('participantes')
  const [panelVisible, cambiarPanelVisible] = useState(usuario?.rol !== 'AGREMIADO' && window.matchMedia?.('(min-width: 1024px)').matches)
  const [permisosAbiertos, cambiarPermisosAbiertos] = useState(false)
  const [menuPersona, cambiarMenuPersona] = useState<string | null>(null)
  const [porExpulsar, cambiarPorExpulsar] = useState<ParticipanteSala | null>(null)
  const [confirmarFin, cambiarConfirmarFin] = useState(false)
  const [manoPermitida, cambiarManoPermitida] = useState<boolean | null>(null)
  const [ocupado, cambiarOcupado] = useState(false)
  const [error, cambiarError] = useState('')
  const esColegiado = usuario?.rol === 'AGREMIADO'
  const puedeConsultarInscritos = !!usuario && !esColegiado
  const reunion = useQuery({ queryKey: ['reunion', identificador], queryFn: () => reuniones.obtener(identificador), retry: false })
  const inscritos = useQuery({ queryKey: ['participantesReunion', identificador], queryFn: () => reuniones.participantes(identificador), enabled: puedeConsultarInscritos, refetchInterval: 30000 })

  const grabacionPrevista = !!reunion.data?.grabacionPrevista
  const entrar = (aceptaGrabacion = false) => {
    if (!reunion.data) return
    const { camaraPermitida, microfonoPermitido, pantallaPermitida, manoPermitida: mano } = reunion.data
    cambiarError('')
    cambiarPoliticasSala({ camaraPermitida, microfonoPermitido, pantallaPermitida, manoPermitida: mano, aceptaGrabacion })
    // Los dispositivos elegidos en el vestíbulo se encienden al ser admitido (ver efecto de abajo).
    cambiarHabilitarMedios(false)
  }
  const pedirEntrada = () => { if (grabacionPrevista && esColegiado) cambiarPreguntaGrabacion(true); else entrar() }

  // Revoca el acceso en el backend: sin credencial nueva, el expulsado no vuelve a entrar.
  const { refetch: refrescarInscritos } = inscritos
  const revocar = useCallback(async (usuarioIdentificador: string, motivo?: string) => {
    await reuniones.retirar(identificador, usuarioIdentificador, motivo)
    await refrescarInscritos()
  }, [identificador, refrescarInscritos])

  useEffect(() => {
    if (habilitarMedios === null || !politicasSala) return
    let cancelada = false
    void reuniones.credencial(identificador, politicasSala.aceptaGrabacion ? { aceptaGrabacion: true } : {}).then(async credencial => {
      if (cancelada || !contenedor.current || !usuario) return
      const conexion = await conectarSala(credencial, contenedor.current, mensaje => { if (!cancelada) cambiarEstado(mensaje) }, {
        usuarioIdentificador: usuario.id,
        estado: valor => { if (!cancelada) cambiarMedios(valor) },
        participantes: valor => { if (!cancelada) cambiarParticipantes(valor) },
        nivelMicrofono: () => undefined,
        moderacion: valor => { if (!cancelada) cambiarModeracion(valor) },
        reaccion: () => undefined,
        mensaje: mensaje => { if (!cancelada) cambiarMensajes(anteriores => anteriores.some(anterior => anterior.identificador === mensaje.identificador) ? anteriores : [...anteriores.slice(-199), mensaje]) },
        espera: valor => { if (!cancelada) cambiarEnEspera(valor) },
        solicitudesEspera: valor => { if (!cancelada) cambiarSolicitudes(valor) },
        fin: motivo => { if (!cancelada) cambiarFin(motivo) },
        infraccion: ({ usuarioIdentificador }) => {
          if (cancelada) return
          cambiarAviso('Se expulsó a una persona por compartir pantalla sin autorización.')
          if (usuarioIdentificador) void revocar(usuarioIdentificador, 'Compartió pantalla sin autorización').catch(() => cambiarError('Se expulsó a la persona, pero no se pudo revocar su acceso. Retírala desde Participantes.'))
        },
      }, { habilitarMedios, politicas: politicasSala })
      if (cancelada) await conexion.cerrar()
      else sala.current = conexion
    }).catch(fallo => {
      if (cancelada) return
      if (fallo instanceof ApiError && (fallo.status === 403 || fallo.status === 404)) cambiarFin('sinAcceso')
      else { cambiarHabilitarMedios(null); cambiarError((fallo as Error).message) }
    })
    return () => { cancelada = true; void sala.current?.cerrar().catch(() => undefined); sala.current = null }
  }, [identificador, usuario, habilitarMedios, politicasSala, revocar])

  // Al ser admitido, enciende el micrófono y la cámara que eligió en el vestíbulo.
  useEffect(() => {
    if (!medios.conectada || deseoAplicado.current || !sala.current) return
    deseoAplicado.current = true
    const conexion = sala.current
    void (async () => {
      for (const tipo of ['audio', 'video'] as const) {
        if (!deseo[tipo]) continue
        try { await conexion.alternar(tipo) } catch (fallo) { cambiarAviso((fallo as Error).message) }
      }
    })()
  }, [medios.conectada, deseo])

  useEffect(() => { if (pestana === 'chat' && contenedorChat.current) contenedorChat.current.scrollTop = contenedorChat.current.scrollHeight }, [mensajes, pestana])

  const ejecutar = async (accion: () => Promise<unknown> | unknown) => {
    if (ocupado) return
    cambiarOcupado(true); cambiarError('')
    try { await accion() } catch (fallo) { cambiarError((fallo as Error).name === 'NotAllowedError' ? 'Se canceló la selección o no se concedió permiso al dispositivo.' : (fallo as Error).message) }
    finally { cambiarOcupado(false) }
  }
  const usarSala = () => { if (!sala.current) throw new Error('Espera a que la sala esté conectada.'); return sala.current }

  if (fin) return <PantallaFinSala motivo={fin} />
  if (reunion.isError) return <PantallaFinSala motivo="sinAcceso" />

  const enviarMensaje = (evento: FormEvent) => {
    evento.preventDefault()
    void ejecutar(async () => { await usarSala().enviarMensaje(textoMensaje); cambiarTextoMensaje('') })
  }
  const moderador = moderacion.moderador
  const sinConexion = clasificarParticipantes(inscritos.data ?? [], participantes)
  const colaManos = participantes.filter(persona => persona.turnoMano).sort((primera, segunda) => primera.turnoMano! - segunda.turnoMano!)
  const mano = !!participantes.find(persona => persona.local)?.manoLevantada
  const bloqueado = ocupado || !medios.conectada
  const manoActual = manoPermitida ?? politicasSala?.manoPermitida ?? true
  const manoOculta = politicasSala?.manoPermitida === false && !moderador
  const restringido = !moderador && mediosModerados.some(medio => !moderacion.permitidos[medio])
  const permisos: PermisosSala = { pantalla: !moderacion.restringidos.desktop, microfono: !moderacion.restringidos.audio, camara: !moderacion.restringidos.video, mano: manoActual }
  const cambiarPermiso = (permiso: keyof PermisosSala, activo: boolean) => void ejecutar(async () => {
    if (permiso === 'mano') {
      if (!reunion.data) return
      const { camaraPermitida, microfonoPermitido, pantallaPermitida, porcentajeMinimo, grabacionPrevista: grabacion } = reunion.data
      await reuniones.guardarPoliticas(identificador, { camaraPermitida, microfonoPermitido, pantallaPermitida, porcentajeMinimo, grabacionPrevista: grabacion, manoPermitida: activo })
      cambiarManoPermitida(activo)
      return
    }
    usarSala().configurarModeracion(({ pantalla: 'desktop', microfono: 'audio', camara: 'video' } as const)[permiso], !activo)
  })
  const admitirInscritos = () => ejecutar(() => {
    const vigentes = new Set((inscritos.data ?? []).filter(persona => persona.rol === 'participante' && persona.estado === 'autorizado').map(persona => String(persona.identificador)))
    usarSala().admitirInscritos(vigentes)
  })
  const expulsar = (motivo: string) => {
    const persona = porExpulsar
    if (!persona?.usuarioIdentificador) return
    void ejecutar(async () => {
      await revocar(persona.usuarioIdentificador!, motivo || undefined)
      usarSala().expulsar(persona.usuarioIdentificador!)
      cambiarAviso(`${persona.nombre} fue expulsado de la sesión.`)
      cambiarPorExpulsar(null)
    })
  }
  const finalizar = () => void ejecutar(async () => { await reuniones.cambiarEstado(identificador, 'finalizar'); navegar('/reuniones') })
  const abrirPanel = (valor: Pestana) => { cambiarPestana(valor); cambiarPanelVisible(!(panelVisible && pestana === valor)) }
  const conectados = inscritos.data ? `${participantes.length} conectados de ${inscritos.data.filter(persona => persona.rol === 'participante').length} inscritos` : `${participantes.length} conectados`

  return <main className="salaVentana bg-visor text-white">
    {!medios.conectada && <VestibuloSala reunion={reunion.data} nombre={usuario?.nombre ?? ''} moderador={!esColegiado} esperando={enEspera}
      conectando={habilitarMedios !== null && !enEspera} microfono={deseo.audio} camara={deseo.video}
      alMicrofono={() => cambiarDeseo(actual => ({ ...actual, audio: !actual.audio }))} alCamara={() => cambiarDeseo(actual => ({ ...actual, video: !actual.video }))}
      alEntrar={habilitarMedios === null ? pedirEntrada : undefined} />}
    {!medios.conectada && error && <div role="alert" className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-150 rounded-lg border border-danger bg-danger-soft p-4 text-sm text-danger">{error}</div>}
    <DialogoGrabacion abierto={preguntaGrabacion} alNoEntrar={() => cambiarPreguntaGrabacion(false)} alEntrar={() => { cambiarPreguntaGrabacion(false); entrar(true) }} />

    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <h1 className="truncate font-sans text-sm font-semibold sm:text-base">{reunion.data?.titulo ?? 'Sala virtual'}</h1>
        <p className="text-xs text-white/70">Sala virtual del CPPP · solo inscritos</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs">
        {grabacionPrevista && <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-strong/30 px-2.5 py-1 font-semibold text-danger-on-dark"><span className="size-2 rounded-full bg-danger-strong" aria-hidden />REC</span>}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1"><Users className="size-3.5" aria-hidden />{conectados}</span>
      </div>
    </header>
    {aviso && <div role="status" className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm text-ink">{aviso}<button onClick={() => cambiarAviso('')} aria-label="Cerrar aviso" className="text-muted">×</button></div>}
    {medios.conectada && error && <div role="alert" className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}<button onClick={() => cambiarError('')} aria-label="Cerrar aviso">×</button></div>}

    <div className="salaContenido gap-3 px-3 sm:px-4" data-panel-visible={panelVisible}>
      <section aria-label="Vídeos de la reunión" className="salaEscenario relative rounded-xl bg-white/5">
        <div ref={contenedor} className="salaMedios flex-1" />
        {!medios.camaraActiva && !medios.compartiendoPantalla && medios.conectada && <p className="my-3 text-center text-xs text-white/60">Tu cámara está apagada. Puedes participar con audio y chat.</p>}
        {medios.compartiendoPantalla && <p className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs"><MonitorUp className="size-3.5" aria-hidden />Estás compartiendo tu pantalla</p>}
      </section>

      <aside hidden={!panelVisible} aria-label="Panel de la sala" className="salaPanel rounded-xl bg-white text-ink max-lg:fixed max-lg:inset-x-2 max-lg:top-14 max-lg:bottom-24 max-lg:z-40 max-lg:shadow-2xl">
        <div className="m-3 flex rounded-lg bg-surface-3 p-1" role="tablist" aria-label="Panel de la sala">
          {([['participantes', `Participantes (${participantes.length})`], ['chat', 'Chat'], ['manos', `Manos (${colaManos.length})`]] as const).map(([valor, titulo]) =>
            <button key={valor} role="tab" id={`pestana-${valor}`} aria-selected={pestana === valor} aria-controls="panel-sala" onClick={() => cambiarPestana(valor)}
              className={cn('flex-1 rounded-md px-1.5 py-1.5 text-xs font-semibold whitespace-nowrap', pestana === valor ? 'bg-white text-ink shadow-sm' : 'text-muted')}>{titulo}</button>)}
        </div>
        <div role="tabpanel" id="panel-sala" aria-labelledby={`pestana-${pestana}`} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-3 pb-3">
          {pestana === 'participantes' && <>
            {moderador && solicitudes.length > 0 && <PanelSalaEspera solicitudes={solicitudes} inscritos={inscritos.data ?? []} ocupado={ocupado}
              alAdmitir={id => void ejecutar(() => usarSala().admitir(id))}
              alRechazar={id => void ejecutar(() => usarSala().rechazar(id))}
              alAdmitirInscritos={() => void admitirInscritos()} />}
            <h2 className="text-xs font-medium text-muted">En la sala</h2>
            {!participantes.length && <p className="text-sm text-muted">Esperando conexión…</p>}
            <ul className="flex flex-col">{participantes.map(persona => {
              const autorizadoAudio = !!moderacion.autorizaciones[persona.identificador]?.audio
              const opciones = moderador && !persona.local
              return <li key={persona.identificador} className="relative">
                <div className="flex items-center gap-2 rounded-lg px-1 py-2 hover:bg-page">
                  <Avatar nombre={persona.nombre} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm leading-5">{persona.nombre}{persona.local ? ' (tú)' : ''}</p>
                    <p className="text-xs leading-4 text-muted">{(persona.local ? moderador : persona.moderador) ? 'Instructor · Anfitrión' : 'Colegiado'}</p>
                  </div>
                  {persona.manoLevantada && <Hand className="size-4 text-gold-ink" aria-label={`Mano levantada${persona.turnoMano ? `, turno ${persona.turnoMano}` : ''}`} />}
                  {persona.microfonoActivo ? <Mic className="size-4 text-success" aria-label="Micrófono activo" /> : <MicOff className="size-4 text-muted" aria-label="Micrófono apagado" />}
                  {opciones && <button type="button" onClick={() => cambiarMenuPersona(menuPersona === persona.identificador ? null : persona.identificador)} aria-expanded={menuPersona === persona.identificador}
                    aria-label={`Opciones de ${persona.nombre}`} className="rounded p-1 text-muted hover:bg-surface-3"><MoreVertical className="size-4" /></button>}
                </div>
                {opciones && menuPersona === persona.identificador && <div role="menu" className="z-10 my-1 flex flex-col rounded-lg border border-line bg-white py-1 shadow-lg">
                  {persona.microfonoActivo && <button role="menuitem" disabled={ocupado} onClick={() => { cambiarMenuPersona(null); void ejecutar(() => usarSala().silenciar(persona.identificador)) }}
                    className="flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-page"><MicOff className="size-4" aria-hidden />Silenciar micrófono</button>}
                  {moderacion.restringidos.audio && <button role="menuitem" disabled={ocupado} onClick={() => { cambiarMenuPersona(null); void ejecutar(() => usarSala().autorizarParticipante('audio', persona.identificador, !autorizadoAudio)) }}
                    className="flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-page"><Mic className="size-4" aria-hidden />{autorizadoAudio ? 'Quitar la palabra' : 'Dar la palabra'}</button>}
                  {persona.usuarioIdentificador && !persona.moderador && <button role="menuitem" disabled={ocupado} onClick={() => { cambiarMenuPersona(null); cambiarPorExpulsar(persona) }}
                    className="flex items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"><UserX className="size-4" aria-hidden />Expulsar de la sesión</button>}
                </div>}
              </li>
            })}</ul>
            {puedeConsultarInscritos && sinConexion.length > 0 && <details className="border-t border-line pt-3 text-sm">
              <summary className="cursor-pointer text-xs font-medium text-muted">Inscritos sin conexión ({sinConexion.length})</summary>
              <ul className="mt-2 flex flex-col gap-1.5">{sinConexion.map(persona => <li key={persona.identificador} className="text-muted">{persona.nombre}</li>)}</ul>
            </details>}
          </>}
          {pestana === 'chat' && <>
            <div ref={contenedorChat} role="log" aria-live="polite" aria-label="Mensajes de la reunión" className="flex min-h-40 flex-1 flex-col gap-3 overflow-auto">
              {mensajes.length === 0 && <p className="text-sm text-muted">Aún no hay mensajes. El historial se limpia al salir.</p>}
              {mensajes.map(mensaje => <article key={mensaje.identificador} className="rounded-lg bg-page p-3">
                <div className="mb-1 flex justify-between gap-3 text-xs text-muted"><strong className="text-ink">{mensaje.nombre}</strong><time>{new Date(mensaje.hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</time></div>
                <p className="text-sm break-words whitespace-pre-wrap">{mensaje.texto}</p>
              </article>)}
            </div>
            <form onSubmit={enviarMensaje} className="flex flex-col gap-2">
              <label htmlFor="mensaje-sala" className="text-xs font-semibold">Mensaje para todos</label>
              <textarea id="mensaje-sala" value={textoMensaje} onChange={evento => cambiarTextoMensaje(evento.target.value)} maxLength={2000} rows={3} placeholder="Escribe un mensaje…"
                className="rounded-lg p-3 text-sm ring-1 ring-muted-3 ring-inset outline-none focus-visible:ring-2 focus-visible:ring-brand-light" />
              <Boton type="submit" disabled={bloqueado || !textoMensaje.trim()}>Enviar mensaje</Boton>
            </form>
          </>}
          {pestana === 'manos' && <>
            {colaManos.length === 0 && <p className="text-sm text-muted">Nadie ha levantado la mano.</p>}
            <ol className="flex flex-col gap-2">{colaManos.map(persona => {
              const autorizado = !!moderacion.autorizaciones[persona.identificador]?.audio
              return <li key={persona.identificador} className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-gold-soft text-xs font-bold text-gold-ink" aria-label={`Turno ${persona.turnoMano}`}>{persona.turnoMano}</span>
                <span className="flex-1 text-sm">{persona.nombre}{persona.local ? ' (tú)' : ''}</span>
                {moderador && !persona.local && moderacion.restringidos.audio && <button type="button" disabled={ocupado} onClick={() => void ejecutar(() => usarSala().autorizarParticipante('audio', persona.identificador, !autorizado))}
                  className="h-8 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-ink disabled:opacity-50">{autorizado ? 'Quitar la palabra' : 'Dar la palabra'}</button>}
              </li>
            })}</ol>
          </>}
        </div>
      </aside>
    </div>

    {restringido && <p role="status" className="mx-auto mt-2 flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-ink sm:text-sm">
      <Lock className="size-4 shrink-0 text-danger" aria-hidden />Solo el instructor puede compartir pantalla y activar micrófonos. Levanta la mano para pedir la palabra.
    </p>}
    <footer className="relative shrink-0 overflow-x-auto px-2 py-3">
      <div className="mx-auto flex w-max items-start gap-0.5 sm:gap-3">
      <BotonBarra etiqueta="Micrófono" activo={medios.microfonoActivo} presionado={medios.microfonoActivo} disabled={bloqueado || (!moderacion.permitidos.audio && !medios.microfonoActivo)}
        onClick={() => void ejecutar(() => usarSala().alternar('audio'))} icono={medios.microfonoActivo ? <Mic className="size-5" /> : <MicOff className="size-5" />} />
      <BotonBarra etiqueta="Cámara" activo={medios.camaraActiva} presionado={medios.camaraActiva} disabled={bloqueado || (!moderacion.permitidos.video && !medios.camaraActiva)}
        onClick={() => void ejecutar(() => usarSala().alternar('video'))} icono={medios.camaraActiva ? <Video className="size-5" /> : <VideoOff className="size-5" />} />
      <BotonBarra etiqueta={medios.compartiendoPantalla ? 'Dejar de compartir' : 'Compartir'} activo={medios.compartiendoPantalla} presionado={medios.compartiendoPantalla}
        disabled={bloqueado || (!moderacion.permitidos.desktop && !medios.compartiendoPantalla)} onClick={() => void ejecutar(() => usarSala().compartirPantalla())} icono={<MonitorUp className="size-5" />} />
      {moderador ? <>
        {grabacionPrevista && <BotonBarra etiqueta="Grabación anunciada" disabled className="max-sm:hidden" icono={<CircleDot className="size-5" />} />}
        <BotonBarra etiqueta="Silenciar a todos" disabled={bloqueado} onClick={() => void ejecutar(() => { const silenciados = usarSala().silenciarTodos(); cambiarAviso(silenciados ? `Se silenció a ${silenciados} ${silenciados === 1 ? 'persona' : 'personas'}.` : 'Nadie tenía el micrófono activo.') })} icono={<MicOff className="size-5" />} />
        <BotonBarra etiqueta="Permisos" activo={permisosAbiertos} presionado={permisosAbiertos} disabled={!medios.conectada} onClick={() => cambiarPermisosAbiertos(!permisosAbiertos)} icono={<SlidersHorizontal className="size-5 rotate-90" />} />
        <BotonBarra etiqueta="Participantes" activo={panelVisible && pestana === 'participantes'} presionado={panelVisible && pestana === 'participantes'} onClick={() => abrirPanel('participantes')} icono={<Users className="size-5" />} />
        <BotonBarra etiqueta="Chat" activo={panelVisible && pestana === 'chat'} presionado={panelVisible && pestana === 'chat'} onClick={() => abrirPanel('chat')} icono={<MessageSquare className="size-5" />} />
        <BotonBarra etiqueta="Finalizar sesión" peligro onClick={() => cambiarConfirmarFin(true)} icono={<LogOut className="size-5" />} />
      </> : <>
        {!manoOculta && <BotonBarra etiqueta={mano ? 'Bajar la mano' : 'Levantar la mano'} activo={mano} presionado={mano} disabled={bloqueado} onClick={() => void ejecutar(() => usarSala().levantarMano())} icono={<Hand className="size-5" />} />}
        <BotonBarra etiqueta="Chat" activo={panelVisible && pestana === 'chat'} presionado={panelVisible && pestana === 'chat'} onClick={() => abrirPanel('chat')} icono={<MessageSquare className="size-5" />} />
        <BotonBarra etiqueta="Salir" peligro onClick={() => navegar(-1)} icono={<LogOut className="size-5" />} />
      </>}
      </div>
    </footer>
    {estado && <p className="sr-only" role="status">{estado}</p>}
    {moderador && permisosAbiertos && <PanelPermisos valor={permisos} disponible={moderacion.disponible} ocupado={ocupado} alCambiar={cambiarPermiso} alCerrar={() => cambiarPermisosAbiertos(false)} />}

    <DialogoExpulsar key={porExpulsar?.identificador ?? 'nadie'} nombre={porExpulsar?.nombre ?? null} ocupado={ocupado} alCancelar={() => cambiarPorExpulsar(null)} alExpulsar={expulsar} />
    <Dialogo abierto={confirmarFin} onCerrar={() => cambiarConfirmarFin(false)} titulo="¿Finalizar la sesión?" acciones={<>
      <button type="button" onClick={() => cambiarConfirmarFin(false)} className="h-10 rounded-lg px-5 text-sm font-semibold text-brand hover:bg-brand-soft">Seguir en la sala</button>
      <Boton variante="peligro" cargando={ocupado} onClick={finalizar}>Finalizar sesión</Boton>
    </>}>
      <p className="text-sm text-ink">Se cerrará la sala para todos y se calculará la asistencia virtual con el tiempo conectado de cada colegiado.</p>
    </Dialogo>
  </main>
}
