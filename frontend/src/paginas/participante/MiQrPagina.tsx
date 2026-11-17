import { Calendar, CircleCheck, Clock, Download, MapPin, Printer, type LucideIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { fechaConAnio, hora12 } from '@/lib/formato'
import { AvisoInfo } from '@/components/ui/Aviso'
import { descargarMiQr, useMiQr } from '@/servicios/asistenciaPuerta'
import { guardarDescarga } from '@/servicios/historial'
import type { SesionPresencialResumen } from '@/types/api'

const tarjeta = 'w-full rounded-xl border border-line bg-white'

const PASOS = [
  'Llega a la puerta del aula y abre esta pantalla.',
  'Sube el brillo de tu celular para que se lea mejor.',
  'El encargado escanea tu código y verás tu asistencia en «Mis cursos».',
]

/**
 * S3 1.1 · «Mi QR» del agremiado (HU-39): QR personal y permanente que el encargado escanea en
 * la puerta. Se puede mostrar en el celular, descargar en PDF o imprimir. Diseñada para 360 px.
 */
export function MiQrPagina() {
  const { data, isPending, isError, error, refetch } = useMiQr()
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState('')

  const descargar = async () => {
    setDescargando(true)
    setErrorDescarga('')
    try {
      guardarDescarga(await descargarMiQr(), 'mi-qr-cppp.pdf')
    } catch (e) {
      setErrorDescarga(mensajeDeError(e, 'No pudimos descargar el PDF. Intenta de nuevo.'))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="px-4 pt-4 pb-8 sm:px-10 sm:pt-8 print:p-0">
      <div className="mx-auto flex w-full max-w-160 flex-col gap-4 md:max-w-200">
        <div className="print:hidden">
          <EnlaceVolver to="/participante/cursos">Volver a mis cursos</EnlaceVolver>
        </div>
        <header className="flex flex-col gap-1 print:hidden">
          <h1 className="font-serif text-xl leading-7 font-bold text-ink">Mi QR de asistencia</h1>
          <p className="text-sm text-muted">Muéstralo al encargado en la puerta del aula. Es el mismo para todos tus cursos.</p>
        </header>

        {isPending ? (
          <Cargando texto="Cargando tu QR…" />
        ) : isError ? (
          <ErrorCarga mensaje={mensajeDeError(error, 'No pudimos cargar tu QR.')} onReintentar={refetch} />
        ) : (
          <div className="grid gap-6 md:grid-cols-[22.5rem_1fr] md:items-start">
            <section aria-label="Tu código QR personal" className={`${tarjeta} flex flex-col items-center gap-4 p-6 print:border-0`}>
              <div className="flex flex-col items-center gap-0.5 text-center">
                <p className="text-base leading-6 font-semibold wrap-anywhere text-ink">{data.nombre}</p>
                {data.dniParcial && <p className="text-sm text-muted">DNI {data.dniParcial}</p>}
              </div>
              <div className="rounded-xl border-2 border-brand bg-white p-3">
                <QRCodeSVG value={data.token} size={232} level="M" marginSize={0} className="size-58" title={`Código QR personal de ${data.nombre}`} />
              </div>
              {data.habilitado && (
                <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-0.5 text-xs leading-4 font-medium text-success">
                  <CircleCheck className="size-3" aria-hidden />
                  Colegiado(a) habilitado(a)
                </span>
              )}
              <p className="text-center text-xs leading-4 text-muted">
                Este código es personal. No lo compartas: con él se registra tu asistencia.
              </p>
              <div className="flex w-full flex-col gap-3 print:hidden">
                <Boton onClick={descargar} cargando={descargando} className="h-12 w-full text-base">
                  <Download className="size-5" aria-hidden />
                  Descargar en PDF
                </Boton>
                <Boton variante="secundario" onClick={() => window.print()} className="h-12 w-full text-base text-brand ring-brand">
                  <Printer className="size-5" aria-hidden />
                  Imprimir
                </Boton>
                {errorDescarga && <p role="alert" className="text-center text-sm text-danger">{errorDescarga}</p>}
              </div>
            </section>

            <div className="flex flex-col gap-4 print:hidden">
              {data.proximaSesion && <ProximaSesion sesion={data.proximaSesion} />}

              <section className={`${tarjeta} flex flex-col gap-3 p-5`}>
                <h2 className="text-base leading-6 font-semibold text-ink">¿Cómo se usa?</h2>
                <ol className="flex flex-col gap-3">
                  {PASOS.map((paso, i) => (
                    <li key={paso} className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs leading-4 font-semibold text-brand">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-5 text-ink">{paso}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <AvisoInfo titulo="¿Sin celular?">
                Imprime tu QR o dile tu DNI al encargado: también puede registrarte buscándote por DNI.
              </AvisoInfo>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProximaSesion({ sesion }: { sesion: SesionPresencialResumen }) {
  return (
    <section className={`${tarjeta} flex flex-col gap-3 p-5`}>
      <p className="text-xs leading-4 font-semibold text-brand">Tu próxima sesión presencial</p>
      <h2 className="text-base leading-6 font-semibold wrap-anywhere text-ink">{sesion.titulo}</h2>
      <Dato icono={Calendar} etiqueta="Fecha" valor={fechaConAnio(sesion.fecha)} />
      <Dato icono={Clock} etiqueta="Hora" valor={`${hora12(sesion.horaInicio)} – ${hora12(sesion.horaFin)}`} />
      <Dato icono={MapPin} etiqueta="Lugar" valor={sesion.lugar} />
    </section>
  )
}

function Dato({ icono: Icono, etiqueta, valor }: { icono: LucideIcon; etiqueta: string; valor: string }) {
  return (
    <p className="flex items-center gap-2 text-sm leading-5">
      <Icono className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="text-muted">{etiqueta}</span>
      <span className="min-w-0 flex-1 text-right text-ink">{valor}</span>
    </p>
  )
}
