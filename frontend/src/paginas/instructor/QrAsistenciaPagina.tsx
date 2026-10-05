import { ArrowLeft, Calendar, Clock, MapPin, Timer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BotonCerrarSesion } from '@/components/layout/Encabezado'
import { LogoRecuadro } from '@/components/layout/Logo'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { fechaCorta, rangoHorario } from '@/lib/formato'
import { useClase, useQrAsistencia } from '@/servicios/clases'

/** Segundos que faltan para que venza el QR, usando la hora del servidor. */
function useSegundosRestantes(expiraEn?: string, servidorAhora?: string, recibidoEn?: number) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  if (!expiraEn || !servidorAhora || !recibidoEn) return 0
  const desfase = Date.parse(servidorAhora) - recibidoEn
  return Math.max(0, (Date.parse(expiraEn) - (ahora + desfase)) / 1000)
}

export function QrAsistenciaPagina() {
  const { id = '' } = useParams()
  const clase = useClase(id)
  const qr = useQrAsistencia(id)
  const restantes = useSegundosRestantes(qr.data?.expiraEn, qr.data?.servidorAhora, qr.dataUpdatedAt)
  const duracion = qr.data?.duracionSegundos ?? 30
  const urlMarcado = qr.data
    ? `${window.location.origin}/asistencia/marcar?token=${encodeURIComponent(qr.data.token)}`
    : ''

  return (
    <div className="min-h-dvh bg-page">
      <header className="border-b border-line-2/40 bg-white">
        <div className="mx-auto grid h-16 max-w-[1280px] grid-cols-3 items-center px-4 sm:px-6">
          <Link
            to="/instructor/clases"
            className="flex items-center gap-1 justify-self-start text-[13px] font-medium text-muted-3 hover:text-ink"
          >
            <ArrowLeft className="size-[13px]" aria-hidden />
            Mis clases
          </Link>
          <div className="flex items-center gap-2 justify-self-center">
            <LogoRecuadro tamano={32} />
            <span className="hidden text-base font-semibold tracking-[-0.4px] text-brand-ink sm:inline">
              GestionCapa
            </span>
          </div>
          <BotonCerrarSesion className="justify-self-end text-[13px] font-medium text-muted-3" />
        </div>
      </header>

      <main className="mx-auto flex max-w-[896px] flex-col items-center px-4 py-10 sm:px-6 sm:py-16">
        {clase.isPending ? (
          <Cargando />
        ) : clase.isError ? (
          <ErrorCarga mensaje="No pudimos cargar la clase." onReintentar={clase.refetch} />
        ) : (
          <>
            <h1 className="text-center text-2xl leading-10 font-bold tracking-[-0.8px] text-ink-2 sm:text-[32px]">
              {clase.data.nombre}
            </h1>
            <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-base text-muted-2">
              <li className="flex items-center gap-1">
                <Calendar className="size-4 text-brand" aria-hidden />
                {fechaCorta(clase.data.fecha)}
              </li>
              <li aria-hidden className="font-bold text-line-2">•</li>
              <li className="flex items-center gap-1">
                <Clock className="size-4 text-brand" aria-hidden />
                {rangoHorario(clase.data.horaInicio, clase.data.horaFin)}
              </li>
              <li aria-hidden className="font-bold text-line-2">•</li>
              <li className="flex items-center gap-1">
                <MapPin className="size-4 text-brand" aria-hidden />
                {clase.data.lugar}
              </li>
            </ul>

            <section
              aria-label="Código QR de asistencia"
              className="mt-8 flex w-full max-w-[460px] flex-col items-center rounded-xl bg-white px-6 py-8 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:px-[50px]"
            >
              <div className="w-full max-w-[360px] rounded-lg bg-white p-2">
                {qr.isError ? (
                  <ErrorCarga mensaje="No pudimos generar el código QR." onReintentar={qr.refetch} />
                ) : qr.data ? (
                  <QRCodeSVG
                    value={urlMarcado}
                    size={360}
                    level="M"
                    marginSize={0}
                    className="h-auto w-full"
                    title="Código QR de asistencia"
                  />
                ) : (
                  <div className="aspect-square w-full animate-pulse rounded bg-surface-3" />
                )}
              </div>

              <div
                className="mt-6 h-2 w-full max-w-[360px] overflow-hidden rounded-full bg-line-lavender"
                role="progressbar"
                aria-label="Tiempo restante del código"
                aria-valuemin={0}
                aria-valuemax={duracion}
                aria-valuenow={Math.ceil(restantes)}
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-200 ease-linear"
                  style={{ width: `${(restantes / duracion) * 100}%` }}
                />
              </div>
              <p className="mt-4 flex items-center gap-1 text-[13px] font-medium text-muted-2" aria-live="off">
                <Timer className="size-[15px] text-brand-ink" aria-hidden />
                El código se renueva en{' '}
                <span className="text-base font-semibold tracking-[-0.08px] text-brand-ink">
                  {Math.ceil(restantes)}
                </span>{' '}
                s
              </p>
            </section>

            <p className="mt-8 text-center text-lg leading-7 font-semibold tracking-[-0.5px] text-ink-2 sm:text-xl">
              Escanea este código con tu celular para registrar tu asistencia
            </p>
          </>
        )}
      </main>
    </div>
  )
}
