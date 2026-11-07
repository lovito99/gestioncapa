import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { EstadoAsistencia, EstadoClase } from '@/types/api'

const tonos = {
  neutro: 'bg-surface-3 text-muted',
  marca: 'bg-brand-soft text-brand',
  exito: 'bg-success-soft text-success',
  peligro: 'bg-danger-soft text-danger',
  advertencia: 'bg-warning-soft text-warning',
}

/** Etiqueta pequeña del Figma (caption 12 px, esquina radius/tag); `grande` usa 14 px. */
export function Etiqueta({
  tono = 'neutro',
  grande = false,
  children,
}: {
  tono?: keyof typeof tonos
  grande?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-medium whitespace-nowrap',
        grande ? 'text-sm' : 'text-xs',
        tonos[tono],
      )}
    >
      {children}
    </span>
  )
}

export function EtiquetaEstadoCurso({ estado }: { estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO' }) {
  if (estado === 'PUBLICADO') return <Etiqueta tono="exito">Publicado</Etiqueta>
  return <Etiqueta>{estado === 'CERRADO' ? 'Cerrado' : 'Borrador'}</Etiqueta>
}

export function EtiquetaEstadoClase({ estado, grande = false }: { estado: EstadoClase; grande?: boolean }) {
  const programada = estado === 'PROGRAMADA'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-1 font-medium whitespace-nowrap',
        grande ? 'text-[13px] leading-4.5' : 'text-xs leading-3',
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
        'inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] leading-3.5 font-semibold tracking-[0.44px]',
        presente ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
      )}
    >
      <Icono className="size-2.5" strokeWidth={3} aria-hidden />
      {presente ? 'Presente' : 'Ausente'}
    </span>
  )
}
