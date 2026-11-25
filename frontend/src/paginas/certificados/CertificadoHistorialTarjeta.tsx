import { Link } from 'react-router-dom'
import { Boton } from '@/components/ui/Boton'
import { notaVigesimal } from '@/lib/formato'
import { CERTIFICADOS_CURSO } from '@/servicios/cursos'
import type { CertificadoHistorial } from '@/servicios/historial'

export function CertificadoHistorialTarjeta({ certificado, descargando, onDescargar }: {
  certificado: CertificadoHistorial; descargando: boolean; onDescargar: (id: string) => void
}) {
  return <div className="flex flex-col gap-2 rounded-lg bg-brand-soft p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-brand">{CERTIFICADOS_CURSO[certificado.tipo]}</p>
      <p className="text-[13px] text-muted">
        Código {certificado.codigo} · {certificado.horasLectivas} horas lectivas
        {certificado.tipo === 'APROBACION' && certificado.nota != null && <> · Nota: {notaVigesimal(certificado.nota)}</>}
      </p>
    </div>
    <div className="flex flex-col items-center gap-2 sm:flex-row-reverse sm:gap-4">
      <Boton variante="secundario" className="w-full sm:w-auto" disabled={descargando} onClick={() => onDescargar(certificado.id)} aria-label={`Descargar certificado ${certificado.codigo}`}>Descargar certificado</Boton>
      <Link to={`/certificados/${encodeURIComponent(certificado.codigo)}`} className="text-sm font-semibold text-brand underline">Ver certificado</Link>
    </div>
  </div>
}
