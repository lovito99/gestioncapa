import { Check, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { HojaModal } from '@/components/ui/HojaModal'
import { useAuth } from '@/auth/useAuth'
import type { DetalleCurso } from '@/servicios/cursos'
import { fechasCurso } from './formatoCurso'
import { modalidadCobroDe, precioPara, soles, textoPlazo } from './reglasCurso'

/** S3 4.1a / 4.1b · Confirma tu inscripción: quién se inscribe, cuánto paga y qué pasa después. */
export function ConfirmarInscripcion({
  curso,
  abierto,
  onCerrar,
  onConfirmar,
  confirmando,
  error,
}: {
  curso: DetalleCurso
  abierto: boolean
  onCerrar: () => void
  onConfirmar: () => void
  confirmando: boolean
  error?: string
}) {
  const { usuario } = useAuth()
  const [acepta, setAcepta] = useState(false)
  const cobro = modalidadCobroDe(curso)
  const precio = precioPara(curso)
  const colegiado = precio.tipo === 'COLEGIADO'
  const plazo = curso.plazoPagoMinutos ? textoPlazo(curso.plazoPagoMinutos) : null

  const pasos =
    cobro === 'PREVIO'
      ? [
          `Tu inscripción queda «pendiente de pago»${plazo ? ` por ${plazo}` : ''}.`,
          'Paga en línea, por transferencia BCP o en efectivo.',
          'Cuando se confirme el pago, accedes al curso.',
        ]
      : cobro === 'CERTIFICADO'
        ? ['Accedes al curso desde ahora, sin pagar.', 'Al terminar, si cumples los requisitos, pagas la constancia.', 'Cuando se confirme el pago, recibes tu constancia.']
        : ['Accedes al curso desde ahora.', 'Si cumples los requisitos, recibes tu constancia sin costo.']

  return (
    <HojaModal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Confirma tu inscripción"
      subtitulo={`${curso.titulo} · ${fechasCurso(curso)}`}
    >
      <div className="flex items-center gap-3 rounded-lg bg-page p-3">
        <UserRound className="size-5 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-semibold wrap-anywhere text-ink">{usuario?.nombre}</p>
          <p className="text-xs leading-4 text-muted">
            {[precio.dniParcial ? `DNI ${precio.dniParcial}` : null, colegiado ? 'Colegiado(a) habilitado(a)' : 'Docente externo'].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {cobro !== 'GRATUITO' && (
        <div className="flex flex-col gap-1 rounded-lg border-2 border-brand bg-brand-soft p-4">
          <p className="text-xs leading-4 font-semibold text-brand">
            {cobro === 'CERTIFICADO' ? 'La constancia te costará' : colegiado ? 'Pagarás el precio de colegiado' : 'Pagarás el precio general'}
          </p>
          <p className="flex flex-wrap items-end gap-x-2">
            <span className="font-serif text-[28px] leading-9 font-bold text-brand-ink">{soles(precio.importe)}</span>
            {precio.otro !== precio.importe && (
              <span className="text-sm leading-5 text-muted">({colegiado ? 'general' : 'colegiados'}: {soles(precio.otro)})</span>
            )}
          </p>
        </div>
      )}

      {!precio.enPadron && (
        <Aviso titulo="Tu DNI no figura en el padrón de colegiados">
          Por eso se aplica el precio general. Si eres colegiado del CPPP, actualiza tus datos en coordinación antes de pagar.
        </Aviso>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm leading-5 font-semibold text-ink">¿Qué pasa después?</p>
        <ul className="flex flex-col gap-2">
          {pasos.map((paso) => (
            <li key={paso} className="flex items-start gap-2 text-sm leading-5 text-ink">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              {paso}
            </li>
          ))}
        </ul>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm leading-5 text-ink">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="size-5 shrink-0 accent-brand" />
        Acepto las condiciones del curso y la política de privacidad (Ley 29733).
      </label>

      {error && <Aviso tipo="error" titulo="No pudimos inscribirte">{error}</Aviso>}

      <div className="flex flex-col gap-3">
        <Boton onClick={onConfirmar} disabled={!acepta} cargando={confirmando} className="h-12 w-full text-base">
          {cobro === 'PREVIO' ? 'Confirmar e ir a pagar' : 'Confirmar inscripción'}
        </Boton>
        <Boton variante="secundario" onClick={onCerrar} className="h-12 w-full bg-transparent text-base text-brand ring-0 hover:bg-brand-soft">
          Cancelar
        </Boton>
      </div>
    </HojaModal>
  )
}
