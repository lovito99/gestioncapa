import { CameraOff } from 'lucide-react'
import QrScanner from 'qr-scanner'
import { useEffect, useRef, useState } from 'react'
import { Boton } from '@/components/ui/Boton'
import { mensajeCamara } from '@/lib/camara'

interface Props {
  /** Se llama una vez por lectura; luego se ignoran lecturas hasta que `pausado` pase de true a false */
  onLeer: (texto: string) => void
  pausado: boolean
}

type Estado = { tipo: 'iniciando' } | { tipo: 'escaneando' } | { tipo: 'error'; mensaje: string }

/** «Visor de cámara» del Figma S3 1.4: lee un QR y espera a que termine el registro para leer otro. */
export function LectorQr({ onLeer, pausado }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  // Bloquea lecturas desde que se lee un QR hasta que el padre termina su pausa
  const bloqueado = useRef(false)
  const alLeer = useRef(onLeer)
  const [estado, setEstado] = useState<Estado>({ tipo: 'iniciando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    alLeer.current = onLeer
  }, [onLeer])

  useEffect(() => {
    bloqueado.current = pausado
  }, [pausado])

  // La cámara queda encendida entre lecturas: así no parpadea y lee al instante al reanudar
  useEffect(() => {
    if (!video.current) return
    const elementoVideo = video.current
    const instancia = new QrScanner(
      elementoVideo,
      (resultado) => {
        // La librería lee muchos cuadros por segundo: solo pasa la primera lectura
        if (bloqueado.current) return
        bloqueado.current = true
        alLeer.current(resultado.data)
      },
      { preferredCamera: 'environment', highlightScanRegion: false, highlightCodeOutline: true, returnDetailedScanResult: true },
    )
    let cancelada = false
    let stream: MediaStream | undefined
    // Igual que en EscanearPagina: abrir la cámara directamente conserva el error original
    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not found')
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } })
      if (cancelada) { stream.getTracks().forEach((pista) => pista.stop()); return }
      elementoVideo.srcObject = stream
      await instancia.start()
    })()
      .then(() => { if (!cancelada) setEstado({ tipo: 'escaneando' }) })
      .catch((error: unknown) => {
        if (cancelada) return
        instancia.stop()
        stream?.getTracks().forEach((pista) => pista.stop())
        setEstado({ tipo: 'error', mensaje: mensajeCamara(error) })
      })

    return () => {
      cancelada = true
      instancia.destroy()
      stream?.getTracks().forEach((pista) => pista.stop())
    }
  }, [intento])

  if (estado.tipo === 'error') {
    return (
      <div role="alert" className="flex h-75 w-full flex-col items-center justify-center gap-3 rounded-xl bg-visor p-4 text-center">
        <CameraOff className="size-8 text-gold" aria-hidden />
        <p className="text-sm leading-5 text-white">{estado.mensaje}</p>
        <p className="text-xs leading-4 text-white/70">Mientras tanto, puedes buscar al colegiado por DNI.</p>
        <Boton
          variante="secundario"
          onClick={() => {
            setEstado({ tipo: 'iniciando' })
            setIntento((n) => n + 1)
          }}
        >
          Reintentar
        </Boton>
      </div>
    )
  }

  return (
    <div className="relative flex h-75 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-visor p-4">
      <video ref={video} className="absolute inset-0 size-full object-cover opacity-60" muted playsInline aria-label="Vista de la cámara" />
      <div className="relative size-47.5 rounded-2xl border-3 border-gold" aria-hidden />
      <p role="status" className="relative text-center text-sm leading-5 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
        {estado.tipo === 'iniciando' ? 'Abriendo la cámara…' : 'Apunta la cámara al QR del colegiado'}
      </p>
    </div>
  )
}
