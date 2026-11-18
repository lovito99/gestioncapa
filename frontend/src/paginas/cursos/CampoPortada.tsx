import { ImageUp, RefreshCw, Trash2, TriangleAlert } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { cn } from '@/lib/cn'
import { Boton } from '@/components/ui/Boton'
import type { Curso } from '@/servicios/cursos'
import { prepararPortada, type CambioPortada } from './reglasCurso'
import { PortadaCurso } from './piezasCurso'

/** «Imagen de portada (opcional)» del Figma S3 2.1: zona para soltar, vista previa y errores. */
export function CampoPortada({
  curso,
  cambio,
  alCambiar,
  error,
  alError,
  alPreparar,
  alGuardar,
  guardando,
  errorGuardado,
}: {
  curso: Pick<Curso, 'titulo' | 'categoria' | 'portadaUrl'>
  cambio: CambioPortada
  alCambiar: (cambio: CambioPortada) => void
  error?: string
  alError: (mensaje: string | undefined) => void
  alPreparar: (preparando: boolean) => void
  alGuardar?: () => void
  guardando: boolean
  errorGuardado?: string
}) {
  const id = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const seleccion = useRef(0)
  const [preparando, cambiarPreparando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)

  const elegir = async (archivo: File | undefined) => {
    if (!archivo) return
    const turno = ++seleccion.current
    if (entrada.current) entrada.current.value = ''
    cambiarPreparando(true)
    alPreparar(true)
    try {
      const preparada = await prepararPortada(archivo)
      if (turno !== seleccion.current) return
      alCambiar(preparada)
      alError(undefined)
    } catch (e) {
      if (turno === seleccion.current) alError(e instanceof Error ? e.message : 'No pudimos usar esa imagen.')
    } finally {
      if (turno === seleccion.current) {
        cambiarPreparando(false)
        alPreparar(false)
      }
    }
  }
  const soltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    void elegir(e.dataTransfer.files[0])
  }

  const actual = cambio.tipo === 'nueva' ? cambio.vistaPrevia : cambio.tipo === 'quitar' ? null : (curso.portadaUrl ?? null)
  const abrir = () => entrada.current?.click()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1 text-sm leading-5">
        <span className="font-semibold text-ink">Imagen de portada</span>
        <span className="text-muted">(opcional)</span>
      </label>
      <input
        ref={entrada}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-invalid={error || errorGuardado ? true : undefined}
        aria-describedby={`${id}-ayuda`}
        onChange={(e) => void elegir(e.target.files?.[0])}
      />

      {actual ? (
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-3 sm:flex-row sm:items-center">
          <PortadaCurso curso={{ ...curso, portadaUrl: actual }} className="rounded-md sm:w-60 sm:shrink-0" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm leading-5 font-semibold break-all text-ink">{cambio.tipo === 'nueva' ? cambio.entrada.nombre : 'Portada actual'}</p>
            {cambio.tipo === 'nueva' && <p className="text-xs leading-4 text-muted">{cambio.detalle}</p>}
            <div className="mt-1 flex flex-wrap gap-2">
              <button type="button" onClick={abrir} className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand bg-white px-3.5 text-sm leading-5 font-semibold text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                <RefreshCw className="size-4.5" aria-hidden />
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => {
                  seleccion.current++
                  cambiarPreparando(false)
                  alPreparar(false)
                  alCambiar(curso.portadaUrl ? { tipo: 'quitar' } : { tipo: 'sin-cambios' })
                  alError(undefined)
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm leading-5 font-semibold text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Trash2 className="size-4.5" aria-hidden />
                Quitar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={abrir}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={soltar}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-6 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            error ? 'border-2 border-danger bg-danger-soft' : arrastrando ? 'border-2 border-brand bg-brand-soft' : 'border border-muted-3 bg-page hover:bg-surface-2',
          )}
        >
          <ImageUp className="size-8 text-brand" strokeWidth={1.5} aria-hidden />
          <span className="text-sm leading-5 text-ink">
            <span className="sm:hidden">Toca para subir una imagen</span>
            <span className="hidden sm:inline">
              Arrastra una imagen aquí o <span className="font-semibold text-brand underline">elige un archivo</span>
            </span>
          </span>
          <span className="text-xs leading-4 text-muted">JPG, PNG o WebP · hasta 1 MB · proporción 16:9 (ej. 1280 × 720)</span>
        </button>
      )}

      {alGuardar && cambio.tipo !== 'sin-cambios' && (
        <div className="flex flex-wrap gap-2">
          <Boton onClick={alGuardar} cargando={guardando} disabled={preparando || !!error}>Guardar portada</Boton>
          <Boton variante="secundario" onClick={() => {
            seleccion.current++
            cambiarPreparando(false)
            alPreparar(false)
            alCambiar({ tipo: 'sin-cambios' })
            alError(undefined)
          }}>Deshacer cambio de portada</Boton>
        </div>
      )}
      {errorGuardado && <p role="alert" className="text-sm text-danger">{errorGuardado}</p>}

      {error ? (
        <p id={`${id}-ayuda`} role="alert" className="flex items-start gap-1.5 text-sm leading-5 text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        <p id={`${id}-ayuda`} className={cn('leading-5 text-muted', actual ? 'text-xs leading-4' : 'text-sm')}>
          {actual ? 'Texto alternativo: se usa el nombre del curso automáticamente.' : 'Si no subes una, se mostrará la imagen por defecto de la categoría.'}
        </p>
      )}
    </div>
  )
}
