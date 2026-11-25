import { notaVigesimal } from '@/lib/formato'
import type { EvaluacionResumen } from '@/servicios/evaluaciones'

export function EstadoRendicion({ evaluacion }: { evaluacion: EvaluacionResumen }) {
  const { estado, notaMinima } = evaluacion
  return <div className="space-y-1">
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink">
      <div className="flex gap-1">
        <dt className="text-muted">Nota mínima:</dt><dd>{notaVigesimal(notaMinima)}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-muted">Intentos usados:</dt><dd>{estado.intentosUsados} de {evaluacion.intentosMaximos}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-muted">Intentos restantes:</dt><dd>{estado.intentosRestantes}</dd>
      </div>
      {estado.mejorNota !== null && <div className="flex gap-1">
        <dt className="text-muted">Mejor nota:</dt><dd>{notaVigesimal(estado.mejorNota)} · {estado.aprobado ? 'Aprobado' : 'No aprobado'}</dd>
      </div>}
    </dl>
    {estado.finalizado ? <p className="text-sm font-semibold text-ink">Resultado final</p> :
      !estado.intentosRestantes && <p className="text-sm font-semibold text-ink">Intentos agotados</p>}
  </div>
}
