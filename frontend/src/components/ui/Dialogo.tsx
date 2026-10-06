import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  icono?: ReactNode
  children: ReactNode
  acciones: ReactNode
}

/** Diálogo modal de confirmación. Se cierra con Esc o haciendo clic fuera. */
export function Dialogo({ abierto, onCerrar, titulo, icono, children, acciones }: Props) {
  const idTitulo = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const anterior = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alPresionar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
      anterior?.focus()
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="flex w-full max-w-[480px] flex-col gap-[18px] rounded-xl bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-center gap-3.5">
          {icono}
          <h2 id={idTitulo} className="text-xl leading-[25px] font-semibold text-ink">
            {titulo}
          </h2>
        </div>
        {children}
        <div className="flex flex-wrap justify-end gap-3 pt-2">{acciones}</div>
      </div>
    </div>,
    document.body,
  )
}
