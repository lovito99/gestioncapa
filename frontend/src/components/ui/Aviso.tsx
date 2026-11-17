import { CircleX, Info, TriangleAlert, CircleCheck, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const TIPOS: Record<'info' | 'error' | 'advertencia' | 'exito', { caja: string; titulo: string; Icono: LucideIcon; rol: 'status' | 'alert' }> = {
  info: { caja: 'border-brand bg-brand-soft', titulo: 'text-brand', Icono: Info, rol: 'status' },
  error: { caja: 'border-danger bg-danger-soft', titulo: 'text-danger', Icono: CircleX, rol: 'alert' },
  advertencia: { caja: 'border-warning bg-warning-soft', titulo: 'text-warning', Icono: TriangleAlert, rol: 'status' },
  exito: { caja: 'border-success bg-success-soft', titulo: 'text-success', Icono: CircleCheck, rol: 'status' },
}

/**
 * «Aviso info / error / warning» del Figma S3: ícono y título del color del aviso, texto en tinta.
 * `Alerta` (Sprint 1–2) no separa título y texto con colores distintos, por eso va aparte.
 */
export function Aviso({ tipo = 'info', titulo, children, className }: { tipo?: keyof typeof TIPOS; titulo: string; children?: ReactNode; className?: string }) {
  const { caja, titulo: colorTitulo, Icono, rol } = TIPOS[tipo]
  return (
    <div role={rol} className={cn('flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm leading-5', caja, className)}>
      <Icono className={cn('size-5 shrink-0', colorTitulo)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn('font-semibold', colorTitulo)}>{titulo}</p>
        {children && <div className="text-ink">{children}</div>}
      </div>
    </div>
  )
}

/** Atajo para el aviso informativo, el más usado. */
export function AvisoInfo({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return <Aviso tipo="info" titulo={titulo}>{children}</Aviso>
}
