import { useId, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Boton } from '@/components/ui/Boton'
import { mensajeDeError } from '@/lib/api'
import { abrirCheckout } from '@/servicios/pagoCheckout'
import { nombreInstrumento, pagos, type OpcionPagoEnLinea, type Pago } from '@/servicios/pagos'
import { soles } from '../cursos/reglasCurso'

const operacionActiva = (operacion: Pago['operaciones'][number]) =>
  ['INICIADO', 'INCIERTO', 'DECLARADO'].includes(operacion.estado)
const esEnLinea = (operacion: Pago['operaciones'][number]) =>
  operacion.medio !== 'TRANSFERENCIA' && operacion.medio !== 'EFECTIVO'

export function EstadoIntentoEnLinea({ pago }: { pago: Pago }) {
  const ultimo = pago.operaciones.find(esEnLinea)
  if (pago.incidencias.length > 0) return <p role="status">El CPPP debe revisar la operación antes de habilitar otro pago.</p>
  if (!ultimo) return null
  if (ultimo.estado === 'RECHAZADO') return <p role="alert" className="text-danger">La pasarela rechazó el pago. Tu pago sigue pendiente.</p>
  if (ultimo.estado === 'CANCELADO') return <p role="status">La pasarela confirmó la cancelación. Tu pago sigue pendiente.</p>
  if (operacionActiva(ultimo)) return <p role="status">Tu operación está en verificación. Consulta su estado antes de realizar otro pago.</p>
  return null
}

const opcionId = (opcion: OpcionPagoEnLinea) => `${opcion.medio}:${opcion.instrumento}`

export function PagoEnLinea({ pago, alActualizar }: { pago: Pago; alActualizar: () => Promise<unknown> }) {
  const grupo = useId()
  const [seleccion, setSeleccion] = useState('')
  const [aviso, setAviso] = useState('')
  const enCurso = useRef(false)
  const opciones = pago.opcionesEnLinea ?? []
  const opcion = opciones.find(item => opcionId(item) === seleccion) ?? opciones[0]
  const pendiente = pago.operaciones.some(operacionActiva) || pago.incidencias.length > 0
  const recuperable = pago.incidencias.length === 0 && !pago.operaciones.some(op => !esEnLinea(op) && operacionActiva(op))
    ? pago.operaciones.find(op => esEnLinea(op) && op.estado === 'INICIADO' && op.sesionRecuperable)
    : undefined
  const iniciar = useMutation({
    mutationFn: (entrada: { opcion: OpcionPagoEnLinea } | { operacionId: string }) =>
      'opcion' in entrada
        ? pagos.iniciar(pago.id, { medio: entrada.opcion.medio, instrumento: entrada.opcion.instrumento,
          cotizacion: entrada.opcion.cotizacion, clave: crypto.randomUUID() })
        : pagos.recuperarSesion(pago.id, entrada.operacionId),
  })

  async function abrir(entrada: { opcion: OpcionPagoEnLinea } | { operacionId: string }) {
    if (enCurso.current) return
    enCurso.current = true
    setAviso('')
    try {
      const resultado = await iniciar.mutateAsync(entrada)
      if (resultado.sesion) {
        await abrirCheckout(resultado.sesion, estado => {
          if (estado === 'cerrado') setAviso('Cerraste el formulario. El pago sigue pendiente hasta verificar el resultado.')
          if (estado === 'comunicacion') setAviso('Se interrumpió la comunicación. El pago sigue pendiente de verificación.')
          void alActualizar().catch(() => setAviso('No pudimos consultar el resultado. Vuelve a consultar el estado.'))
        })
      }
      await alActualizar()
    } catch (error) {
      setAviso(mensajeDeError(error, 'No pudimos completar la operación. Consulta su estado.'))
      await alActualizar().catch(() => undefined)
    } finally {
      enCurso.current = false
    }
  }

  const variosProveedores = new Set(opciones.map(item => item.medio)).size > 1
  return <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-5" aria-label="Pago en línea">
    <EstadoIntentoEnLinea pago={pago} />
    {!pendiente && opcion && <>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Elige cómo pagar</legend>
        {opciones.map(item => <label key={opcionId(item)} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-3 focus-within:outline-2 focus-within:outline-brand">
          <input type="radio" name={grupo} checked={opcionId(item) === opcionId(opcion)}
            onChange={() => setSeleccion(opcionId(item))} disabled={iniciar.isPending} />
          {nombreInstrumento[item.instrumento]}{variosProveedores && ` · ${item.nombre}`}
        </label>)}
      </fieldset>
      <section aria-label="Importes del pago en línea" className="rounded-lg bg-page p-3">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt>Importe base</dt><dd>{soles(opcion.baseCentimos / 100)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Comisión</dt><dd>{soles(opcion.comisionCentimos / 100)}</dd></div>
          <div className="flex justify-between gap-3 font-semibold"><dt>Total a pagar</dt><dd>{soles(opcion.totalCentimos / 100)}</dd></div>
        </dl>
      </section>
      <p className="text-sm text-muted">Completarás el pago en el formulario de {opcion.nombre}.</p>
      <Boton onClick={() => void abrir({ opcion })} cargando={iniciar.isPending} className="h-12">
        Pagar {soles(opcion.totalCentimos / 100)}
      </Boton>
      {pago.medios.entorno === 'sandbox' && <p className="text-sm text-muted">Modo de pruebas. No se hará ningún cargo real.</p>}
    </>}
    {!pendiente && !opcion && <p className="text-sm text-muted">El pago en línea no está disponible.</p>}
    {recuperable && <Boton variante="secundario" disabled={iniciar.isPending}
      onClick={() => void abrir({ operacionId: recuperable.id })}>
      {recuperable.medio === 'IZIPAY' ? 'Reabrir sesión de Izipay' : 'Reabrir sesión de pago'}
    </Boton>}
    {(pendiente || aviso) && <Boton variante="secundario" onClick={() => void alActualizar().catch(() => setAviso('No pudimos consultar el estado.'))}>
      Consultar estado
    </Boton>}
    {aviso && <p role="status" className="text-sm">{aviso}</p>}
  </section>
}
