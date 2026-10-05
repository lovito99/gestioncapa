import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { EstadoAsistencia, EstadoClase } from '@/types/api'

export function EtiquetaEstadoClase({ estado, grande = false }: { estado: EstadoClase; grande?: boolean }) {
  const programada = estado === 'PROGRAMADA'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-1 font-medium whitespace-nowrap',
        grande ? 'text-[13px] leading-[18px]' : 'text-xs leading-3',
        programada ? 'bg-brand-soft text-brand' : 'bg-surface-3 text-muted',
      )}
    >
      {programada ? 'Programada' : 'Cancelada'}
    </span>
  )
}

export function EtiquetaAsistencia({ estado }: { estado: EstadoAsistencia }) {
  const presente = estado === 'PRESENTE'
  const Icono = presente ? Check : X
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] leading-[14px] font-semibold tracking-[0.44px]',
        presente ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
      )}
    >
      <Icono className="size-2.5" strokeWidth={3} aria-hidden />
      {presente ? 'Presente' : 'Ausente'}
    </span>
  )
}
