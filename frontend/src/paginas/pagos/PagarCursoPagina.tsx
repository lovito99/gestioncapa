import { Banknote, BookOpen, CircleCheck, CircleX, Clock, Copy, CreditCard, Download, FileText, Landmark, Lock, RefreshCw, Smartphone, Upload, X, type LucideIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError, esApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { cursos, type DetalleCurso } from '@/servicios/cursos'
import { guardarDescarga } from '@/servicios/historial'
import { abrirIzipay } from '@/servicios/izipay'
import { codigoOrdenDe, comisionDe, leerVoucher, pagoNecesitaActualizacion, pagos, type Pago } from '@/servicios/pagos'
import { ETIQUETA_MODALIDAD, fechasCurso } from '@/paginas/cursos/formatoCurso'
import { PortadaCurso } from '@/paginas/cursos/piezasCurso'
import { soles } from '@/paginas/cursos/reglasCurso'

type Paso = 'elegir' | 'en-linea' | 'transferencia' | 'efectivo' | 'rechazado'
const centimos = (c: number) => soles(c / 100)
const tarjeta = 'flex w-full flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:p-5'

/** «mar. 19 nov., 11:59 p. m.» en hora de Lima, como el plazo del Figma S3 7.1. */
const fechaHora = (iso: string, conAnio = false) =>
  new Intl.DateTimeFormat('es-PE', { weekday: conAnio ? undefined : 'short', day: 'numeric', month: 'short', year: conAnio ? 'numeric' : undefined, hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Lima' }).format(new Date(iso))

/**
 * S3 7.1 / 7.2 · Pago del agremiado: elegir forma de pago, pagar en línea (con comisión),
 * transferir al BCP y subir el voucher, o pagar en efectivo en la sede.
 */
export function PagarCursoPagina() {
  const { id = '' } = useParams()
  const curso = useQuery({ queryKey: ['curso', id], queryFn: () => cursos.obtener(id) })
  const pagoId = curso.data?.miInscripcion?.pagoId ?? ''
  const pago = useQuery({
    queryKey: ['pago', pagoId],
    queryFn: () => pagos.obtener(pagoId),
    enabled: !!pagoId,
    refetchInterval: (q) => (q.state.data && pagoNecesitaActualizacion(q.state.data) ? 5000 : false),
  })
  const [paso, setPaso] = useState<Paso>('elegir')

  if (curso.isPending || (pagoId && pago.isPending)) return <Contenedor><Cargando texto="Cargando tu pago…" /></Contenedor>
  if (curso.isError) return <Contenedor><ErrorCarga mensaje={mensajeDeError(curso.error, 'No pudimos cargar el curso.')} onReintentar={curso.refetch} /></Contenedor>
  if (!pagoId) {
    return (
      <Contenedor>
        <EnlaceVolver to={`/cursos/${id}`}>Volver al curso</EnlaceVolver>
        <Aviso titulo="No tienes pagos pendientes en este curso">Si ya te inscribiste y el curso es gratuito o se paga solo el certificado, no necesitas pagar ahora.</Aviso>
      </Contenedor>
    )
  }
  if (pago.isError) return <Contenedor><ErrorCarga mensaje={mensajeDeError(pago.error, 'No pudimos cargar tu pago.')} onReintentar={pago.refetch} /></Contenedor>

  const p = pago.data!
  const c = curso.data
  const enRevision = p.estado === 'PENDIENTE' && p.transferencias.some((t) => t.estado === 'DECLARADO' || t.estado === 'INICIADO')
  if (p.estado === 'PAGADO') return <Contenedor><PagoAprobado pago={p} cursoId={id} /></Contenedor>
  if (enRevision) return <Contenedor><PagoEnRevision pago={p} /></Contenedor>
  if (paso === 'rechazado') return <Contenedor><PagoRechazado pago={p} alReintentar={() => setPaso('en-linea')} alOtroMedio={() => setPaso('elegir')} /></Contenedor>

  const rechazada = p.transferencias.findLast((t) => t.estado === 'RECHAZADO')
  const encabezados: Record<Exclude<Paso, 'rechazado'>, { titulo: string; texto: string }> = {
    elegir: { titulo: '¿Cómo quieres pagar?', texto: 'Elige una opción. Tu cupo está reservado hasta la fecha límite.' },
    'en-linea': { titulo: 'Pagar en línea', texto: 'Con tarjeta o Yape. Tu pago se confirma al instante.' },
    transferencia: { titulo: 'Pago por transferencia BCP', texto: 'Sin comisión. Transfiere desde tu banco o app y sube tu voucher.' },
    efectivo: { titulo: 'Pago en efectivo', texto: 'Sin comisión. Paga en la caja del CPPP con tu código de orden.' },
  }
  const { titulo, texto } = encabezados[paso]

  return (
    <Contenedor ancho>
      {paso === 'elegir' ? <EnlaceVolver to="/participante/cursos">Volver a mis cursos</EnlaceVolver> : (
        <button type="button" onClick={() => setPaso('elegir')} className="inline-flex items-center gap-1.5 self-start rounded text-sm font-semibold text-brand hover:underline">
          <span aria-hidden>←</span> Cambiar forma de pago
        </button>
      )}
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-xl leading-7 font-bold text-ink sm:text-2xl sm:leading-8">{titulo}</h1>
        <p className="text-sm leading-5 text-muted">{texto}</p>
      </header>
      {rechazada && paso !== 'en-linea' && (
        <Aviso tipo="error" titulo="Tu voucher anterior fue rechazado">{rechazada.motivoRechazo ?? 'Revisa los datos y sube otro voucher.'}</Aviso>
      )}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_23.75rem] lg:items-start lg:gap-6">
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
          {paso === 'elegir' && <ElegirMedio pago={p} alContinuar={setPaso} />}
          {paso === 'en-linea' && <PagarEnLinea pago={p} alRechazo={() => setPaso('rechazado')} />}
          {paso === 'transferencia' && <PagarTransferencia pago={p} />}
          {paso === 'efectivo' && <PagarEfectivo pago={p} />}
        </div>
        <div className="order-1 lg:order-2 lg:sticky lg:top-32">
          <ResumenPago pago={p} curso={c} conComision={paso === 'en-linea'} />
        </div>
      </div>
    </Contenedor>
  )
}

function Contenedor({ children, ancho = false }: { children: ReactNode; ancho?: boolean }) {
  return (
    <div className="px-4 pt-4 pb-8 sm:px-10 sm:pt-10">
      <div className={cn('mx-auto flex w-full flex-col gap-4', ancho ? 'max-w-250' : 'max-w-120')}>{children}</div>
    </div>
  )
}

function Fila({ etiqueta, children, fuerte = false }: { etiqueta: string; children: ReactNode; fuerte?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm leading-5">
      <dt className="shrink-0 text-muted">{etiqueta}</dt>
      <dd className={cn('min-w-0 flex-1 text-right wrap-anywhere text-ink', fuerte && 'font-semibold')}>{children}</dd>
    </div>
  )
}

/** Tarjeta «Resumen del pago» común a todas las pantallas de pago. */
function ResumenPago({ pago, curso, conComision }: { pago: Pago; curso: DetalleCurso; conComision: boolean }) {
  const comision = comisionDe(pago)
  const total = pago.importeCentimos + (conComision ? comision.importeCentimos : 0)
  const concepto = pago.concepto === 'CONSTANCIA' ? 'Constancia' : curso.miPrecio?.tipo === 'GENERAL' ? 'Precio general' : 'Precio de colegiado'
  return (
    <section aria-label="Resumen del pago" className={tarjeta}>
      <div className="flex items-center gap-3">
        <PortadaCurso curso={curso} className="w-22 shrink-0 rounded-md" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold wrap-anywhere text-ink">{curso.titulo}</p>
          <p className="text-xs leading-4 text-muted">{ETIQUETA_MODALIDAD[curso.modalidad]} · {fechasCurso(curso)}</p>
          <span className="inline-flex items-center gap-1 self-start rounded-md bg-warning-soft px-2 py-0.5 text-xs leading-4 font-medium text-warning">
            <Clock className="size-3" aria-hidden />
            Pendiente de pago
          </span>
        </div>
      </div>
      <hr className="border-line" />
      <dl className="flex flex-col gap-3">
        <Fila etiqueta={concepto}>{centimos(pago.importeCentimos)}</Fila>
        {conComision && <Fila etiqueta={`Comisión de la pasarela (${comision.porcentaje} %)`}>{centimos(comision.importeCentimos)}</Fila>}
        {conComision && <hr className="border-line" />}
        <div className="flex items-center gap-2">
          <dt className="flex-1 text-base leading-6 font-medium text-ink">Total a pagar</dt>
          <dd className="font-serif text-xl leading-7 font-bold text-brand-ink">{centimos(total)}</dd>
        </div>
        <Fila etiqueta="Código de orden" fuerte>{codigoOrdenDe(pago)}</Fila>
      </dl>
      {pago.venceEn && (
        <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm leading-5 text-warning">
          <Clock className="size-4 shrink-0" aria-hidden />
          Tienes hasta el {fechaHora(pago.venceEn)} para pagar.
        </p>
      )}
    </section>
  )
}

// ---------- Elegir forma de pago ----------

function OpcionRadio({ activa, deshabilitada, onElegir, icono: Icono, titulo, etiqueta, descripcion }: {
  activa: boolean; deshabilitada?: boolean; onElegir: () => void; icono: LucideIcon; titulo: string; etiqueta?: { texto: string; exito?: boolean }; descripcion: string
}) {
  return (
    <label className={cn(
      'flex items-start gap-3 rounded-lg p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand',
      deshabilitada ? 'cursor-not-allowed border border-line bg-surface-2 opacity-60' : 'cursor-pointer',
      !deshabilitada && (activa ? 'border-2 border-brand bg-brand-soft' : 'border border-line bg-white hover:border-brand/40'),
    )}>
      <input type="radio" name="medio" checked={activa} disabled={deshabilitada} onChange={onElegir} className="sr-only" />
      <Icono className={cn('size-5.5 shrink-0', activa ? 'text-brand' : 'text-muted')} aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn('text-base leading-6 font-medium', activa ? 'text-brand-ink' : 'text-ink')}>{titulo}</span>
          {etiqueta && <span className={cn('rounded-md px-2 py-0.5 text-xs leading-4 font-medium', etiqueta.exito ? 'bg-success-soft text-success' : 'bg-surface-3 text-muted')}>{etiqueta.texto}</span>}
        </span>
        <span className="text-sm leading-5 text-muted">{descripcion}</span>
      </span>
      <span aria-hidden className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-white', activa ? 'border-brand' : 'border-muted')}>
        {activa && <span className="size-2.5 rounded-full bg-brand" />}
      </span>
    </label>
  )
}

function ElegirMedio({ pago, alContinuar }: { pago: Pago; alContinuar: (paso: Paso) => void }) {
  const disponibles: Paso[] = [pago.medios.izipay && 'en-linea', pago.medios.transferencia && pago.destinoTransferencia && 'transferencia', pago.medios.efectivo && 'efectivo'].filter(Boolean) as Paso[]
  const [medio, setMedio] = useState<Paso>(disponibles[0] ?? 'efectivo')
  const comision = comisionDe(pago)
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Forma de pago</legend>
      <OpcionRadio activa={medio === 'en-linea'} deshabilitada={!disponibles.includes('en-linea')} onElegir={() => setMedio('en-linea')} icono={CreditCard} titulo="Pagar en línea" etiqueta={{ texto: `Comisión ${comision.porcentaje} %` }} descripcion="Tarjeta de crédito, débito o Yape. Se confirma al instante." />
      <OpcionRadio activa={medio === 'transferencia'} deshabilitada={!disponibles.includes('transferencia')} onElegir={() => setMedio('transferencia')} icono={Landmark} titulo="Transferencia BCP" etiqueta={{ texto: 'Sin comisión', exito: true }} descripcion="Transfiere y sube tu voucher. Lo revisamos en 1 día hábil." />
      <OpcionRadio activa={medio === 'efectivo'} deshabilitada={!disponibles.includes('efectivo')} onElegir={() => setMedio('efectivo')} icono={Banknote} titulo="Efectivo en la sede" etiqueta={{ texto: 'Sin comisión', exito: true }} descripcion="Paga en la caja del CPPP (lun. a vie., 9 a. m. – 5 p. m.)." />
      <Boton onClick={() => alContinuar(medio)} disabled={disponibles.length === 0} className="h-12 w-full text-base">Continuar</Boton>
    </fieldset>
  )
}

// ---------- En línea ----------

function PagarEnLinea({ pago, alRechazo }: { pago: Pago; alRechazo: () => void }) {
  const cache = useQueryClient()
  const [instrumento, setInstrumento] = useState<'TARJETA' | 'YAPE'>('TARJETA')
  const total = pago.importeCentimos + comisionDe(pago).importeCentimos
  const refrescar = async () => {
    const actualizado = await cache.fetchQuery({ queryKey: ['pago', pago.id], queryFn: () => pagos.obtener(pago.id) })
    await Promise.all(['curso', 'historial', 'participante'].map((clave) => cache.invalidateQueries({ queryKey: [clave] })))
    return actualizado
  }
  const iniciar = useMutation({
    mutationFn: () => pagos.iniciar(pago.id, { medio: 'IZIPAY', clave: crypto.randomUUID(), instrumento }),
    onSuccess: async (resultado) => {
      if (resultado.izipay) {
        await abrirIzipay(resultado.izipay, (respuesta) => {
          void pagos.notificarIzipay(respuesta).then(refrescar).then((p) => p.estado !== 'PAGADO' && alRechazo()).catch(() => alRechazo())
        })
        return
      }
      const actualizado = await refrescar()
      if (actualizado.estado !== 'PAGADO' || resultado.estado === 'RECHAZADO') alRechazo()
    },
  })
  return (
    <section className={tarjeta}>
      <h2 className="text-base leading-6 font-semibold text-ink">Elige cómo pagar</h2>
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Medio en línea</legend>
        <OpcionRadio activa={instrumento === 'TARJETA'} onElegir={() => setInstrumento('TARJETA')} icono={CreditCard} titulo="Tarjeta" descripcion="Visa, Mastercard o American Express" />
        <OpcionRadio activa={instrumento === 'YAPE'} onElegir={() => setInstrumento('YAPE')} icono={Smartphone} titulo="Yape" descripcion="Paga con el código de tu app" />
      </fieldset>
      <Aviso titulo="Pago seguro en la pasarela">Te llevaremos a la página segura de la pasarela. El CPPP no guarda los datos de tu tarjeta.</Aviso>
      {iniciar.isError && <Aviso tipo="error" titulo="No pudimos iniciar el pago">{mensajeDeError(iniciar.error, 'Intenta de nuevo en unos minutos.')}</Aviso>}
      <Boton onClick={() => iniciar.mutate()} cargando={iniciar.isPending} className="h-12 w-full text-base">
        <Lock className="size-5" aria-hidden />
        Pagar {centimos(total)}
      </Boton>
      {pago.medios.entorno === 'sandbox' && (
        <p className="flex flex-wrap items-center justify-center gap-2 text-xs leading-4 text-muted">
          <span className="rounded-md bg-surface-3 px-2 py-0.5 font-medium">Modo de pruebas</span>
          No se hará ningún cargo real.
        </p>
      )}
    </section>
  )
}

// ---------- Transferencia ----------

function BotonCopiar({ texto, etiqueta, grande = false }: { texto: string; etiqueta: string; grande?: boolean }) {
  return (
    <button
      type="button"
      aria-label={`Copiar ${etiqueta}`}
      onClick={() => void navigator.clipboard.writeText(texto).then(() => toast.success(`${etiqueta} copiado.`), () => toast.error('No pudimos copiar. Mantén presionado el texto para copiarlo.'))}
      className={cn('flex shrink-0 items-center justify-center rounded-lg text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand', grande ? 'size-11 border border-brand bg-white' : 'size-10')}
    >
      <Copy className="size-5" aria-hidden />
    </button>
  )
}

function CajaCopiable({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-page px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs leading-4 text-muted">{etiqueta}</span>
        <span className="font-mono text-base leading-6 break-all text-ink">{valor}</span>
      </div>
      <BotonCopiar texto={valor.replace(/\s/g, '')} etiqueta={etiqueta} />
    </div>
  )
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className={tarjeta}>
      <h2 className="flex items-center gap-3 text-base leading-6 font-semibold text-ink">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs leading-4 font-semibold text-white">{numero}</span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function CodigoOrden({ pago }: { pago: Pago }) {
  const codigo = codigoOrdenDe(pago)
  return (
    <div className="flex items-center gap-3 rounded-lg border-2 border-brand bg-brand-soft p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs leading-4 text-ink">Escribe este código en el concepto o descripción:</span>
        <span className="font-serif text-xl leading-7 font-bold break-all text-brand-ink">{codigo}</span>
      </div>
      <BotonCopiar texto={codigo} etiqueta="Código de orden" grande />
    </div>
  )
}

const pesoLegible = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toLocaleString('es-PE', { maximumFractionDigits: 1 })} MB`)

function PagarTransferencia({ pago }: { pago: Pago }) {
  const cache = useQueryClient()
  const destino = pago.destinoTransferencia!
  const entrada = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [referencia, setReferencia] = useState('')
  const [errores, setErrores] = useState<{ archivo?: string; referencia?: string }>({})
  const [clave] = useState(() => crypto.randomUUID())
  const enviar = useMutation({
    mutationFn: async () => {
      const voucher = await leerVoucher(archivo)
      const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
      return pagos.declararTransferencia(pago.id, { destinoId: destino.id, referencia: referencia.trim(), fechaOperacion: hoy, clave, voucher })
    },
    onSuccess: () => Promise.all([cache.invalidateQueries({ queryKey: ['pago', pago.id] }), cache.invalidateQueries({ queryKey: ['curso'] })]),
    onError: (e) => {
      if (esApiError(e) && e.fields.referencia) setErrores({ referencia: e.fields.referencia })
    },
  })
  const alEnviar = (evento: FormEvent) => {
    evento.preventDefault()
    const nuevos = {
      archivo: archivo ? undefined : 'Sube la foto o el PDF de tu voucher.',
      referencia: referencia.trim().length >= 3 ? undefined : 'Ingresa el número de operación de tu voucher.',
    }
    setErrores(nuevos)
    if (!nuevos.archivo && !nuevos.referencia) enviar.mutate()
  }
  return (
    <>
      <Paso numero={1} titulo="Transfiere a la cuenta del CPPP">
        <CajaCopiable etiqueta={`Cuenta corriente ${destino.banco} en soles`} valor={destino.cuenta} />
        <CajaCopiable etiqueta="CCI (desde otros bancos)" valor={destino.cci} />
        <dl className="flex flex-col gap-2">
          <Fila etiqueta="Titular">{destino.titular}</Fila>
          <Fila etiqueta="Monto exacto" fuerte>{centimos(pago.importeCentimos)}</Fila>
        </dl>
        <CodigoOrden pago={pago} />
      </Paso>
      <Paso numero={2} titulo="Sube tu voucher">
        <form noValidate onSubmit={alEnviar} className="flex flex-col gap-3">
          <input ref={entrada} type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" aria-label="Voucher" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setErrores((x) => ({ ...x, archivo: undefined })) }} />
          {archivo ? (
            <div className="flex items-center gap-3 rounded-lg border border-line p-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-page"><FileText className="size-5 text-brand" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-5 font-semibold break-all text-ink">{archivo.name}</p>
                <p className="text-xs leading-4 text-muted">{archivo.type === 'application/pdf' ? 'PDF' : 'Imagen'} · {pesoLegible(archivo.size)}</p>
              </div>
              <button type="button" aria-label="Quitar voucher" onClick={() => { setArchivo(null); if (entrada.current) entrada.current.value = '' }} className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
                <X className="size-5" aria-hidden />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => entrada.current?.click()} className={cn('flex flex-col items-center gap-2 rounded-lg px-4 py-6 text-center', errores.archivo ? 'border-2 border-danger bg-danger-soft' : 'border border-muted-3 bg-page hover:bg-surface-2')}>
              <Upload className="size-7 text-brand" aria-hidden />
              <span className="text-sm leading-5 text-ink">Toca para subir tu voucher</span>
            </button>
          )}
          {errores.archivo && <p role="alert" className="text-sm leading-5 text-danger">{errores.archivo}</p>}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="numero-operacion" className="flex items-center gap-1 text-sm leading-5 font-semibold text-ink">
              Número de operación <span aria-hidden className="font-bold text-required">*</span>
            </label>
            <input
              id="numero-operacion"
              value={referencia}
              onChange={(e) => { setReferencia(e.target.value); setErrores((x) => ({ ...x, referencia: undefined })) }}
              inputMode="numeric"
              autoComplete="off"
              maxLength={100}
              aria-invalid={errores.referencia ? true : undefined}
              aria-describedby="numero-operacion-ayuda"
              className={cn('h-12 w-full rounded-lg bg-white px-3 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-light', errores.referencia ? 'ring-2 ring-danger ring-inset' : 'ring-1 ring-muted-3 ring-inset')}
            />
            <p id="numero-operacion-ayuda" className={cn('text-sm leading-5', errores.referencia ? 'text-danger' : 'text-muted')} role={errores.referencia ? 'alert' : undefined}>
              {errores.referencia ?? 'Está en tu voucher o constancia de la app. Lo usamos para evitar pagos duplicados.'}
            </p>
          </div>
          {enviar.isError && !errores.referencia && <Aviso tipo="error" titulo="No pudimos enviar tu voucher">{mensajeDeError(enviar.error, 'Intenta de nuevo.')}</Aviso>}
          <Boton type="submit" cargando={enviar.isPending} className="h-12 w-full text-base">
            <Upload className="size-5" aria-hidden />
            Enviar voucher
          </Boton>
          <p className="text-xs leading-4 text-muted">Formatos: JPG, PNG o PDF hasta 5 MB.</p>
        </form>
      </Paso>
    </>
  )
}

// ---------- Efectivo ----------

function PagarEfectivo({ pago }: { pago: Pago }) {
  return (
    <section className={tarjeta}>
      <h2 className="flex items-center gap-2 text-base leading-6 font-semibold text-ink"><Banknote className="size-5.5 text-brand" aria-hidden />Paga en la caja del CPPP</h2>
      <p className="text-sm leading-5 text-ink">Acércate a la sede (Av. La Cultura 1112, Of. 704, Cusco) de lunes a viernes, de 9 a. m. a 5 p. m. Lleva el monto exacto: <strong>{centimos(pago.importeCentimos)}</strong>.</p>
      <CodigoOrden pago={pago} />
      <p className="text-sm leading-5 text-muted">Cuando pagues, el personal registrará tu pago y te enviaremos el comprobante por correo.</p>
      <Link to="/participante/cursos" className="inline-flex h-12 items-center justify-center rounded-lg border border-brand bg-white px-5 text-base font-semibold text-brand hover:bg-brand-soft">Volver a mis cursos</Link>
    </section>
  )
}

// ---------- Resultados ----------

function Resultado({ tono, icono: Icono, titulo, texto, children }: { tono: 'exito' | 'error' | 'advertencia'; icono: LucideIcon; titulo: string; texto: ReactNode; children: ReactNode }) {
  const color = { exito: 'bg-success-soft text-success', error: 'bg-danger-soft text-danger', advertencia: 'bg-warning-soft text-warning' }[tono]
  return (
    <section role={tono === 'error' ? 'alert' : 'status'} className="flex flex-col items-center gap-4 rounded-xl border border-line bg-white p-6 text-center">
      <span className={cn('flex size-16 items-center justify-center rounded-full', color)}><Icono className="size-8" strokeWidth={1.75} aria-hidden /></span>
      <h1 className="font-serif text-2xl leading-8 font-bold text-ink">{titulo}</h1>
      <p className="text-base leading-6 text-muted">{texto}</p>
      {children}
    </section>
  )
}

function Datos({ children }: { children: ReactNode }) {
  return <dl className="flex w-full flex-col gap-2 rounded-lg bg-page p-4 text-left">{children}</dl>
}

function PagoAprobado({ pago, cursoId }: { pago: Pago; cursoId: string }) {
  const [descargando, setDescargando] = useState(false)
  const operacion = pago.operaciones.findLast((o) => o.estado === 'CONFIRMADO')
  const enLinea = operacion?.medio === 'IZIPAY' || operacion?.medio === 'CULQI'
  const total = pago.importeCentimos + (enLinea ? comisionDe(pago).importeCentimos : 0)
  const descargar = async () => {
    setDescargando(true)
    try {
      guardarDescarga(await pagos.comprobante(pago.id), `comprobante-${codigoOrdenDe(pago)}.pdf`)
    } catch (e) {
      toast.error(mensajeDeError(e, 'No pudimos descargar el comprobante.'))
    } finally {
      setDescargando(false)
    }
  }
  return (
    <Resultado tono="exito" icono={CircleCheck} titulo="¡Pago confirmado!" texto={<>Tu inscripción está confirmada. Enviamos el comprobante a tu correo{pago.correoEnmascarado ? ` ${pago.correoEnmascarado}` : ''}.</>}>
      <Datos>
        <Fila etiqueta="Código de orden">{codigoOrdenDe(pago)}</Fila>
        <Fila etiqueta="Medio">{operacion?.detalle ?? (operacion?.medio === 'TRANSFERENCIA' ? 'Transferencia BCP' : operacion?.medio === 'EFECTIVO' ? 'Efectivo' : 'En línea')}</Fila>
        <Fila etiqueta="Total pagado" fuerte>{centimos(total)}</Fila>
        {operacion?.confirmadoEn && <Fila etiqueta="Fecha">{fechaHora(operacion.confirmadoEn, true)}</Fila>}
      </Datos>
      <div className="flex w-full flex-col gap-3">
        <Link to={`/cursos/${cursoId}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-base font-semibold text-white hover:bg-brand-ink"><BookOpen className="size-5" aria-hidden />Ir al curso</Link>
        <Boton variante="secundario" onClick={() => void descargar()} cargando={descargando} className="h-12 w-full text-base text-brand ring-brand"><Download className="size-5" aria-hidden />Descargar comprobante</Boton>
      </div>
    </Resultado>
  )
}

function PagoRechazado({ pago, alReintentar, alOtroMedio }: { pago: Pago; alReintentar: () => void; alOtroMedio: () => void }) {
  return (
    <Resultado tono="error" icono={CircleX} titulo="No se pudo completar el pago" texto="La pasarela rechazó el pago o lo cancelaste. No se hizo ningún cargo y tu inscripción sigue pendiente.">
      <Datos>
        <Fila etiqueta="Código de orden">{codigoOrdenDe(pago)}</Fila>
        <Fila etiqueta="Estado">Pendiente de pago</Fila>
        {pago.venceEn && <Fila etiqueta="Fecha límite">{fechaHora(pago.venceEn)}</Fila>}
      </Datos>
      <div className="flex w-full flex-col gap-3">
        <Boton onClick={alReintentar} className="h-12 w-full text-base"><RefreshCw className="size-5" aria-hidden />Intentar de nuevo</Boton>
        <Boton variante="secundario" onClick={alOtroMedio} className="h-12 w-full text-base text-brand ring-brand">Pagar por transferencia o efectivo</Boton>
      </div>
    </Resultado>
  )
}

function PagoEnRevision({ pago }: { pago: Pago }) {
  const transferencia = pago.transferencias.findLast((t) => t.estado === 'DECLARADO' || t.estado === 'INICIADO')
  return (
    <Resultado tono="advertencia" icono={Clock} titulo="Voucher enviado: pago en revisión" texto="Revisaremos tu voucher en 1 día hábil. Te avisaremos por correo cuando se confirme.">
      <Datos>
        <Fila etiqueta="Código de orden">{codigoOrdenDe(pago)}</Fila>
        {transferencia && <Fila etiqueta="Número de operación">{transferencia.referencia}</Fila>}
        <Fila etiqueta="Monto" fuerte>{centimos(pago.importeCentimos)}</Fila>
        <Fila etiqueta="Estado">En revisión</Fila>
      </Datos>
      <Link to="/participante/cursos" className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand px-5 text-base font-semibold text-white hover:bg-brand-ink">Volver a mis cursos</Link>
    </Resultado>
  )
}
