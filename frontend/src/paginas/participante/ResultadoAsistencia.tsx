import { CameraOff, Check, Clock, Info, MapPin, ScanQrCode, TriangleAlert, UserX, WifiOff, CircleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Boton } from '@/components/ui/Boton'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fechaLarga, horaRegistro } from '@/lib/formato'
import { useClasesParticipante } from '@/servicios/participante'
import type { MarcarAsistenciaRespuesta } from '@/types/api'

type Tono = 'exito' | 'peligro' | 'advertencia'

const TONOS: Record<Tono, string> = {
  exito: 'bg-success-soft text-success',
  peligro: 'bg-danger-soft text-danger',
  advertencia: 'bg-warning-soft text-warning',
}

interface Presentacion {
  titulo: string
  mensaje: (clase?: string) => string
  Icono: LucideIcon
  tono: Tono
  /** Botón principal: volver a escanear, reintentar el envío o solo volver a mis clases */
  accion: 'escanear' | 'reintentar' | 'ninguna'
}

/** Textos de 3.3a–3.3g del Figma, por código de error de la API. */
const POR_CODIGO: Record<string, Presentacion> = {
  QR_EXPIRADO: {
    titulo: 'QR expirado',
    mensaje: () => 'El código QR que escaneaste ya venció. Pide al instructor que muestre el código actual y vuelve a escanear.',
    Icono: Clock,
    tono: 'peligro',
    accion: 'escanear',
  },
  QR_INVALIDO: {
    titulo: 'Código QR no válido',
    mensaje: () => 'No pudimos reconocer este código. Asegúrate de escanear el QR que muestra el instructor en la pantalla de la clase.',
    Icono: ScanQrCode,
    tono: 'peligro',
    accion: 'escanear',
  },
  QR_OTRA_CLASE: {
    titulo: 'Este QR es de otra clase',
    mensaje: (clase) =>
      `El código que escaneaste no corresponde a ${clase ?? 'esta clase'}. Verifica que estás en la clase correcta y escanea su código.`,
    Icono: TriangleAlert,
    tono: 'peligro',
    accion: 'escanear',
  },
  ASISTENCIA_YA_REGISTRADA: {
    titulo: 'Asistencia ya registrada',
    mensaje: () => 'Tu asistencia a esta clase ya fue registrada antes. No necesitas volver a escanear.',
    Icono: Info,
    tono: 'advertencia',
    accion: 'ninguna',
  },
  NO_INSCRITO: {
    titulo: 'No estás inscrito en esta clase',
    mensaje: () => 'Solo los agremiados inscritos pueden registrar asistencia. Si crees que es un error, comunícate con el administrador.',
    Icono: UserX,
    tono: 'peligro',
    accion: 'ninguna',
  },
  CLASE_CANCELADA: {
    titulo: 'La clase está cancelada',
    mensaje: () => 'Esta clase fue cancelada, así que no se registra asistencia.',
    Icono: CircleAlert,
    tono: 'peligro',
    accion: 'ninguna',
  },
  ERROR_DE_RED: {
    titulo: 'Sin conexión a internet',
    mensaje: () => 'No pudimos registrar tu asistencia porque se perdió la conexión. Revisa tu internet y vuelve a intentarlo.',
    Icono: WifiOff,
    tono: 'peligro',
    accion: 'reintentar',
  },
}

const GENERICO: Presentacion = {
  titulo: 'No pudimos registrar tu asistencia',
  mensaje: () => 'Ocurrió un error inesperado. Intenta de nuevo.',
  Icono: CircleAlert,
  tono: 'peligro',
  accion: 'escanear',
}

const enlaceMisClases = 'text-center text-sm font-semibold text-brand hover:underline'
const botonPrincipal = 'flex h-12 w-full items-center justify-center rounded-lg bg-brand text-base font-semibold text-white hover:bg-brand-ink'

/** Pantalla de resultado: ícono en círculo, título y mensaje arriba; acciones al pie. */
function Resultado({
  Icono,
  tono,
  titulo,
  children,
  acciones,
}: {
  Icono: LucideIcon
  tono: Tono
  titulo: string
  children: ReactNode
  acciones: ReactNode
}) {
  return (
    <section aria-live="polite" className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-120 flex-col px-4 pt-16 pb-8 wrap-anywhere">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className={cn('mb-3 flex size-16 items-center justify-center rounded-full', TONOS[tono])}>
          <Icono className="size-8" aria-hidden />
        </span>
        <h1 className="text-[22px] leading-7 font-bold text-ink">{titulo}</h1>
        {children}
      </div>
      <div className="mt-auto flex flex-col gap-4 pt-10">{acciones}</div>
    </section>
  )
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)
const diaEnLima = (fechaHoraIso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(fechaHoraIso))

/** 3.4 · Asistencia registrada. El lugar sale de la lista de clases del agremiado. */
export function AsistenciaRegistrada({ resultado }: { resultado: MarcarAsistenciaRespuesta }) {
  const { data: clases } = useClasesParticipante()
  const lugar = clases?.find((c) => c.id === resultado.clase.id)?.lugar
  return (
    <Resultado
      Icono={Check}
      tono="exito"
      titulo="Asistencia registrada"
      acciones={
        <Link to="/participante/clases" className={botonPrincipal}>
          Volver a mis clases
        </Link>
      }
    >
      <p className="text-sm text-muted">Tu asistencia se registró correctamente.</p>
      <div className="mt-3 flex w-full flex-col gap-2.5 rounded-xl border border-line bg-page p-4 text-left">
        <p className="border-b border-line pb-2.5 text-base font-semibold text-ink">{resultado.clase.nombre}</p>
        <p className="flex items-start gap-2 text-sm text-muted">
          <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          Registrado a las {horaRegistro(resultado.horaRegistro)} (hora de Lima) · {capitalizar(fechaLarga(diaEnLima(resultado.horaRegistro)))}
        </p>
        {lugar && (
          <p className="flex items-start gap-2 text-sm text-muted">
            <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            {lugar}
          </p>
        )}
      </div>
    </Resultado>
  )
}

/** 3.3a–3.3e y 3.3g · La API rechazó el registro. */
export function AsistenciaRechazada({
  error,
  onReintentar,
  nombreClase,
}: {
  error: unknown
  onReintentar?: () => void
  nombreClase?: string
}) {
  const codigo = error instanceof ApiError ? error.code : ''
  const { titulo, mensaje, Icono, tono, accion } = POR_CODIGO[codigo] ?? GENERICO
  const texto = POR_CODIGO[codigo] || !(error instanceof ApiError) ? mensaje(nombreClase) : error.message

  return (
    <Resultado
      Icono={Icono}
      tono={tono}
      titulo={titulo}
      acciones={
        <>
          {accion !== 'ninguna' && onReintentar && (
            <Boton onClick={onReintentar} className="h-12 w-full text-base">
              {accion === 'reintentar' ? 'Reintentar' : 'Volver a escanear'}
            </Boton>
          )}
          <Link to="/participante/clases" className={accion === 'ninguna' ? botonPrincipal : enlaceMisClases}>
            Volver a mis clases
          </Link>
        </>
      }
    >
      <p className="max-w-80 text-sm text-muted">{texto}</p>
    </Resultado>
  )
}

/** 3.3f · El navegador no dio acceso a la cámara. */
export function ErrorCamara({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <Resultado
      Icono={CameraOff}
      tono="peligro"
      titulo="No tenemos acceso a la cámara"
      acciones={
        <>
          <Boton onClick={onReintentar} className="h-12 w-full text-base">
            Reintentar
          </Boton>
          <Link to="/participante/clases" className={enlaceMisClases}>
            Volver a mis clases
          </Link>
        </>
      }
    >
      <p role="alert" className="max-w-80 text-sm text-muted">
        {mensaje}
      </p>
    </Resultado>
  )
}

export function Enviando() {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-120 flex-col items-center gap-4 px-4 pt-24 text-center">
      <span className="size-12 animate-spin rounded-full border-4 border-brand-soft border-t-brand" aria-hidden />
      <p className="text-base font-medium text-ink" role="status">
        Registrando tu asistencia…
      </p>
    </section>
  )
}
