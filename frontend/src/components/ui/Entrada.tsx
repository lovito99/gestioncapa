import { ChevronDown } from 'lucide-react'
import type { InputHTMLAttributes, Ref, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import type { EstadoCampo } from './Campo'

const base =
  'h-10 w-full rounded-lg bg-white px-3 text-sm text-ink placeholder:text-muted-3 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand-light'

const porEstado: Record<EstadoCampo, string> = {
  normal: 'ring-1 ring-muted-3 ring-inset',
  error: 'ring-2 ring-danger ring-inset focus-visible:ring-danger',
  advertencia: 'ring-2 ring-warning ring-inset focus-visible:ring-warning',
}

interface EntradaProps extends InputHTMLAttributes<HTMLInputElement> {
  estado?: EstadoCampo
  ref?: Ref<HTMLInputElement>
}

export function Entrada({ estado = 'normal', className, ...props }: EntradaProps) {
  return <input className={cn(base, porEstado[estado], className)} {...props} />
}

interface SelectorProps extends SelectHTMLAttributes<HTMLSelectElement> {
  estado?: EstadoCampo
  ref?: Ref<HTMLSelectElement>
}

export function Selector({ estado = 'normal', className, children, ...props }: SelectorProps) {
  return (
    <div className="relative">
      <select
        className={cn(base, porEstado[estado], 'appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-2"
      />
    </div>
  )
}
