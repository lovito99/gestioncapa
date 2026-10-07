import { CalendarX2, CircleAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tipo = 'error' | 'advertencia' | 'conflicto'

const estilos: Record<Tipo, { caja: string; Icono: LucideIcon }> = {
  error: { caja: 'border-danger bg-danger-soft text-danger', Icono: CircleAlert },
  advertencia: { caja: 'border-warning bg-warning-soft text-warning', Icono: TriangleAlert },
  conflicto: { caja: 'border-warning bg-warning-soft text-warning', Icono: CalendarX2 },
}

interface Props {
  tipo: Tipo
  titulo?: string
  children: ReactNode
  className?: string
}

export function Alerta({ tipo, titulo, children, className }: Props) {
  const { caja, Icono } = estilos[tipo]
  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-lg border px-4 py-3.5 text-sm', caja, className)}>
      <Icono className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {titulo && <p className="leading-[17.5px] font-semibold">{titulo}</p>}
        <div className={cn(titulo ? 'mt-0.5 leading-[19.25px]' : 'leading-5 font-medium')}>{children}</div>
      </div>
    </div>
  )
}
