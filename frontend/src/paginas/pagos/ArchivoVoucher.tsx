import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada } from '@/components/ui/Entrada'
import { esApiError,mensajeDeError } from '@/lib/api'
import { leerVoucher,pagos,type TransferenciaPago,type NotificacionPago } from '@/servicios/pagos'

export function ArchivoVoucher({pagoId,transferencia,alActualizar,puedeReponer=false}:{pagoId:string;transferencia:TransferenciaPago;alActualizar:()=>Promise<void>;puedeReponer?:boolean}) {
  const [error,cambiarError]=useState('')
  const [leyendo,cambiarLeyendo]=useState(false)
  const [clave]=useState(()=>crypto.randomUUID())
  const voucher=transferencia.voucher
  const descargar=useMutation({mutationFn:async()=>{
    const contenido=await pagos.obtenerVoucher(pagoId,transferencia.operacionId)
    const direccion=URL.createObjectURL(contenido)
    try {
      const enlace=document.createElement('a');enlace.href=direccion
      enlace.download=`voucher.${voucher?.tipo==='application/pdf'?'pdf':voucher?.tipo==='image/png'?'png':'jpg'}`;enlace.click()
    } finally {URL.revokeObjectURL(direccion)}
  },onError:fallo=>cambiarError(esApiError(fallo)&&fallo.status===410?'El voucher cumplió su retención y ya no está disponible.':mensajeDeError(fallo,'No pudimos descargar el voucher.'))})
  const reponer=useMutation({mutationFn:(archivo:Parameters<typeof pagos.reponerVoucher>[2]['voucher'])=>pagos.reponerVoucher(pagoId,transferencia.operacionId,{clave,version:voucher!.version,voucher:archivo}),onSuccess:alActualizar,onError:alActualizar})
  if(!voucher) return <p className="text-sm text-muted">Declaración anterior sin archivo adjunto.</p>
  return <div className="space-y-3 text-sm">
    <p>Voucher {voucher.tipo==='application/pdf'?'PDF':'imagen'} · {Math.ceil(voucher.tamano/1024)} KiB · Versión {voucher.version}.</p>
    {voucher.disponible?<Boton variante="secundario" cargando={descargar.isPending} onClick={()=>{cambiarError('');descargar.mutate()}}>Descargar voucher</Boton>:<p role="status">El archivo cumplió su retención y ya no está disponible; el registro del pago se conserva.</p>}
    {puedeReponer&&!voucher.disponible&&transferencia.estado==='DECLARADO'&&<form aria-label="Reponer voucher vencido" className="space-y-3" onSubmit={async e=>{
      e.preventDefault();const datos=new FormData(e.currentTarget);if(leyendo||reponer.isPending) return
      cambiarError('');cambiarLeyendo(true)
      try {await reponer.mutateAsync(await leerVoucher(datos.get('voucher')))}
      catch(fallo) {cambiarError(mensajeDeError(fallo,'No pudimos reponer el archivo.'))}
      finally {cambiarLeyendo(false)}
    }}>
      <Campo etiqueta="Reponer voucher vencido" obligatorio><Entrada type="file" name="voucher" accept="image/jpeg,image/png,application/pdf" required disabled={leyendo||reponer.isPending} className="max-w-full" /></Campo>
      <Boton type="submit" variante="secundario" cargando={leyendo||reponer.isPending}>Reponer archivo en este trámite</Boton>
    </form>}
    {error&&<p role="alert" className="text-danger">{error}</p>}
  </div>
}
const estadosAvisoPago: Record<NotificacionPago['estado'], string> = {
  ENVIADO: 'Correo enviado',
  ENVIANDO: 'Correo en proceso de envío',
  PENDIENTE: 'Correo pendiente de envío',
  FALLIDO: 'No se pudo enviar el correo',
  INCIERTO: 'Envío de correo en revisión',
  OMITIDO: 'Correo omitido',
}

export function EstadoCorreosPago({notificaciones=[]}:{notificaciones?:NotificacionPago[]}) {
  if(!notificaciones.length) return null
  return <section aria-label="Notificaciones por correo" className="space-y-2 text-sm">
    {notificaciones.map(aviso=><p key={aviso.id} role="status">{aviso.tipo==='COMPROBANTE'?'Comprobante de pago':'Resultado de revisión'} · {estadosAvisoPago[aviso.estado]}. Consulta aquí el estado de tu pago.</p>)}
  </section>
}
