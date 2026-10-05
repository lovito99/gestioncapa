import logoAzul from '@/assets/logo-qr-azul.svg'
import logoHeader from '@/assets/logo-qr-header.svg'
import { cn } from '@/lib/cn'

/** Logo con recuadro azul y QR blanco (encabezado del coordinador y del QR). */
export function LogoRecuadro({ tamano = 36, className }: { tamano?: 32 | 36; className?: string }) {
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-lg bg-brand', className)}
      style={{ width: tamano, height: tamano }}
    >
      <img src={logoHeader} alt="" width={15} height={15} />
    </span>
  )
}

/** Logo plano: QR azul sin recuadro (encabezado del instructor). */
export function LogoPlano() {
  return <img src={logoAzul} alt="" width={21} height={21} className="shrink-0" />
}
