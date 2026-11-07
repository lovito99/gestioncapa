import { CircleAlert } from 'lucide-react'
import { useId, type ReactElement, type ReactNode } from 'react'
import { cloneElement, isValidElement } from 'react'

export type EstadoCampo = 'normal' | 'error' | 'advertencia'

interface Props {
  etiqueta: string
  obligatorio?: boolean
  error?: string
  /** Indicación bajo el control; el error la reemplaza mientras exista */
  ayuda?: string
  children: ReactNode
  className?: string
}

/** Etiqueta + control + mensaje de error, con los atributos de accesibilidad conectados. */
export function Campo({ etiqueta, obligatorio, error, ayuda, children, className }: Props) {
  const id = useId()
  const idError = `${id}-error`
  const idAyuda = `${id}-ayuda`
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? idError : ayuda ? idAyuda : undefined,
      })
    : children

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-ink-2">
        {etiqueta}
        {obligatorio && (
          <span aria-hidden className="font-bold text-required">
            *
          </span>
        )}
      </label>
      {control}
      {error && (
        <p id={idError} className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {!error && ayuda && (
        <p id={idAyuda} className="mt-1.5 text-xs text-muted">
          {ayuda}
        </p>
      )}
    </div>
  )
}
