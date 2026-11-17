import { Banknote, Check, CircleCheck, CircleX, Clock, Eye, FileText, Search, X, type LucideIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { HojaModal } from '@/components/ui/HojaModal'
import { esApiError, mensajeDeError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { soles } from '@/paginas/cursos/reglasCurso'
import { codigoOrdenDe, MOTIVOS_RECHAZO, pagos, type EstadoBandeja, type ItemBandeja } from '@/servicios/pagos'

const centimos = (c: number) => soles(c / 100)
const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Lima' }).format(new Date(iso))
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())

const FILTROS: { valor: EstadoBandeja | ''; texto: string }[] = [
  { valor: 'EN_REVISION', texto: 'En revisión' },
  { valor: 'CONFIRMADO', texto: 'Confirmados' },
  { valor: 'RECHAZADO', texto: 'Rechazados' },
  { valor: '', texto: 'Todos' },
]

const ESTADOS: Record<EstadoBandeja, { texto: string; icono: LucideIcon; clase: string }> = {
  EN_REVISION: { texto: 'En revisión', icono: Clock, clase: 'bg-warning-soft text-warning' },
  CONFIRMADO: { texto: 'Confirmado', icono: CircleCheck, clase: 'bg-success-soft text-success' },
  RECHAZADO: { texto: 'Rechazado', icono: CircleX, clase: 'bg-danger-soft text-danger' },
}

function EtiquetaEstado({ estado }: { estado: EstadoBandeja }) {
  const { texto, icono: Icono, clase } = ESTADOS[estado]
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap', clase)}>
      <Icono className="size-3" aria-hidden />
      {texto}
    </span>
  )
}

const cursoConConcepto = (i: ItemBandeja) => `${i.cursoTitulo}${i.concepto === 'CONSTANCIA' ? ' (certificado)' : ''}`

/** S3 8.1 / 8.2 · Bandeja de pagos: revisar vouchers, ver pagos y registrar efectivo. */
export function BandejaPagosPagina() {
  const [estado, setEstado] = useState<EstadoBandeja | ''>('EN_REVISION')
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState('')
  const [seleccion, setSeleccion] = useState<ItemBandeja | null>(null)
  const [efectivo, setEfectivo] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setBuscar(texto.trim()), 300)
    return () => window.clearTimeout(id)
  }, [texto])

  const bandeja = useQuery({
    queryKey: ['pagos', 'bandeja', estado, buscar],
    queryFn: () => pagos.bandeja({ ...(estado ? { estado } : {}), ...(buscar ? { buscar } : {}) }),
    refetchInterval: 30000,
  })
  const resumen = bandeja.data?.resumen

  return (
    <div className="px-4 pt-4 pb-8 sm:px-10 sm:pt-10">
      <div className="mx-auto flex max-w-300 flex-col gap-4 sm:gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-xl leading-7 font-bold text-ink sm:text-2xl sm:leading-8">Pagos</h1>
            <p className="text-sm leading-5 text-muted">Revisa vouchers, confirma pagos y registra pagos en efectivo.</p>
          </div>
          <Boton variante="secundario" onClick={() => setEfectivo(true)} className="h-12 w-full text-base text-brand ring-brand sm:h-10 sm:w-auto sm:text-sm">
            <Banknote className="size-5" aria-hidden />
            Registrar pago en efectivo
          </Boton>
        </header>

        {resumen && (
          <div className="hidden gap-4 sm:grid sm:grid-cols-3">
            <TarjetaResumen icono={Clock} color="text-warning" valor={resumen.enRevision} texto="En revisión" />
            <TarjetaResumen icono={CircleCheck} color="text-success" valor={resumen.confirmadosMes} texto="Confirmados este mes" />
            <TarjetaResumen icono={CircleX} color="text-danger" valor={resumen.rechazadosMes} texto="Rechazados este mes" />
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Filtrar pagos" className="flex flex-wrap gap-2">
            {FILTROS.map((f) => {
              const activo = estado === f.valor
              return (
                <button
                  key={f.texto}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setEstado(f.valor)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    activo ? 'bg-brand text-white' : 'bg-white text-ink ring-1 ring-line ring-inset hover:bg-surface-2',
                  )}
                >
                  {f.texto}
                  {f.valor === 'EN_REVISION' && resumen ? ` (${resumen.enRevision})` : ''}
                </button>
              )
            })}
          </div>
          <div className="relative lg:w-57">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
            <Entrada type="search" aria-label="Buscar pagos" placeholder="Buscar por nombre, DNI o código" value={texto} onChange={(e) => setTexto(e.target.value)} className="pl-9.5" />
          </div>
        </div>

        {bandeja.isPending ? (
          <Cargando texto="Cargando pagos…" />
        ) : bandeja.isError ? (
          <ErrorCarga mensaje={mensajeDeError(bandeja.error, 'No pudimos cargar los pagos.')} onReintentar={bandeja.refetch} />
        ) : bandeja.data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-white px-6 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-success-soft"><CircleCheck className="size-7 text-success" aria-hidden /></span>
            <p className="text-base leading-6 font-semibold text-ink">{estado === 'EN_REVISION' && !buscar ? 'No hay vouchers por revisar' : 'No hay pagos que coincidan'}</p>
            <p className="max-w-100 text-sm leading-5 text-muted">
              {estado === 'EN_REVISION' && !buscar ? 'Cuando un agremiado suba un voucher, aparecerá aquí para que lo revises.' : 'Cambia el filtro o la búsqueda.'}
            </p>
          </div>
        ) : (
          <>
            <TablaPagos items={bandeja.data.items} alAbrir={setSeleccion} />
            <ul className="flex flex-col gap-3 lg:hidden">
              {bandeja.data.items.map((i) => (
                <li key={`${i.pagoId}-${i.operacionId}`}><TarjetaPago item={i} alAbrir={() => setSeleccion(i)} /></li>
              ))}
            </ul>
          </>
        )}
      </div>

      {seleccion && <RevisarPago item={seleccion} onCerrar={() => setSeleccion(null)} />}
      <RegistrarEfectivo abierto={efectivo} onCerrar={() => setEfectivo(false)} />
    </div>
  )
}

function TarjetaResumen({ icono: Icono, color, valor, texto }: { icono: LucideIcon; color: string; valor: number; texto: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-5">
      <Icono className={cn('size-6 shrink-0', color)} aria-hidden />
      <div>
        <p className={cn('font-serif text-2xl leading-8 font-bold', color)}>{valor}</p>
        <p className="text-sm leading-5 text-muted">{texto}</p>
      </div>
    </div>
  )
}

function BotonAccion({ item, alAbrir, ancho = false }: { item: ItemBandeja; alAbrir: () => void; ancho?: boolean }) {
  if (item.estado === 'EN_REVISION') {
    return <Boton onClick={alAbrir} className={cn(ancho && 'h-12 w-full text-base')}>{ancho ? 'Revisar voucher' : 'Revisar'}</Boton>
  }
  return (
    <button type="button" onClick={alAbrir} aria-label={`Ver pago de ${item.agremiado.nombre}`} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand">
      <Eye className="size-4.5" aria-hidden />
      Ver
    </button>
  )
}

const th = 'px-3 py-3 text-left text-xs leading-4 font-medium text-muted first:pl-5'
const td = 'px-3 py-3.5 text-sm leading-5 first:pl-5'

function TablaPagos({ items, alAbrir }: { items: ItemBandeja[]; alAbrir: (i: ItemBandeja) => void }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-line bg-white lg:block">
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            <th className={th}>Agremiado</th><th className={th}>Curso</th><th className={th}>Monto</th><th className={th}>Medio</th>
            <th className={th}>N.° operación</th><th className={th}>Fecha</th><th className={th}>Estado</th><th className={th}><span className="sr-only">Acción</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((i) => (
            <tr key={`${i.pagoId}-${i.operacionId}`}>
              <td className={cn(td, 'font-semibold text-ink')}>{i.agremiado.nombre}</td>
              <td className={cn(td, 'text-ink')}>{cursoConConcepto(i)}</td>
              <td className={cn(td, 'font-semibold whitespace-nowrap text-ink')}>{centimos(i.importeCentimos)}</td>
              <td className={cn(td, 'text-muted')}>{i.detalleMedio}</td>
              <td className={cn(td, 'text-muted')}>{i.referencia ?? '—'}</td>
              <td className={cn(td, 'whitespace-nowrap text-muted')}>{fechaCorta(i.fecha)}</td>
              <td className={td}><EtiquetaEstado estado={i.estado} /></td>
              <td className={cn(td, 'pr-5 text-right')}><BotonAccion item={i} alAbrir={() => alAbrir(i)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TarjetaPago({ item, alAbrir }: { item: ItemBandeja; alAbrir: () => void }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-semibold wrap-anywhere text-ink">{item.agremiado.nombre}</p>
          <p className="text-xs leading-4 text-muted">{cursoConConcepto(item)}</p>
        </div>
        <EtiquetaEstado estado={item.estado} />
      </div>
      <dl className="flex flex-col gap-1.5 text-sm leading-5">
        {[['Monto', centimos(item.importeCentimos)], ['Medio', item.detalleMedio], ['N.° operación', item.referencia ?? '—'], ['Fecha', fechaCorta(item.fecha)]].map(([e, v]) => (
          <div key={e} className="flex gap-2"><dt className="text-muted">{e}</dt><dd className={cn('min-w-0 flex-1 text-right text-ink', e === 'Monto' && 'font-semibold')}>{v}</dd></div>
        ))}
      </dl>
      {item.estado === 'EN_REVISION' ? <BotonAccion item={item} alAbrir={alAbrir} ancho /> : <div className="self-end"><BotonAccion item={item} alAbrir={alAbrir} /></div>}
    </article>
  )
}

// ---------- Revisar voucher (8.1a – 8.1c) ----------

function VistaVoucher({ pagoId, operacionId, nombre }: { pagoId: string; operacionId: string; nombre?: string }) {
  // Como URL de datos: no hay que revocarla y sobrevive al doble montaje del modo estricto
  const voucher = useQuery({
    queryKey: ['pago', pagoId, 'voucher', operacionId],
    queryFn: async () => {
      const archivo = await pagos.obtenerVoucher(pagoId, operacionId)
      const url = await new Promise<string>((resolver, rechazar) => {
        const lector = new FileReader()
        lector.onload = () => resolver(String(lector.result))
        lector.onerror = () => rechazar(new Error('No pudimos leer el voucher.'))
        lector.readAsDataURL(archivo)
      })
      return { tipo: archivo.type, url }
    },
    staleTime: Infinity,
  })
  const url = voucher.data?.url
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
      {voucher.isPending ? <Cargando texto="Cargando voucher…" /> : voucher.isError ? (
        <p className="py-8 text-center text-sm text-muted">{mensajeDeError(voucher.error, 'El voucher ya no está disponible.')}</p>
      ) : voucher.data.tipo === 'application/pdf' ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 py-8 text-sm font-semibold text-brand underline">
          <FileText className="size-8" aria-hidden />Abrir voucher en PDF
        </a>
      ) : (
        <img src={url} alt="Voucher subido por el agremiado" className="max-h-80 w-full rounded-md bg-page object-contain" />
      )}
      <p className="text-center text-xs leading-4 text-muted">Imagen subida por el agremiado{nombre ? ` · ${nombre}` : ''}</p>
    </div>
  )
}

function Comparacion({ etiqueta, valor, ok = true }: { etiqueta: string; valor: string; ok?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-5">
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <CircleX className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />}
      <span className="shrink-0 text-muted">{etiqueta}</span>
      <span className={cn('min-w-0 flex-1 text-right font-semibold wrap-anywhere', ok ? 'text-ink' : 'text-danger')}>{valor}</span>
    </li>
  )
}

function RevisarPago({ item, onCerrar }: { item: ItemBandeja; onCerrar: () => void }) {
  const cache = useQueryClient()
  const pago = useQuery({ queryKey: ['pago', item.pagoId], queryFn: () => pagos.obtener(item.pagoId) })
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [errorMotivo, setErrorMotivo] = useState('')
  const transferencia = pago.data?.transferencias.find((t) => t.operacionId === item.operacionId)
  const revisar = useMutation({
    mutationFn: (entrada: Parameters<typeof pagos.revisarTransferencia>[2]) => pagos.revisarTransferencia(item.pagoId, item.operacionId!, entrada),
    onSuccess: async (_r, entrada) => {
      await Promise.all([cache.invalidateQueries({ queryKey: ['pagos'] }), cache.invalidateQueries({ queryKey: ['pago', item.pagoId] })])
      toast.success(entrada.decision === 'CONFIRMAR' ? `Pago de ${item.agremiado.nombre} aprobado. Se envió el comprobante.` : `Pago rechazado. ${item.agremiado.nombre} recibirá el motivo por correo.`)
      onCerrar()
    },
  })
  const subtitulo = [item.agremiado.nombre, item.agremiado.dniParcial ? `DNI ${item.agremiado.dniParcial}` : null, item.codigoOrden].filter(Boolean).join(' · ')
  const enRevision = item.estado === 'EN_REVISION' && transferencia?.estado === 'DECLARADO'

  const rechazar = (e: FormEvent) => {
    e.preventDefault()
    if (!motivo) return setErrorMotivo('Selecciona un motivo para poder rechazar.')
    setErrorMotivo('')
    revisar.mutate({ decision: 'RECHAZAR', motivo: [motivo, detalle.trim()].filter(Boolean).join('. ') })
  }

  return (
    <HojaModal abierto onCerrar={onCerrar} titulo={enRevision ? 'Revisar voucher' : 'Detalle del pago'} subtitulo={subtitulo} ancho={rechazando ? 'normal' : 'amplio'}>
      {pago.isPending ? <Cargando texto="Cargando pago…" /> : pago.isError ? (
        <ErrorCarga mensaje={mensajeDeError(pago.error, 'No pudimos cargar el pago.')} onReintentar={pago.refetch} />
      ) : rechazando ? (
        <form noValidate onSubmit={rechazar} className="flex flex-col gap-4">
          <Aviso tipo="advertencia" titulo="El agremiado recibirá el motivo por correo">Su inscripción seguirá pendiente y podrá subir otro voucher.</Aviso>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="motivo-rechazo" className="flex items-center gap-1 text-sm leading-5 font-semibold text-ink">Motivo del rechazo <span aria-hidden className="font-bold text-required">*</span></label>
            <Selector id="motivo-rechazo" value={motivo} estado={errorMotivo ? 'error' : 'normal'} onChange={(e) => { setMotivo(e.target.value); setErrorMotivo('') }}>
              <option value="">Selecciona un motivo</option>
              {MOTIVOS_RECHAZO.map((m) => <option key={m} value={m}>{m}</option>)}
            </Selector>
            {errorMotivo && <p role="alert" className="text-sm leading-5 text-danger">{errorMotivo}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="detalle-rechazo" className="text-sm leading-5"><span className="font-semibold text-ink">Detalle para el agremiado</span> <span className="text-muted">(opcional)</span></label>
            <textarea id="detalle-rechazo" value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={400} rows={3} placeholder="Explica qué debe corregir"
              className="w-full rounded-lg bg-white px-3 py-2.5 text-base text-ink ring-1 ring-muted-3 outline-none ring-inset placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand-light sm:text-sm" />
          </div>
          {revisar.isError && <Aviso tipo="error" titulo="No pudimos rechazar el pago">{mensajeDeError(revisar.error, 'Intenta de nuevo.')}</Aviso>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Boton variante="secundario" onClick={() => setRechazando(false)} className="bg-transparent text-brand ring-0 hover:bg-brand-soft">Volver</Boton>
            <Boton type="submit" variante="peligro" cargando={revisar.isPending}>Rechazar pago</Boton>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start">
          {transferencia ? <VistaVoucher pagoId={item.pagoId} operacionId={transferencia.operacionId} nombre={transferencia.voucher?.hash} /> : (
            <div className="flex flex-col gap-2 rounded-xl border border-line p-4 text-sm leading-5">
              <p className="font-semibold text-ink">{item.detalleMedio}</p>
              <p className="text-muted">{item.medio === 'EFECTIVO' ? 'Pago registrado en la caja del CPPP.' : 'Pago confirmado por la pasarela en línea.'}</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <section className="flex flex-col gap-2.5 rounded-xl border border-line p-4">
              <h3 className="text-base leading-6 font-semibold text-ink">{enRevision ? 'Compara con lo esperado' : 'Datos del pago'}</h3>
              <ul className="flex flex-col gap-2">
                <Comparacion etiqueta="Monto esperado" valor={centimos(pago.data.importeCentimos)} />
                <Comparacion etiqueta="Código de orden" valor={codigoOrdenDe(pago.data)} />
                {transferencia && <Comparacion etiqueta="N.° de operación" valor={`${transferencia.referencia} · ${transferencia.operacionRepetida ? 'repetido' : 'no repetido'}`} ok={!transferencia.operacionRepetida} />}
                {transferencia && <Comparacion etiqueta="Cuenta destino" valor={`CPPP ${transferencia.banco} · ${transferencia.cuenta}`} />}
                {!enRevision && <Comparacion etiqueta="Estado" valor={ESTADOS[item.estado].texto} ok={item.estado !== 'RECHAZADO'} />}
              </ul>
              {transferencia?.motivoRechazo && <p className="text-sm leading-5 text-danger">Motivo: {transferencia.motivoRechazo}</p>}
            </section>
            {enRevision && (
              <>
                <Aviso titulo="Al aprobar">
                  {pago.data.concepto === 'CONSTANCIA' ? 'Se libera la constancia' : 'Se confirma la inscripción (pago previo)'} y se envía el comprobante por correo. El archivo del voucher se elimina a los 3 meses; el registro del pago se conserva (Ley 29733).
                </Aviso>
                {revisar.isError && <Aviso tipo="error" titulo="No pudimos guardar la revisión">{mensajeDeError(revisar.error, 'Consulta el estado antes de reintentar.')}</Aviso>}
                <Boton
                  cargando={revisar.isPending}
                  onClick={() => revisar.mutate({ decision: 'CONFIRMAR', verificado: true, importeCentimos: pago.data.importeCentimos, moneda: 'PEN', referencia: transferencia!.referencia, fechaOperacion: transferencia!.fechaOperacion })}
                  className="h-10 w-full bg-success hover:bg-success/90"
                >
                  <Check className="size-4.5" aria-hidden />Aprobar pago
                </Boton>
                <Boton variante="secundario" onClick={() => setRechazando(true)} disabled={revisar.isPending} className="w-full text-brand ring-brand">
                  <X className="size-4.5" aria-hidden />Rechazar
                </Boton>
              </>
            )}
          </div>
        </div>
      )}
    </HojaModal>
  )
}

// ---------- Registrar pago en efectivo (8.1d) ----------

function Campo({ id, etiqueta, children, error }: { id: string; etiqueta: string; children: ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1 text-sm leading-5 font-semibold text-ink">{etiqueta} <span aria-hidden className="font-bold text-required">*</span></label>
      {children}
      {error && <p role="alert" className="text-sm leading-5 text-danger">{error}</p>}
    </div>
  )
}

function RegistrarEfectivo({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const cache = useQueryClient()
  const [dni, setDni] = useState('')
  const [pagoElegido, setPagoId] = useState('')
  const [montoEscrito, setMonto] = useState<string | null>(null)
  const [fecha, setFecha] = useState(hoy)
  const [recibo, setRecibo] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const pendientes = useQuery({ queryKey: ['pagos', 'pendientes', dni], queryFn: () => pagos.pendientesPorDni(dni), enabled: abierto && /^\d{8}$/.test(dni), retry: false })
  const lista = pendientes.data?.pagos ?? []
  const elegido = lista.find((p) => p.pagoId === pagoElegido) ?? lista[0]
  const pagoId = elegido?.pagoId ?? ''
  const monto = montoEscrito ?? (elegido ? (elegido.importeCentimos / 100).toFixed(2) : '')
  const cerrar = () => {
    setDni(''); setPagoId(''); setMonto(null); setRecibo(''); setErrores({}); setFecha(hoy())
    onCerrar()
  }

  const registrar = useMutation({
    mutationFn: () => pagos.efectivo(pagoId, { referencia: recibo.trim(), importeCentimos: Math.round(Number(monto) * 100), fechaRecepcion: fecha }),
    onSuccess: async () => {
      await Promise.all([cache.invalidateQueries({ queryKey: ['pagos'] }), cache.invalidateQueries({ queryKey: ['pago'] })])
      toast.success(`Pago en efectivo de ${pendientes.data?.agremiado.nombre} registrado.`)
      cerrar()
    },
    onError: (e) => { if (esApiError(e) && e.fields.importe) setErrores({ monto: e.fields.importe }) },
  })
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const nuevos: Record<string, string> = {}
    if (!elegido) nuevos.curso = 'Busca al agremiado y elige el curso que paga.'
    if (!/^\d+(\.\d{1,2})?$/.test(monto) || Number(monto) <= 0) nuevos.monto = 'Ingresa el monto recibido.'
    else if (elegido && Math.round(Number(monto) * 100) !== elegido.importeCentimos) nuevos.monto = `El monto debe ser ${centimos(elegido.importeCentimos)}.`
    if (!fecha) nuevos.fecha = 'Ingresa la fecha de pago.'
    if (recibo.trim().length < 1) nuevos.recibo = 'Ingresa el número de recibo de caja.'
    setErrores(nuevos)
    if (Object.keys(nuevos).length === 0) registrar.mutate()
  }

  return (
    <HojaModal abierto={abierto} onCerrar={cerrar} titulo="Registrar pago en efectivo" subtitulo="Usa esta opción cuando el agremiado pague en la caja del CPPP.">
      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        <Campo id="efectivo-dni" etiqueta="DNI del agremiado">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
            <Entrada id="efectivo-dni" value={dni} inputMode="numeric" maxLength={8} autoComplete="off" onChange={(e) => { setDni(e.target.value.replace(/\D/g, '').slice(0, 8)); setPagoId(''); setMonto(null) }} className="pl-9.5" />
          </div>
        </Campo>
        {pendientes.isFetching && <p role="status" className="text-sm text-muted">Buscando…</p>}
        {pendientes.isError && <Aviso tipo="error" titulo="Sin resultados">{mensajeDeError(pendientes.error, 'No encontramos a ese agremiado.')}</Aviso>}
        {pendientes.data && (
          <p role="status" className={cn('flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm leading-5 font-semibold', pendientes.data.pagos.length ? 'bg-success-soft text-success' : 'bg-surface-2 text-muted')}>
            <CircleCheck className="size-4.5 shrink-0" aria-hidden />
            {pendientes.data.agremiado.nombre} · {pendientes.data.pagos.length === 1 ? '1 pago pendiente' : `${pendientes.data.pagos.length} pagos pendientes`}
          </p>
        )}
        <Campo id="efectivo-curso" etiqueta="Curso" error={errores.curso}>
          <Selector id="efectivo-curso" value={pagoId} disabled={!pendientes.data?.pagos.length} estado={errores.curso ? 'error' : 'normal'}
            onChange={(e) => { setPagoId(e.target.value); setMonto(null) }}>
            {!pendientes.data?.pagos.length && <option value="">Busca primero al agremiado</option>}
            {pendientes.data?.pagos.map((p) => <option key={p.pagoId} value={p.pagoId}>{p.cursoTitulo}{p.concepto === 'CONSTANCIA' ? ' (certificado)' : ''} · {p.codigoOrden}</option>)}
          </Selector>
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="efectivo-monto" etiqueta="Monto recibido" error={errores.monto}>
            <div className={cn('flex h-12 items-center gap-2 rounded-lg bg-white px-3 sm:h-10', errores.monto ? 'ring-2 ring-danger ring-inset' : 'ring-1 ring-muted-3 ring-inset')}>
              <span className="text-sm text-muted" aria-hidden>S/</span>
              <input id="efectivo-monto" value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none sm:text-sm" />
            </div>
          </Campo>
          <Campo id="efectivo-fecha" etiqueta="Fecha de pago" error={errores.fecha}>
            <Entrada id="efectivo-fecha" type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} estado={errores.fecha ? 'error' : 'normal'} />
          </Campo>
        </div>
        <Campo id="efectivo-recibo" etiqueta="N.° de recibo de caja" error={errores.recibo}>
          <Entrada id="efectivo-recibo" value={recibo} maxLength={100} autoComplete="off" onChange={(e) => setRecibo(e.target.value)} estado={errores.recibo ? 'error' : 'normal'} />
        </Campo>
        <p className="text-xs leading-4 text-muted">Quedará registrado en la auditoría con tu nombre, fecha y hora.</p>
        {registrar.isError && !errores.monto && <Aviso tipo="error" titulo="No pudimos registrar el pago">{mensajeDeError(registrar.error, 'Intenta de nuevo.')}</Aviso>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Boton variante="secundario" onClick={cerrar} className="bg-transparent text-brand ring-0 hover:bg-brand-soft">Cancelar</Boton>
          <Boton type="submit" cargando={registrar.isPending}>Registrar pago</Boton>
        </div>
      </form>
    </HojaModal>
  )
}
