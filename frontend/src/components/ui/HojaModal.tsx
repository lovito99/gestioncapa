import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  subtitulo?: string
  /** `amplio` para contenido en dos columnas, como «Revisar voucher» (S3 8.1a) */
  ancho?: 'normal' | 'amplio'
  children: ReactNode
}

/**
 * «Modal» del Figma S3: en celular es una hoja que sube desde abajo con su agarre; en escritorio
 * se centra. Se cierra con Esc, con la X o tocando fuera.
 */
export function HojaModal({ abierto, onCerrar, titulo, subtitulo, ancho = 'normal', children }: Props) {
  const idTitulo = useId()
  const panel = useRef<HTMLDivElement>(null)
  const cerrar = useRef(onCerrar)

  useEffect(() => {
    cerrar.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    if (!abierto) return
    const anterior = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && cerrar.current()
    document.addEventListener('keydown', alPresionar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
      anterior?.focus()
    }
  }, [abierto])

  if (!abierto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(32,35,42,0.5)] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`flex max-h-[92dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white px-4 pt-5 pb-6 shadow-[0_8px_16px_rgba(0,0,0,0.18)] outline-none sm:rounded-2xl sm:px-6 ${ancho === 'amplio' ? 'sm:max-w-190' : 'sm:max-w-120'}`}
      >
        <div className="flex justify-center sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-xs bg-line" />
        </div>
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id={idTitulo} className="font-serif text-xl leading-7 font-bold text-ink">
              {titulo}
            </h2>
            {subtitulo && <p className="text-sm leading-5 text-muted">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X className="size-5.5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
