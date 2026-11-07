import type { ReactNode } from 'react'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { cn } from '@/lib/cn'
import type { Curso } from '@/servicios/cursos'
import { ETIQUETA_MODALIDAD } from './formatoCurso'

export function EtiquetasCurso({ curso }: { curso: Pick<Curso, 'modalidad' | 'cuposDisponibles' | 'inscrito'> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Etiqueta tono="marca">{ETIQUETA_MODALIDAD[curso.modalidad]}</Etiqueta>
      {curso.cuposDisponibles === 0 && <Etiqueta tono="peligro">Sin cupos</Etiqueta>}
      {curso.inscrito && <Etiqueta tono="exito">Inscrito(a)</Etiqueta>}
    </div>
  )
}

/** Fila «etiqueta — valor» con la etiqueta a 110 px, como en las tarjetas del Figma. */
export function DatoCurso({ termino, alerta = false, children }: { termino: string; alerta?: boolean; children: ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-27.5 shrink-0 text-muted">{termino}</dt>
      <dd className={cn('min-w-0 flex-1 font-medium', alerta ? 'text-danger' : 'text-ink')}>{children}</dd>
    </div>
  )
}
