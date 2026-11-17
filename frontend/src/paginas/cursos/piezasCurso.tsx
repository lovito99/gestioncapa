import { Award, CreditCard, Heart, Image as IconoImagen, LayoutGrid, MapPin, PlayCircle, Video, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import azulCirculo1 from '@/assets/portadas/azul-circulo-1.svg'
import azulCirculo2 from '@/assets/portadas/azul-circulo-2.svg'
import azulCirculo3 from '@/assets/portadas/azul-circulo-3.svg'
import azulIcono from '@/assets/portadas/azul-icono.svg'
import dorado from '@/assets/portadas/dorado.svg'
import morado from '@/assets/portadas/morado.svg'
import rojo from '@/assets/portadas/rojo.svg'
import verde from '@/assets/portadas/verde.svg'
import vino from '@/assets/portadas/vino.svg'
import { cn } from '@/lib/cn'
import type { Curso, ModalidadCobro } from '@/servicios/cursos'
import { modalidadCobroDe, precioGeneralDe, soles } from './reglasCurso'
import type { ModalidadSesion } from '@/servicios/modalidadCurso'

// ---------- Portada 16:9 (SCRUM-181) ----------

type Fondo = 'vino' | 'verde' | 'dorado' | 'azul' | 'morado' | 'rojo'
const FONDOS: Record<Exclude<Fondo, 'azul'>, string> = { vino, verde, dorado, morado, rojo }

/**
 * Imagen por defecto de cada categoría, con las ilustraciones del Figma S3 3.1.
 * Pendiente de confirmar con Diseño la asignación de las categorías que el Figma no muestra.
 */
const FONDO_POR_CATEGORIA: Record<string, Fondo> = {
  Evaluación: 'vino',
  Educación: 'verde',
  'Educación inclusiva': 'verde',
  Didáctica: 'dorado',
  Planificación: 'dorado',
  Tecnología: 'azul',
  'Tecnología educativa': 'azul',
  'Gestión escolar': 'morado',
  Tutoría: 'morado',
  'Seguridad y salud': 'rojo',
  Comprensión: 'rojo',
  General: 'vino',
}
const fondoDeCategoria = (categoria: string): Fondo => FONDO_POR_CATEGORIA[categoria] ?? 'vino'

/** La de tecnología llega del Figma por capas (degradado, círculos e ícono); se arma igual que allí. */
function FondoAzul() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(150.64deg,#1f4e79_0%,#0d2840_71.43%)]">
      <img src={azulCirculo1} alt="" className="absolute top-[-25%] left-[62.5%] size-[45%] max-w-none" />
      <img src={azulCirculo2} alt="" className="absolute top-[63.9%] left-[-7.5%] size-[35%] max-w-none" />
      <img src={azulCirculo3} alt="" className="absolute top-[69%] left-[56%] size-[18%] max-w-none" />
      <img src={azulIcono} alt="" className="absolute top-1/2 left-1/2 h-[33.8%] w-auto max-w-none -translate-1/2" />
    </div>
  )
}

/**
 * Portada del curso: la imagen subida o, si no hay, la de su categoría. Siempre 16:9.
 * `conAviso` muestra la etiqueta «Imagen por defecto · Categoría» del Figma.
 */
export function PortadaCurso({
  curso,
  className,
  conAviso = false,
  children,
}: {
  curso: Pick<Curso, 'titulo' | 'categoria' | 'portadaUrl'>
  className?: string
  conAviso?: boolean
  children?: ReactNode
}) {
  const fondo = fondoDeCategoria(curso.categoria)
  return (
    <div className={cn('relative aspect-video w-full overflow-hidden bg-brand-night', className)}>
      {curso.portadaUrl ? (
        <img src={curso.portadaUrl} alt={curso.titulo} className="absolute inset-0 size-full object-cover" />
      ) : fondo === 'azul' ? (
        <FondoAzul />
      ) : (
        <img src={FONDOS[fondo]} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      {!curso.portadaUrl && conAviso && (
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-brand-night px-2 py-0.5 text-xs leading-4 font-medium text-white">
          <IconoImagen className="size-3" aria-hidden />
          Imagen por defecto · {curso.categoria}
        </span>
      )}
      {children}
    </div>
  )
}

// ---------- Etiquetas ----------

function Pastilla({ icono: Icono, clase, children }: { icono?: LucideIcon; clase: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap', clase)}>
      {Icono && <Icono className="size-3" aria-hidden />}
      {children}
    </span>
  )
}

const MODALIDAD: Record<Curso['modalidad'], { texto: string; icono: LucideIcon; clase: string }> = {
  PRESENCIAL: { texto: 'Presencial', icono: MapPin, clase: 'bg-brand-soft text-brand' },
  VIRTUAL: { texto: 'Virtual en vivo', icono: Video, clase: 'bg-brand-soft text-brand' },
  HIBRIDA: { texto: 'Híbrido', icono: LayoutGrid, clase: 'bg-gold-soft text-gold-ink' },
  GRABADO: { texto: 'Grabado', icono: PlayCircle, clase: 'bg-surface-3 text-muted' },
}

export function EtiquetaModalidad({ modalidad }: { modalidad: Curso['modalidad'] }) {
  const { texto, icono, clase } = MODALIDAD[modalidad]
  return <Pastilla icono={icono} clase={clase}>{texto}</Pastilla>
}

const SESION: Record<ModalidadSesion, { texto: string; icono: LucideIcon; clase: string }> = {
  PRESENCIAL: { texto: 'Presencial', icono: MapPin, clase: 'bg-brand-soft text-brand' },
  VIRTUAL: { texto: 'Virtual', icono: Video, clase: 'bg-brand-soft text-brand' },
  AMBAS: { texto: 'Presencial y virtual', icono: LayoutGrid, clase: 'bg-gold-soft text-gold-ink' },
}

export function EtiquetaModalidadSesion({ modalidad }: { modalidad: ModalidadSesion }) {
  const { texto, icono, clase } = SESION[modalidad]
  return <Pastilla icono={icono} clase={clase}>{texto}</Pastilla>
}

const COBRO: Record<ModalidadCobro, { texto: string; icono: LucideIcon; clase: string }> = {
  PREVIO: { texto: 'Pago antes del curso', icono: CreditCard, clase: 'bg-warning-soft text-warning' },
  CERTIFICADO: { texto: 'Pagas solo el certificado', icono: Award, clase: 'bg-brand-soft text-brand' },
  GRATUITO: { texto: 'Gratuito', icono: Heart, clase: 'bg-success-soft text-success' },
}
export function EtiquetaCobro({ curso }: { curso: Pick<Curso, 'modalidadCobro' | 'costo'> }) {
  const { texto, icono, clase } = COBRO[modalidadCobroDe(curso)]
  return <Pastilla icono={icono} clase={clase}>{texto}</Pastilla>
}

export function EtiquetaSinCupos() {
  return <Pastilla clase="bg-danger-soft text-danger">Sin cupos</Pastilla>
}

export function EtiquetaCategoria({ categoria }: { categoria: string }) {
  return <Pastilla clase="bg-surface-3 text-muted">{categoria}</Pastilla>
}

// ---------- Precios (SCRUM-190) ----------

/** «S/ 60.00 colegiados · S/ 90.00 general» o «Gratuito», como el pie de las tarjetas. */
export function PreciosCurso({ curso }: { curso: Pick<Curso, 'costo' | 'precioGeneral' | 'modalidadCobro'> }) {
  if (modalidadCobroDe(curso) === 'GRATUITO') return <p className="text-sm leading-5 font-semibold text-success">Gratuito</p>
  const general = precioGeneralDe(curso)
  return (
    <p className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
      <span className="text-sm leading-5 font-semibold text-ink">{soles(curso.costo)}</span>
      <span className="text-xs leading-4 text-muted">colegiados</span>
      {general !== curso.costo && (
        <>
          <span className="text-xs leading-4 text-muted" aria-hidden>·</span>
          <span className="text-sm leading-5 font-semibold text-ink">{soles(general)}</span>
          <span className="text-xs leading-4 text-muted">general</span>
        </>
      )}
    </p>
  )
}

// ---------- Filas «ícono · etiqueta … valor» de las tarjetas ----------

export function FilaDato({ icono: Icono, etiqueta, alerta = false, children }: { icono: LucideIcon; etiqueta: string; alerta?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm leading-5">
      <Icono className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <dt className="shrink-0 text-muted">{etiqueta}</dt>
      <dd className={cn('min-w-0 flex-1 text-right', alerta ? 'text-danger' : 'text-ink')}>{children}</dd>
    </div>
  )
}
