import { useId } from 'react'
import { cn } from '@/lib/cn'

/** «Interruptor» del Figma S3: título, ayuda opcional y switch de 40 × 24 a la derecha. */
export function Interruptor({ titulo, ayuda, activo, onCambiar, disabled }: {
  titulo: string
  ayuda?: string
  activo: boolean
  onCambiar: (activo: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={`${id}-titulo`} className="text-sm leading-5 font-semibold text-ink">{titulo}</span>
        {ayuda && <span id={`${id}-ayuda`} className="text-xs leading-4 text-muted">{ayuda}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        aria-labelledby={`${id}-titulo`}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        disabled={disabled}
        onClick={() => onCambiar(!activo)}
        className={cn(
          'flex h-6 w-10 shrink-0 rounded-full p-[3px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light disabled:opacity-60',
          activo ? 'justify-end bg-brand' : 'justify-start bg-muted',
        )}
      >
        <span className="size-[18px] rounded-full bg-white" />
      </button>
    </div>
  )
}
