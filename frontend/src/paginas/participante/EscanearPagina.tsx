import { CameraOff } from 'lucide-react'
import QrScanner from 'qr-scanner'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { useMarcarAsistencia } from '@/servicios/participante'
import { AsistenciaRechazada, AsistenciaRegistrada, Enviando } from './ResultadoAsistencia'

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
    return 'No diste permiso para usar la cámara. Toca el ícono de candado o de cámara en la barra del navegador, permite el acceso y vuelve a intentar.'
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
      highlightScanRegion: true,
      highlightCodeOutline: true,
      returnDetailedScanResult: true,
    })
    escaner.current = instancia
    instancia
      .start()
      .then(() => setEstado({ tipo: 'escaneando' }))
      .catch((error: unknown) => setEstado({ tipo: 'error-camara', mensaje: mensajeCamara(error) }))

    return () => {
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

  return (
    <div className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-120 flex-col gap-4">
        <EnlaceVolver to="/participante/clases">Mis clases</EnlaceVolver>

        {marcar.isPending && <Enviando />}
        {marcar.isSuccess && <AsistenciaRegistrada resultado={marcar.data} />}
        {marcar.isError && <AsistenciaRechazada error={marcar.error} onReintentar={reintentar} />}

        {esperandoLectura && (
          <>
            <header>
              <h1 className="text-xl leading-7 font-semibold text-ink">Escanea el QR de la clase</h1>
              <p className="mt-1 text-sm text-muted">
                Apunta la cámara al código que muestra tu instructor. Se registrará solo.
              </p>
            </header>

            {estado.tipo === 'error-camara' ? (
              <section
                role="alert"
                className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white px-5 py-8 text-center"
              >
                <CameraOff className="size-12 text-danger" aria-hidden />
                <h2 className="text-lg font-semibold text-ink">No pudimos usar la cámara</h2>
                <p className="text-sm leading-5 text-muted">{estado.mensaje}</p>
                <Boton onClick={reintentar} className="mt-2 h-12 w-full text-base">
                  Intentar de nuevo
                </Boton>
                <Link to="/participante/clases" className="text-sm font-semibold text-brand hover:underline">
                  Volver a mis clases
                </Link>
              </section>
            ) : (
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-ink">
                <video ref={video} className="size-full object-cover" muted playsInline aria-label="Vista de la cámara" />
                {estado.tipo === 'iniciando' && (
                  <p role="status" className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white">
                    Abriendo la cámara… Si el navegador te pide permiso, tócalo en «Permitir».
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
