import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Alerta } from '@/components/ui/Alerta'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { guardarDescarga, historiales, useHistorial } from '@/servicios/historial'
import { CertificadoHistorialTarjeta } from './CertificadoHistorialTarjeta'

const tarjeta = 'space-y-2 rounded-xl border border-line bg-white p-4'

export function MisCertificadosPagina() {
  const { usuario } = useAuth()
  const id = usuario?.id ?? ''
  const historial = useHistorial(id, usuario?.id)
  const descarga = useMutation({
    mutationFn: (certificadoId: string) => historiales.certificado(id, certificadoId),
    onSuccess: archivo => guardarDescarga(archivo, 'certificado.pdf'),
  })
  const cursos = historial.isSuccess ? historial.data.cursos : []
  const vigentes = cursos.flatMap(curso => curso.certificados.filter(certificado => certificado.estado === 'VALIDO')
    .map(certificado => ({ curso, certificado })))
  const pendientes = cursos.filter(curso => curso.estadoEntrega === 'RETENIDA')

  return <div className="mx-auto flex max-w-160 flex-col gap-4 px-4 pt-6 pb-8 wrap-anywhere sm:max-w-200 sm:pt-10">
    <h1 className="text-[22px] font-bold text-ink">Mis certificados</h1>
    {historial.isPending && <Cargando texto="Cargando tus certificados…" />}
    {historial.isError && <ErrorCarga mensaje={mensajeDeError(historial.error, 'No pudimos cargar tus certificados.')} onReintentar={historial.refetch} />}
    {descarga.isError && <Alerta tipo="error">{mensajeDeError(descarga.error, 'No pudimos descargar el certificado.')}</Alerta>}
    {historial.isSuccess && vigentes.length === 0 && pendientes.length === 0 && <p className={`${tarjeta} text-sm text-muted`}>Aún no tienes certificados disponibles.</p>}
    {vigentes.length > 0 && <ul className="flex flex-col gap-4">
      {vigentes.map(({ curso, certificado }) => <li key={certificado.id} className={tarjeta}>
        <h2 className="text-base font-semibold text-ink">{curso.titulo}</h2>
        <CertificadoHistorialTarjeta certificado={certificado} descargando={descarga.isPending} onDescargar={descarga.mutate} />
      </li>)}
    </ul>}
    {pendientes.length > 0 && <section aria-labelledby="certificados-pendientes" className="space-y-3">
      <h2 id="certificados-pendientes" className="text-lg font-bold text-ink">Pendientes de entrega</h2>
      <ul className="flex flex-col gap-3">
        {pendientes.map(curso => <li key={curso.id} className={tarjeta}>
          <h3 className="text-base font-semibold text-ink">{curso.titulo}</h3>
          <p className="text-sm text-muted">{curso.estadoFinanciero === 'PAGADO' ? 'Pago confirmado. Documento en preparación.' : 'Documento retenido hasta confirmar el pago.'}</p>
          <Link to={`/cursos/${curso.id}`} className="text-sm font-semibold text-brand underline">Consultar curso y pago</Link>
        </li>)}
      </ul>
    </section>}
  </div>
}
