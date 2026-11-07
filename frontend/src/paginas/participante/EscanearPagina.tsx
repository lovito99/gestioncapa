import { Clock, X } from 'lucide-react'
import QrScanner from 'qr-scanner'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fechaCorta, rangoHorario } from '@/lib/formato'
import { useClasesParticipante, useMarcarAsistencia } from '@/servicios/participante'
import { AsistenciaRechazada, AsistenciaRegistrada, Enviando, ErrorCamara } from './ResultadoAsistencia'

/** El QR contiene la URL `/asistencia/marcar?token=…`; aceptamos también el token suelto. */
function extraerToken(texto: string) {
  try {
    return new URL(texto).searchParams.get('token') ?? texto
  } catch {
    return texto
  }
}

/** Traduce los errores de cámara del navegador a mensajes accionables en español. */
function mensajeCamara(error: unknown) {
  if (!window.isSecureContext) {
    return 'La cámara solo funciona en una conexión segura (https). Abre la aplicación desde la dirección https que te dio el equipo.'
  }
  const nombre = error instanceof DOMException ? error.name : String(error)
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
    return 'Para escanear el QR, permite el uso de la cámara en tu navegador y vuelve a intentarlo.'
  }
  if (nombre === 'NotReadableError') {
    return 'Otra aplicación está usando la cámara. Ciérrala y vuelve a intentar.'
  }
  if (/camera not found|NotFoundError|OverconstrainedError/i.test(nombre)) {
    return 'No encontramos una cámara en este dispositivo. Usa un celular con cámara.'
  }
  return 'No pudimos abrir la cámara. Vuelve a intentar.'
}

type Estado = { tipo: 'iniciando' } | { tipo: 'escaneando' } | { tipo: 'error-camara'; mensaje: string }

export function EscanearPagina() {
  const { id: claseId = '' } = useParams()
  const video = useRef<HTMLVideoElement>(null)
  const escaner = useRef<QrScanner | null>(null)
  const leido = useRef(false)
  const [estado, setEstado] = useState<Estado>({ tipo: 'iniciando' })
  const [intento, setIntento] = useState(0)
  const marcar = useMarcarAsistencia()
  const { data: clases } = useClasesParticipante()
  // `mutate` es estable entre renders; el objeto `marcar` no
  const { mutate } = marcar
  const esperandoLectura = marcar.isIdle

  const alLeer = useCallback(
    (resultado: QrScanner.ScanResult) => {
      // La librería sigue leyendo cuadros: solo enviamos la primera lectura
      if (leido.current) return
      leido.current = true
      escaner.current?.stop()
      mutate({ token: extraerToken(resultado.data), claseId: claseId || undefined })
    },
    [claseId, mutate],
  )

  useEffect(() => {
    if (!video.current || !esperandoLectura) return
    leido.current = false
    const instancia = new QrScanner(video.current, alLeer, {
      preferredCamera: 'environment',
      highlightScanRegion: false,
      highlightCodeOutline: true,
      returnDetailedScanResult: true,
    })
    let cancelada = false
    escaner.current = instancia
    const elementoVideo = video.current
    // Abrir directamente conserva el error original: qr-scanner transforma
    // algunos rechazos de permiso en «Camera not found».
    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not found')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } })
      if (cancelada) { stream.getTracks().forEach(pista => pista.stop()); return }
      elementoVideo.srcObject = stream
      await instancia.start()
    })()
      .then(() => { if (!cancelada) setEstado({ tipo: 'escaneando' }) })
      .catch((error: unknown) => { if (!cancelada) setEstado({ tipo: 'error-camara', mensaje: mensajeCamara(error) }) })

    return () => {
      cancelada = true
      instancia.destroy()
      escaner.current = null
    }
    // `intento` reinicia la cámara al pulsar "Escanear de nuevo"
  }, [intento, alLeer, esperandoLectura])

  const reintentar = () => {
    marcar.reset()
    setEstado({ tipo: 'iniciando' })
    setIntento((n) => n + 1)
  }

  const clase = clases?.find((c) => c.id === claseId)
  if (marcar.isPending) return <Enviando />
  if (marcar.isSuccess) return <AsistenciaRegistrada resultado={marcar.data} />
  if (marcar.isError) return <AsistenciaRechazada error={marcar.error} onReintentar={reintentar} nombreClase={clase?.nombre} />
  if (estado.tipo === 'error-camara') return <ErrorCamara mensaje={estado.mensaje} onReintentar={reintentar} />

  return (
    <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col bg-black">
      {/* 3.3: la vista de la cámara ocupa la pantalla; el recuadro marca la zona de lectura */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} className="absolute inset-0 size-full object-cover" muted playsInline aria-label="Vista de la cámara" />
        <div className="absolute inset-x-0 top-0 flex h-14 items-center justify-center bg-gradient-to-b from-black/60 to-transparent px-4">
          <Link
            to={claseId ? `/participante/clases/${claseId}` : '/participante/clases'}
            aria-label="Cerrar el escáner"
            className="absolute left-3 flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <X className="size-6" aria-hidden />
          </Link>
          <h1 className="font-sans text-base font-semibold text-white">Escanear QR</h1>
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
          <div className="relative aspect-square w-[min(66vw,16rem)]" aria-hidden>
            {['top-0 left-0 border-t-4 border-l-4 rounded-tl-lg', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg'].map((esquina) => (
              <span key={esquina} className={`absolute size-10 border-white ${esquina}`} />
            ))}
          </div>
          <p role="status" className="max-w-64 text-center text-base leading-6 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
            {estado.tipo === 'iniciando'
              ? 'Abriendo la cámara… Si el navegador te pide permiso, tócalo en «Permitir».'
              : 'Apunta la cámara al código QR que muestra el instructor'}
          </p>
        </div>
      </div>
      <div className="bg-white px-4 py-4 wrap-anywhere">
        <div className="mx-auto max-w-160">
          {clase ? (
            <>
              <p className="text-xs text-muted">Registrando asistencia en</p>
              <p className="text-base font-semibold text-ink">{clase.nombre}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <Clock className="size-4 shrink-0" aria-hidden />
                {fechaCorta(clase.fecha)} · {rangoHorario(clase.horaInicio, clase.horaFin)} · {clase.lugar}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Escanea el QR de tu clase: la asistencia se registra sola.</p>
          )}
        </div>
      </div>
    </div>
  )
}
