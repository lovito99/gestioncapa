import { Check, Link2, Mail, MessageCircle, Share2, type LucideIcon } from 'lucide-react'
import iconoFacebook from '@/assets/iconos/facebook.svg'
import { useRef, useState } from 'react'
import { HojaModal } from '@/components/ui/HojaModal'
import { cn } from '@/lib/cn'
import { costoPublicoCurso, esIdCursoPublico, fechaPublicaCurso, normalizarOrigenCurso, rutaCortaCurso } from '@/lib/enlaceCurso'
import type { Curso } from '@/servicios/cursos'

type CursoCompartible = Pick<Curso, 'id' | 'titulo' | 'fechaInicio' | 'fechaFin' | 'costo' | 'modalidadCobro'>

/** Botón redondo «Compartir» de la tarjeta y del detalle (Figma S3 3.1 / 4.1). */
export function BotonCompartir({ curso, grande = false, conTexto = false }: { curso: CursoCompartible; grande?: boolean; conTexto?: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const origen = normalizarOrigenCurso(import.meta.env.VITE_ORIGEN_PUBLICO || (import.meta.env.DEV ? window.location.origin : ''))
  if (!origen || !esIdCursoPublico(curso.id)) return null
  const url = `${origen}${rutaCortaCurso(curso.id)}`
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // En la tarjeta, el botón está dentro del enlace al curso
          e.preventDefault()
          e.stopPropagation()
          setAbierto(true)
        }}
        aria-label={`Compartir ${curso.titulo}`}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-2 text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          conTexto
            ? 'h-10 rounded-lg border border-brand bg-white px-4 text-sm font-semibold hover:bg-brand-soft'
            : cn('rounded-full bg-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.2)] hover:bg-brand-soft', grande ? 'size-11' : 'size-9'),
        )}
      >
        <Share2 className="size-4.5" aria-hidden />
        {conTexto && 'Compartir'}
      </button>
      <CompartirCurso curso={curso} url={url} abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  )
}

function CompartirCurso({ curso, url, abierto, onCerrar }: { curso: CursoCompartible; url: string; abierto: boolean; onCerrar: () => void }) {
  const campo = useRef<HTMLInputElement>(null)
  const [copiado, setCopiado] = useState(false)
  const [errorCopia, setErrorCopia] = useState('')

  const cerrar = () => {
    setCopiado(false)
    setErrorCopia('')
    onCerrar()
  }

  const texto = `${curso.titulo}\n${url}`
  const resumen = `${fechaPublicaCurso(curso)} · ${costoPublicoCurso(curso)}`
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setErrorCopia('')
    } catch {
      campo.current?.focus()
      campo.current?.select()
      setErrorCopia('Selecciona y copia el enlace.')
    }
  }

  return (
    <HojaModal abierto={abierto} onCerrar={cerrar} titulo="Compartir curso" subtitulo="Envíalo a tus colegas. El enlace abre la página pública del curso.">
      <p className="text-xs leading-4 font-semibold text-muted">Así se verá al compartirlo</p>
      <div className="rounded-lg border border-line bg-whatsapp-soft p-2">
        <div className="overflow-hidden rounded-lg bg-white">
          <img src="/vista-curso.png" alt="Capacitaciones del CPPP Región Cusco" className="aspect-[1200/630] w-full object-cover" />
          <div className="flex flex-col gap-0.5 p-2.5">
            <p className="text-sm leading-5 font-semibold wrap-anywhere text-ink">{curso.titulo}</p>
            <p className="text-xs leading-4 text-muted">{resumen}</p>
            <p className="text-xs leading-4 break-all text-brand">{url.replace(/^https?:\/\//, '')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <OpcionRed icono={MessageCircle} fondo="bg-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(texto)}`}>WhatsApp</OpcionRed>
        <OpcionRed icono={iconoFacebook} fondo="bg-facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook</OpcionRed>
        <OpcionRed icono={Mail} fondo="bg-brand" href={`mailto:?subject=${encodeURIComponent(curso.titulo)}&body=${encodeURIComponent(texto)}`}>Correo</OpcionRed>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`enlace-${curso.id}`} className="text-sm leading-5 font-semibold text-ink">
          Enlace corto
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id={`enlace-${curso.id}`}
              readOnly
              value={url}
              ref={campo}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 w-full truncate rounded-lg bg-white pr-3 pl-9.5 text-base text-ink ring-1 ring-muted-3 ring-inset outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
            />
          </div>
          <button
            type="button"
            onClick={() => void copiar()}
            className={cn(
              'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              copiado ? 'bg-success' : 'bg-brand hover:bg-brand-ink',
            )}
          >
            {copiado && <Check className="size-5" aria-hidden />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        {copiado && (
          <p role="status" className="flex items-center gap-1.5 text-sm leading-5 text-success">
            <Check className="size-4" aria-hidden />
            Enlace copiado. Pégalo donde quieras.
          </p>
        )}
        {errorCopia && <p role="alert" className="text-sm leading-5 text-danger">{errorCopia}</p>}
      </div>
    </HojaModal>
  )
}

/** `icono` es un ícono de lucide o la URL de un SVG del Figma (Lucide no trae logos de marcas). */
function OpcionRed({ icono: Icono, fondo, href, children }: { icono: LucideIcon | string; fondo: string; href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 flex-col items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-3 hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className={cn('flex size-11 items-center justify-center rounded-full text-white', fondo)}>
        {typeof Icono === 'string' ? <img src={Icono} alt="" className="size-5.5" /> : <Icono className="size-5.5" aria-hidden />}
      </span>
      <span className="text-sm leading-5 font-semibold text-ink">{children}</span>
      <span className="sr-only">(abre otra pestaña)</span>
    </a>
  )
}
