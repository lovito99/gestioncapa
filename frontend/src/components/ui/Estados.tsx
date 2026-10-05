import { CircleAlert } from 'lucide-react'
import { Boton } from './Boton'

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p role="status" className="py-12 text-center text-sm text-muted">
      {texto}
    </p>
  )
}

export function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <CircleAlert className="size-6 text-danger" aria-hidden />
      <p className="text-sm text-muted">{mensaje}</p>
      <Boton variante="secundario" onClick={onReintentar}>
        Reintentar
      </Boton>
    </div>
  )
}
