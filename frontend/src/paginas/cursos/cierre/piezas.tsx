import type { ReactNode } from 'react'
import { Campo } from '@/components/ui/Campo'
import { cn } from '@/lib/cn'
import type { DetalleCurso } from '@/servicios/cursos'
import { ETIQUETA_MODALIDAD, fechasCurso } from '../formatoCurso'

/** «Evaluación formativa en el aula · Presencial · 24 horas lectivas · 16 nov – 7 dic 2026» */
export function ResumenCurso({ curso }: { curso: DetalleCurso }) {
  return (
    <p className="text-sm text-muted">
      {curso.titulo} · {ETIQUETA_MODALIDAD[curso.modalidad]} · {curso.horasLectivas} horas lectivas · {fechasCurso(curso)}
    </p>
  )
}

const th = 'px-5 py-3 text-left text-xs font-medium tracking-[0.6px] text-muted uppercase'

export function Celda({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-5 py-3.5 align-middle text-sm text-ink', className)}>{children}</td>
}

export function Tabla({ cabeceras, children }: { cabeceras: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <table className="w-full min-w-180">
        <thead className="bg-surface-3">
          <tr>
            {cabeceras.map((c) => (
              <th key={c} className={th}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}

/** Filas «etiqueta — valor» de los diálogos (Agremiado, Asistencia, Código). */
export function DatosDialogo({ datos }: { datos: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-1 text-sm">
      {datos.map(([termino, valor]) => (
        <div key={termino} className="flex gap-2">
          <dt className="w-36 shrink-0 text-muted">{termino}</dt>
          <dd className="min-w-0 flex-1 font-medium text-ink">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Motivo obligatorio (2.4b / 2.5b): el error aparece debajo y el borde se pone rojo. */
export function CampoMotivo({
  etiqueta,
  placeholder,
  valor,
  onCambio,
  error,
  autoFocus = true,
}: {
  etiqueta: string
  placeholder: string
  valor: string
  onCambio: (valor: string) => void
  error?: string
  autoFocus?: boolean
}) {
  return (
    <Campo etiqueta={etiqueta} obligatorio error={error}>
      <textarea
        data-autofocus={autoFocus || undefined}
        rows={3}
        maxLength={500}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full resize-y rounded-lg bg-white px-3 py-2.5 text-base text-ink outline-none placeholder:text-muted-3 focus-visible:ring-2 sm:text-sm',
          error ? 'ring-2 ring-danger ring-inset focus-visible:ring-danger' : 'ring-1 ring-muted-3 ring-inset focus-visible:ring-brand-light',
        )}
      />
    </Campo>
  )
}

/** Aviso amarillo de los diálogos: deja claro qué queda registrado o qué cambia. */
export function AvisoDialogo({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">{children}</p>
}
