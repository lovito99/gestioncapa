import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variante = 'primario' | 'secundario' | 'peligro' | 'icono'

const estilos: Record<Variante, string> = {
  primario:
    'bg-brand text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-brand-ink disabled:bg-brand/60',
  secundario: 'bg-white text-ink-2 ring-1 ring-line-2 ring-inset hover:bg-surface-2',
  peligro: 'bg-danger-strong text-white hover:bg-danger',
  icono: 'size-8 rounded-[4px] p-0 text-muted-2 hover:bg-surface-3',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  cargando?: boolean
}

export function Boton({
  variante = 'primario',
  cargando = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(
        'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light',
        'disabled:cursor-not-allowed',
        estilos[variante],
        className,
      )}
      {...props}
    >
      {cargando ? 'Procesando…' : children}
    </button>
  )
}
