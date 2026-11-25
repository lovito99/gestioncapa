import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { esApiError, mensajeDeError } from '@/lib/api'
import { avance, type ProgresoContenido, type ReporteContenido } from '@/servicios/avance'
import { avanceObservado, posicionPermitida, validarDuracion } from './reproduccion'

type Muestra = { posicion: number; instante: number }
const enPrimerPlano = () => document.visibilityState === 'visible' && document.hasFocus()
const periodoGuardadoMs = 4000
const renovarSesionMs = 25000

function tiempo(ms: number) {
  const segundos = Math.floor(ms / 1000)
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
}

export type ControlVideo = { cerrar: () => Promise<void> }

export function VideoMedido({ ref, cursoId, unidadId, titulo, fuente, duracionMs, inicial, alGuardar }: {
  ref?: Ref<ControlVideo>
  cursoId: string
  unidadId: string
  titulo: string
  fuente: string
  duracionMs: number
  inicial: ProgresoContenido
  alGuardar: (resultado: ProgresoContenido) => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const barra = useId()
  const mensajeBarra = useId()
  const registro = useRef({
    sesionId: '',
    secuencia: 1,
    confirmado: inicial,
    observado: inicial.vistoMs,
    posicion: inicial.posicionMs,
    previa: null as Muestra | null,
    pendiente: null as ReporteContenido | null,
    envio: null as Promise<void> | null,
    ultimoGuardado: 0,
    terminarEnvio: false,
    iniciando: false,
    vigente: true,
  })
  const [listo, indicarListo] = useState(false)
  const [reproduciendo, indicarReproduccion] = useState(false)
  const [ocupado, indicarOcupado] = useState(false)
  const [posicion, mostrarPosicion] = useState(inicial.posicionMs)
  const [visto, mostrarVisto] = useState(inicial.vistoMs)
  const [mensaje, mostrarMensaje] = useState('')
  const [errorFuente, informarErrorFuente] = useState('')
  const [errorEnvio, informarErrorEnvio] = useState('')
  const [silencio, cambiarSilencio] = useState(false)

  function actualizarPosicion(ms: number) {
    registro.current.posicion = ms
    if (registro.current.vigente) mostrarPosicion(ms)
  }

  function detenerObservacion() {
    registro.current.previa = null
  }

  function guardar(forzar = false) {
    const estado = registro.current
    if (!estado.sesionId || estado.iniciando) return Promise.resolve()
    if (forzar) estado.terminarEnvio = true
    if (!estado.envio && !forzar && !estado.pendiente &&
      performance.now() - estado.ultimoGuardado < periodoGuardadoMs) return Promise.resolve()
    estado.envio ??= Promise.resolve().then(enviar).finally(() => { estado.envio = null })
    return estado.envio
  }

  async function enviar() {
    const estado = registro.current
    try {
      do {
        const forzado = estado.terminarEnvio
        estado.terminarEnvio = false
        const desdeMs = estado.confirmado.vistoMs
        const hastaMs = Math.min(estado.observado, desdeMs + 10000)
        const posicionMs = Math.min(estado.posicion, hastaMs)
        const sinCambios = hastaMs === desdeMs && posicionMs === estado.confirmado.posicionMs
        const reciente = performance.now() - estado.ultimoGuardado < periodoGuardadoMs
        if (!estado.pendiente && (forzado ? sinCambios : reciente)) return
        estado.pendiente ??= { sesionId: estado.sesionId, secuencia: estado.secuencia, desdeMs, hastaMs, posicionMs }
        const anterior = estado.confirmado
        estado.confirmado = await avance.guardar(cursoId, unidadId, estado.pendiente)
        estado.ultimoGuardado = performance.now()
        estado.secuencia++
        estado.pendiente = null
        if (estado.vigente) informarErrorEnvio('')
        if (anterior.vistoMs !== estado.confirmado.vistoMs || anterior.posicionMs !== estado.confirmado.posicionMs ||
          anterior.completadaEn !== estado.confirmado.completadaEn) alGuardar(estado.confirmado)
        if (forzado && (estado.observado > estado.confirmado.vistoMs ||
          estado.posicion !== estado.confirmado.posicionMs)) estado.terminarEnvio = true
      } while (estado.terminarEnvio)
    } catch (error) {
      detenerObservacion()
      if (esApiError(error) && error.status === 409) {
        estado.sesionId = ''
        estado.pendiente = null
        estado.observado = estado.confirmado.vistoMs
        actualizarPosicion(estado.confirmado.posicionMs)
        if (estado.vigente) mostrarVisto(estado.observado)
      }
      if (estado.vigente) informarErrorEnvio(mensajeDeError(error, 'No se pudo guardar la posición.'))
      video.current?.pause()
    }
  }

  async function abrirSesion() {
    const estado = registro.current
    if (estado.sesionId && (estado.envio || performance.now() - estado.ultimoGuardado < renovarSesionMs)) return true
    if (estado.iniciando) return false
    estado.iniciando = true
    indicarOcupado(true)
    try {
      const sesion = await avance.reproducir(cursoId, unidadId)
      if (!estado.vigente || !video.current) return false
      if (sesion.duracionMs !== duracionMs) {
        informarErrorFuente('La duración registrada cambió. Vuelve a abrir esta lección.')
        return false
      }
      estado.sesionId = sesion.sesionId
      estado.secuencia = 1
      estado.ultimoGuardado = performance.now()
      estado.confirmado = sesion
      estado.observado = sesion.vistoMs
      mostrarVisto(sesion.vistoMs)
      actualizarPosicion(sesion.posicionMs)
      informarErrorEnvio('')
      return restaurar(video.current, sesion.posicionMs)
    } catch (error) {
      if (estado.vigente) informarErrorEnvio(mensajeDeError(error, 'No se pudo iniciar la reproducción.'))
      return false
    } finally {
      estado.iniciando = false
      if (estado.vigente) indicarOcupado(false)
    }
  }

  function restaurar(elemento: HTMLVideoElement, ms: number, avisar = true) {
    const segundos = Math.min(ms / 1000, elemento.duration)
    if (Math.abs(elemento.currentTime - segundos) < 0.001) return true
    for (let indice = 0; indice < elemento.seekable.length; indice++) {
      if (segundos < elemento.seekable.start(indice) || segundos > elemento.seekable.end(indice)) continue
      elemento.currentTime = segundos
      return true
    }
    if (avisar) informarErrorFuente('Este video no admite reanudar o repasar desde la posición guardada.')
    return false
  }

  function validarMedio(reanudar: boolean, avisar = true) {
    const elemento = video.current
    if (!elemento || elemento.readyState < HTMLMediaElement.HAVE_METADATA) return
    if (!validarDuracion(elemento.duration, duracionMs)) {
      informarErrorFuente('La duración del video no coincide con la registrada. Avisa al instructor.')
      elemento.pause()
      return
    }
    if (reanudar && !listo && restaurar(elemento, registro.current.posicion, avisar)) {
      informarErrorFuente('')
      indicarListo(true)
    }
  }

  async function alternar() {
    const elemento = video.current
    if (!elemento) return
    if (!elemento.paused) {
      elemento.pause()
      return
    }
    if (registro.current.pendiente) {
      await guardar(true)
      if (registro.current.pendiente) return
    }
    if (!await abrirSesion() || !enPrimerPlano() || !registro.current.vigente) return
    if (elemento.ended && restaurar(elemento, 0)) actualizarPosicion(0)
    if (!restaurar(elemento, registro.current.posicion)) return
    mostrarMensaje('')
    informarErrorEnvio('')
    try {
      await elemento.play()
    } catch {
      if (enPrimerPlano() && registro.current.vigente) mostrarMensaje('Vuelve a pulsar Reproducir para iniciar el video.')
    }
  }

  async function irA(ms: number) {
    const estado = registro.current
    if (!posicionPermitida(ms, estado.observado)) {
      mostrarMensaje('Puedes desplazarte dentro del tramo ya visto.')
      return
    }
    if (!await abrirSesion() || !video.current || !posicionPermitida(ms, estado.observado)) return
    if (!restaurar(video.current, ms)) return
    detenerObservacion()
    mostrarMensaje('')
    actualizarPosicion(ms)
    void guardar(true)
  }

  function posicionActual(elemento: HTMLVideoElement) {
    if (elemento.ended && elemento.duration * 1000 >= duracionMs) return duracionMs
    return Math.min(duracionMs, Math.floor(elemento.currentTime * 1000))
  }

  function iniciarObservacion() {
    const elemento = video.current
    const estado = registro.current
    if (!elemento || elemento.paused || elemento.seeking || elemento.playbackRate !== 1 ||
      !enPrimerPlano() || !estado.sesionId || (estado.pendiente && !estado.envio)) return
    const ms = posicionActual(elemento)
    if (!posicionPermitida(ms, estado.observado)) {
      restaurar(elemento, estado.posicion)
      return
    }
    estado.previa = { posicion: ms, instante: performance.now() }
  }

  function observar() {
    const elemento = video.current
    const estado = registro.current
    if (!elemento || !estado.previa || elemento.seeking || elemento.playbackRate !== 1 || !enPrimerPlano()) return
    const muestra = { posicion: posicionActual(elemento), instante: performance.now() }
    const nuevo = avanceObservado(estado.observado, estado.previa, muestra)
    if (nuevo === null) {
      detenerObservacion()
      elemento.pause()
      restaurar(elemento, estado.posicion)
      return
    }
    estado.previa = muestra
    estado.observado = nuevo
    mostrarVisto(nuevo)
    actualizarPosicion(muestra.posicion)
    void guardar()
  }

  function buscar() {
    detenerObservacion()
    const elemento = video.current
    const estado = registro.current
    if (!elemento || posicionPermitida(posicionActual(elemento), estado.observado)) return
    restaurar(elemento, estado.posicion)
    mostrarMensaje('Puedes desplazarte dentro del tramo ya visto.')
  }

  function pausar() {
    observar()
    detenerObservacion()
    indicarReproduccion(false)
    if (!registro.current.pendiente || registro.current.envio) void guardar(true)
  }

  async function cerrar() {
    observar()
    detenerObservacion()
    video.current?.pause()
    await guardar(true)
  }

  useImperativeHandle(ref, () => ({ cerrar }))

  const alSalir = useRef(() => {})
  useEffect(() => {
    alSalir.current = () => {
      detenerObservacion()
      video.current?.pause()
      void guardar(true)
    }
  })

  useEffect(() => {
    const estado = registro.current
    const elemento = video.current
    estado.vigente = true
    const suspender = () => alSalir.current()
    const visibilidad = () => { if (!enPrimerPlano()) suspender() }
    window.addEventListener('blur', suspender)
    window.addEventListener('pagehide', suspender)
    document.addEventListener('visibilitychange', visibilidad)
    return () => {
      estado.vigente = false
      suspender()
      elemento?.pause()
      window.removeEventListener('blur', suspender)
      window.removeEventListener('pagehide', suspender)
      document.removeEventListener('visibilitychange', visibilidad)
    }
  }, [])

  return <div className="space-y-3">
    <video ref={video} src={fuente} className="aspect-video w-full rounded-lg bg-ink" aria-label={titulo}
      playsInline preload="metadata" disablePictureInPicture disableRemotePlayback muted={silencio}
      onLoadedMetadata={() => validarMedio(true, false)} onCanPlay={() => validarMedio(true)}
      onDurationChange={() => validarMedio(false)}
      onError={() => informarErrorFuente('No se pudo cargar el video. Avisa al instructor.')}
      onPlay={() => {
        if (!enPrimerPlano() || !registro.current.sesionId) video.current?.pause()
        else indicarReproduccion(true)
      }}
      onPlaying={iniciarObservacion} onSeeked={iniciarObservacion} onSeeking={buscar}
      onWaiting={detenerObservacion} onTimeUpdate={observar} onPause={pausar} onEnded={pausar}
      onRateChange={evento => {
        const elemento = evento.currentTarget
        if (elemento.playbackRate === 1) iniciarObservacion()
        else {
          detenerObservacion()
          elemento.playbackRate = 1
        }
      }} />
    {errorFuente ? <Aviso tipo="error" titulo="Video sin medición">{errorFuente}</Aviso> : <>
      <div className="flex flex-wrap items-center gap-2">
        <Boton variante="secundario" disabled={!listo} cargando={ocupado} onClick={() => void alternar()}>
          {reproduciendo ? 'Pausar' : 'Reproducir'}
        </Boton>
        <Boton variante="secundario" onClick={() => cambiarSilencio(!silencio)}>
          {silencio ? 'Activar sonido' : 'Silenciar'}
        </Boton>
        <span className="text-sm tabular-nums text-muted">{tiempo(posicion)} / {tiempo(duracionMs)}</span>
      </div>
      <div>
        <label htmlFor={barra} className="text-sm font-semibold text-ink">Posición del video</label>
        <input id={barra} type="range" className="block w-full accent-brand" min={0} max={duracionMs} step={1}
          aria-valuetext={tiempo(posicion)} aria-describedby={mensajeBarra} value={posicion} disabled={!listo || ocupado}
          onChange={evento => void irA(Number(evento.currentTarget.value))}
          onKeyDown={evento => {
            const salto = evento.key === 'ArrowLeft' || evento.key === 'ArrowDown' ? -5000 :
              evento.key === 'ArrowRight' || evento.key === 'ArrowUp' ? 5000 : null
            if (salto === null) return
            evento.preventDefault()
            void irA(Math.max(0, Math.min(registro.current.observado, registro.current.posicion + salto)))
          }} />
        <p id={mensajeBarra} className="text-sm text-muted">Visto hasta {tiempo(visto)}. Puedes repasar ese tramo.</p>
      </div>
      <p role="status" className="text-sm text-muted">{mensaje}</p>
      {errorEnvio && <Aviso tipo="error" titulo="Hubo un problema con el avance">
        <p>{errorEnvio} Pulsa Reproducir para volver a intentarlo.</p>
      </Aviso>}
    </>}
  </div>
}
