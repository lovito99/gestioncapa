import { useId, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import { Boton } from '@/components/ui/Boton'
import { Entrada } from '@/components/ui/Entrada'
import { esIdCursoPublico, normalizarOrigenCurso, rutaCortaCurso } from '@/lib/enlaceCurso'
import type { Curso } from '@/servicios/cursos'

export function CompartirCurso({ curso }: { curso: Pick<Curso, 'id' | 'titulo'> }) {
  const [abierto, cambiarAbierto] = useState(false)
  const [resultado, cambiarResultado] = useState('')
  const boton = useRef<HTMLButtonElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const panel = useId()
  const origen = normalizarOrigenCurso(import.meta.env.VITE_ORIGEN_PUBLICO || (import.meta.env.DEV ? window.location.origin : ''))
  if (!origen || !esIdCursoPublico(curso.id)) return null

  const enlace = `${origen}${rutaCortaCurso(curso.id)}`
  const whatsapp = new URL('https://wa.me/')
  whatsapp.searchParams.set('text', `${curso.titulo}\n${enlace}`)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
      cambiarResultado('Enlace copiado.')
    } catch {
      campo.current?.focus()
      campo.current?.select()
      cambiarResultado('Selecciona y copia el enlace.')
    }
  }

  return <div className="min-w-0 space-y-2" onKeyDown={evento => {
    if (evento.key !== 'Escape' || !abierto) return
    evento.stopPropagation()
    cambiarAbierto(false)
    boton.current?.focus()
  }}>
    <Boton variante="secundario" className="min-h-11 px-4" aria-expanded={abierto} aria-controls={panel}
      onClick={evento => {
        boton.current = evento.currentTarget
        cambiarAbierto(!abierto)
        cambiarResultado('')
      }}>
      <Share2 className="size-4" aria-hidden />
      Compartir
    </Boton>
    <div id={panel} hidden={!abierto} className="space-y-2 rounded-lg border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href={whatsapp.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          Compartir por WhatsApp
        </a>
        <Boton variante="secundario" className="min-h-11 px-3" onClick={copiar}>Copiar enlace</Boton>
      </div>
      <Entrada ref={campo} aria-label="Enlace del curso" value={enlace} readOnly onFocus={evento => evento.currentTarget.select()} />
      <p role="status" className="text-sm font-medium text-ink">{resultado}</p>
    </div>
  </div>
}
