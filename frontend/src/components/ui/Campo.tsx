import { CircleAlert } from 'lucide-react'
import { useId, type ReactElement, type ReactNode } from 'react'
import { cloneElement, isValidElement } from 'react'

export type EstadoCampo = 'normal' | 'error' | 'advertencia'

interface Props {
  etiqueta: string
  obligatorio?: boolean
  error?: string
  children: ReactNode
  className?: string
}

/** Etiqueta + control + mensaje de error, con los atributos de accesibilidad conectados. */
export function Campo({ etiqueta, obligatorio, error, children, className }: Props) {
  const id = useId()
  const idError = `${id}-error`
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? idError : undefined,
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
    </div>
  )
}
