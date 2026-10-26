import insignia from '@/assets/insignia-cppp.png'
import { cn } from '@/lib/cn'

/** Insignia del Colegio de Profesores (proporción 30 × 41 del Figma). */
export function LogoInsignia({ alto = 41, className }: { alto?: number; className?: string }) {
  return (
    <img
      src={insignia}
      alt=""
      height={alto}
      width={Math.round((alto * 30) / 41)}
      className={cn('shrink-0 object-contain', className)}
    />
  )
}
