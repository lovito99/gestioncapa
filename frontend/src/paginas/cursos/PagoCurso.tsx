import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { pagos,pagoNecesitaActualizacion } from '@/servicios/pagos'
import { PagoEnLinea } from '../pagos/PagoEnLinea'
import { TransferenciaCurso } from '../pagos/TransferenciaCurso'
import { EstadoCorreosPago } from '../pagos/ArchivoVoucher'

export function PagoCurso({pagoId}:{pagoId:string}) {
  const cache=useQueryClient()
  const consulta=useQuery({queryKey:['pago',pagoId],queryFn:()=>pagos.obtener(pagoId),
    refetchInterval:query=>query.state.data&&pagoNecesitaActualizacion(query.state.data)?3000:false})
  const refrescar=async()=>{
    await consulta.refetch({ throwOnError: true })
    await Promise.all(['curso','historial','participante'].map(clave=>cache.invalidateQueries({queryKey:[clave]})))
  }
  useEffect(()=>{
    if (consulta.data?.estado==='PAGADO') void Promise.all(['curso','historial','participante'].map(clave=>cache.invalidateQueries({queryKey:[clave]})))
  },[cache,consulta.data?.estado])
  if (consulta.isPending) return <Cargando texto="Consultando pago…" />
  if (consulta.isError) return <ErrorCarga mensaje={mensajeDeError(consulta.error,'No pudimos consultar el pago.')} onReintentar={consulta.refetch} />
  const pago=consulta.data
  const importe=`S/ ${((pago.comprobante?.totalCentimos ?? pago.importeCentimos)/100).toFixed(2)}`
  const tarjeta='space-y-3 rounded-xl border border-line bg-white p-4 sm:p-6'
  if (pago.estado==='PAGADO') return <section className={tarjeta} aria-label="Estado de pago">
    <h2 className="font-semibold text-brand">Pago confirmado</h2>
    <p>{importe} · Comprobante interno #{pago.id}.</p>
    <EstadoCorreosPago notificaciones={pago.notificaciones} />
    {pago.incidencias.length>0 && <p role="status">El CPPP debe revisar este pago antes de aplicar cambios a tu reserva.</p>}
    {pago.destinoTransferencia && <details open={pago.transferencias.some(transferencia=>transferencia.estado==='DECLARADO')}>
      <summary className="cursor-pointer text-sm font-semibold">Consultar transferencias o declarar un abono ya realizado</summary>
      <TransferenciaCurso key={pago.id} pago={pago} alActualizar={refrescar} />
    </details>}
  </section>
  if (!pago.exigible) return <section className={tarjeta} aria-label="Estado de pago">
    <h2 className="font-semibold">Reserva no vigente</h2>
    <p>Esta reserva no está vigente. Revisa el curso y sus cupos antes de solicitar una nueva inscripción.</p>
    <EstadoCorreosPago notificaciones={pago.notificaciones} />
    <TransferenciaCurso key={pago.id} pago={pago} alActualizar={refrescar} />
  </section>
  return <section className={tarjeta} aria-label="Pago del curso">
    <h2 className="font-semibold">{pago.concepto==='CONSTANCIA'?'Pago de la constancia':'Pago antes de llevar el curso'}</h2>
    <p className="text-xl font-semibold">{importe}</p>
    <p className="text-sm text-muted">Referencia de pago #{pago.id}. La confirmación aparecerá aquí después de verificarla.</p>
    <PagoEnLinea key={pago.id} pago={pago} alActualizar={refrescar} />
    <p className="text-sm">También puedes pagar en la oficina del CPPP. Indica la referencia #{pago.id}; el administrador registrará la recepción.</p>
    <TransferenciaCurso key={pago.id} pago={pago} alActualizar={refrescar} />
    <EstadoCorreosPago notificaciones={pago.notificaciones} />
  </section>
}
