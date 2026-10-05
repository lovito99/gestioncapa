import { CircleAlert, CircleCheck, Clock, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Boton } from '@/components/ui/Boton'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { horaRegistro } from '@/lib/formato'
import type { MarcarAsistenciaRespuesta } from '@/types/api'

interface Presentacion {
  titulo: string
  Icono: LucideIcon
  color: string
  /** Si tiene sentido volver a escanear (p. ej. el QR venció mientras se leía) */
  reintentable: boolean
}

const POR_CODIGO: Record<string, Presentacion> = {
  QR_EXPIRADO: { titulo: 'El código QR expiró', Icono: Clock, color: 'text-warning', reintentable: true },
  QR_INVALIDO: { titulo: 'Código QR no válido', Icono: CircleAlert, color: 'text-danger', reintentable: true },
  QR_OTRA_CLASE: { titulo: 'Este QR es de otra clase', Icono: CircleAlert, color: 'text-danger', reintentable: true },
  NO_INSCRITO: { titulo: 'No estás inscrito(a) en esta clase', Icono: CircleAlert, color: 'text-danger', reintentable: false },
  ASISTENCIA_YA_REGISTRADA: {
    titulo: 'Tu asistencia ya estaba registrada',
    Icono: CircleCheck,
    color: 'text-success',
    reintentable: false,
  },
  CLASE_CANCELADA: { titulo: 'La clase está cancelada', Icono: CircleAlert, color: 'text-danger', reintentable: false },
  ERROR_DE_RED: { titulo: 'Sin conexión', Icono: CircleAlert, color: 'text-danger', reintentable: true },
}

const GENERICO: Presentacion = {
  titulo: 'No pudimos registrar tu asistencia',
  Icono: CircleAlert,
  color: 'text-danger',
  reintentable: true,
}

const enlaceSecundario =
  'inline-flex h-12 w-full items-center justify-center rounded-lg bg-white text-base font-semibold text-ink-2 ring-1 ring-line-2 ring-inset hover:bg-surface-2'

function Tarjeta({ children }: { children: ReactNode }) {
  return (
    <section
      aria-live="polite"
      className="flex w-full flex-col items-center gap-3 rounded-xl border border-line bg-white px-5 py-8 text-center"
    >
      {children}
    </section>
  )
}

export function AsistenciaRegistrada({ resultado }: { resultado: MarcarAsistenciaRespuesta }) {
  return (
    <Tarjeta>
      <CircleCheck className="size-14 text-success" aria-hidden />
      <h1 className="text-xl leading-7 font-bold text-ink">¡Asistencia registrada!</h1>
      <p className="text-base font-medium text-ink-2">{resultado.clase.nombre}</p>
      <p className="text-sm text-muted">
        Hora de registro: <strong className="text-ink">{horaRegistro(resultado.horaRegistro)}</strong> (hora de Lima)
      </p>
      <Link to="/participante/clases" className={cn(enlaceSecundario, 'mt-4')}>
        Volver a mis clases
      </Link>
    </Tarjeta>
  )
}

export function AsistenciaRechazada({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  const codigo = error instanceof ApiError ? error.code : ''
  const { titulo, Icono, color, reintentable } = POR_CODIGO[codigo] ?? GENERICO
  const mensaje = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado. Intenta de nuevo.'

  return (
    <Tarjeta>
      <Icono className={cn('size-14', color)} aria-hidden />
      <h1 className="text-xl leading-7 font-bold text-ink">{titulo}</h1>
      <p className="text-sm leading-5 text-muted">{mensaje}</p>
      <div className="mt-4 flex w-full flex-col gap-3">
        {reintentable && onReintentar && (
          <Boton onClick={onReintentar} className="h-12 w-full text-base">
            Escanear de nuevo
          </Boton>
        )}
        <Link to="/participante/clases" className={enlaceSecundario}>
          Volver a mis clases
        </Link>
      </div>
    </Tarjeta>
  )
}

export function Enviando() {
  return (
    <Tarjeta>
      <span className="size-12 animate-spin rounded-full border-4 border-brand-soft border-t-brand" aria-hidden />
      <p className="text-base font-medium text-ink" role="status">
        Registrando tu asistencia…
      </p>
    </Tarjeta>
  )
}
