import { Camera, CircleCheck, CircleX, RefreshCw, Search, TriangleAlert, Users, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { useRutaClases } from '@/auth/useRutaClases'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Entrada } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { esApiError, mensajeDeError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fechaConAnio, hora12, horaRegistro } from '@/lib/formato'
import {
  extraerTokenPersonal,
  digitosDni,
  useContextoPuerta,
  useBuscarPorDni,
  useDeshacerRegistro,
  useRegistrarEnPuerta,
} from '@/servicios/asistenciaPuerta'
import type { AgremiadoPuerta, CoincidenciaDni, RegistroPuertaRespuesta } from '@/types/api'
import { AvisoInfo } from '@/components/ui/Aviso'
import { LectorQr } from './LectorQr'

type Pestana = 'qr' | 'dni'
type Registro = ReturnType<typeof useRegistrarEnPuerta>
type Deshacer = ReturnType<typeof useDeshacerRegistro>

/** Pausa tras cada lectura para que el encargado vea el resultado antes de la siguiente. */
const PAUSA_ENTRE_LECTURAS_MS = 1500
/** El mismo QR leído de nuevo en este lapso se ignora (la persona sigue frente a la cámara). */
const IGNORAR_REPETIDO_MS = 5000

/** `09:02 a. m.` → `9:02 a. m.`, como en el diseño */
const hora = (iso: string) => horaRegistro(iso).replace(/^0/, '')

/**
 * S3 1.4 · Registrar asistencia en la puerta (HU-39): el encargado escanea el QR personal del
 * colegiado o lo busca por DNI. Pensada para usarse de pie con el celular (360 px).
 */
export function PuertaPagina() {
  const { id = '' } = useParams()
  return <PuertaDeSesion key={id} id={id} />
}

function PuertaDeSesion({ id }: { id: string }) {
  const { usuario } = useAuth()
  const rutaClases = useRutaClases()
  const contexto = useContextoPuerta(id)
  const registrar = useRegistrarEnPuerta(id)
  const deshacer = useDeshacerRegistro(id)
  const [pestana, setPestana] = useState<Pestana>('qr')
  const registrando = registrar.isPending || deshacer.isPending

  const cambiarPestana = (nueva: Pestana) => {
    if (registrando || nueva === pestana) return
    registrar.reset()
    setPestana(nueva)
  }

  const alNavegarPestanas = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (registrando || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return
    evento.preventDefault()
    const nueva = evento.key === 'Home' ? 'qr' : evento.key === 'End' ? 'dni' : pestana === 'qr' ? 'dni' : 'qr'
    cambiarPestana(nueva)
    evento.currentTarget.querySelector<HTMLButtonElement>(`#pestana-${nueva}`)?.focus()
  }

  const volver =
    usuario?.rol === 'INSTRUCTOR' ? (
      <EnlaceVolver to={rutaClases}>Volver a mis sesiones</EnlaceVolver>
    ) : (
      <EnlaceVolver to={`${rutaClases}/${id}`}>Volver a la sesión</EnlaceVolver>
    )

  if (contexto.isPending) return <Contenedor>{volver}<Cargando texto="Cargando la sesión…" /></Contenedor>
  if (contexto.isError) {
    return (
      <Contenedor>
        {volver}
        <ErrorCarga mensaje={mensajeDeError(contexto.error, 'No pudimos cargar la sesión.')} onReintentar={contexto.refetch} />
      </Contenedor>
    )
  }

  const { clase, inscritos, presentes, recientes, verListaCompleta } = contexto.data

  return (
    <Contenedor>
      {volver}

      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs leading-4 font-semibold text-brand">Registrar asistencia</p>
          <h1 className="font-serif text-xl leading-7 font-bold wrap-anywhere text-ink">{clase.curso?.titulo ?? clase.nombre}</h1>
          <p className="text-sm leading-5 wrap-anywhere text-muted">
            {[clase.curso ? clase.nombre : null, fechaConAnio(clase.fecha), hora12(clase.horaInicio), clase.lugar].filter(Boolean).join(' · ')}
          </p>
        </div>
        <p className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg lg:self-center border border-line bg-white px-3 py-2 text-sm leading-5 font-semibold text-ink" aria-live="polite">
          <Users className="size-5 text-brand" aria-hidden />
          {presentes} de {inscritos} presentes
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div role="tablist" aria-label="Forma de registro" onKeyDown={alNavegarPestanas} className="flex rounded-lg bg-surface-3 p-1">
            <BotonPestana codigo="qr" activa={pestana === 'qr'} onClick={() => cambiarPestana('qr')} icono={Camera}>
              Escanear QR
            </BotonPestana>
            <BotonPestana codigo="dni" activa={pestana === 'dni'} onClick={() => cambiarPestana('dni')} icono={Search}>
              Buscar por DNI
            </BotonPestana>
          </div>

          <div id="panel-puerta" role="tabpanel" aria-labelledby={`pestana-${pestana}`} className="flex flex-col gap-4">
            {pestana === 'qr'
              ? <EscanearQr registrar={registrar} deshacer={deshacer} />
              : <BuscarDni claseId={id} registrar={registrar} deshacer={deshacer} />}
          </div>
        </div>
        <UltimosRegistros recientes={recientes} rutaLista={verListaCompleta ? `${rutaClases}/${id}/asistencia` : undefined} />
      </div>
    </Contenedor>
  )
}

function Contenedor({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-8 sm:px-10 sm:pt-8">
      <div className="mx-auto flex w-full max-w-120 flex-col gap-4 lg:max-w-300 lg:gap-6">{children}</div>
    </div>
  )
}

function BotonPestana({ codigo, activa, onClick, icono: Icono, children }: { codigo: Pestana; activa: boolean; onClick: () => void; icono: LucideIcon; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      id={`pestana-${codigo}`}
      aria-controls="panel-puerta"
      tabIndex={activa ? 0 : -1}
      aria-selected={activa}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 text-sm leading-5 font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-brand',
        activa ? 'bg-white text-brand' : 'text-muted hover:text-ink',
      )}
    >
      <Icono className="size-4.5 shrink-0" aria-hidden />
      {children}
    </button>
  )
}

/** Panel lateral de escritorio con las 4 marcas más recientes (Figma S3 1.3). */
function UltimosRegistros({ recientes, rutaLista }: { recientes: RegistroPuertaRespuesta[]; rutaLista?: string }) {
  return (
    <section aria-labelledby="ultimos-registros" className="hidden w-95 shrink-0 flex-col gap-3 rounded-xl border border-line bg-white p-5 lg:flex">
      <h2 id="ultimos-registros" className="text-base leading-6 font-semibold text-ink">Últimos registros</h2>
      {recientes.length === 0 ? (
        <p className="text-sm leading-5 text-muted">Aún no hay asistencias registradas en esta sesión.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {recientes.map((r) => (
            <li key={r.marcaId} className="flex items-center gap-2">
              <CircleCheck className="size-4.5 shrink-0 text-success" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm leading-5 text-ink">{r.participante.nombre}</span>
              {r.metodo && (
                <span className="shrink-0 rounded-md bg-surface-3 px-2 py-0.5 text-xs leading-4 font-medium text-muted">{r.metodo}</span>
              )}
              <span className="shrink-0 text-xs leading-4 text-muted">{hora(r.horaRegistro)}</span>
            </li>
          ))}
        </ul>
      )}
      {rutaLista && (
        <>
          <hr className="border-line" />
          <Link
            to={rutaLista}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand bg-white px-5 text-sm leading-5 font-semibold text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Users className="size-4.5" aria-hidden />
            Ver lista completa
          </Link>
        </>
      )}
    </section>
  )
}

// ---------- Escanear el QR personal ----------

function EscanearQr({ registrar, deshacer }: { registrar: Registro; deshacer: Deshacer }) {
  const { mutate, isPending, isIdle } = registrar
  const [enPausa, setEnPausa] = useState(false)
  const ultimaLectura = useRef({ token: '', en: 0 })
  const temporizador = useRef<number | undefined>(undefined)

  const pausar = useCallback(() => {
    setEnPausa(true)
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setEnPausa(false), PAUSA_ENTRE_LECTURAS_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  const alLeer = useCallback(
    (texto: string) => {
      const token = extraerTokenPersonal(texto)
      const ahora = Date.now()
      const repetido = token === ultimaLectura.current.token && ahora - ultimaLectura.current.en < IGNORAR_REPETIDO_MS
      ultimaLectura.current = { token, en: ahora }
      // Un QR repetido no se reenvía: solo se reanuda la cámara tras la pausa
      if (repetido) return pausar()
      mutate({ token }, { onSettled: pausar })
    },
    [mutate, pausar],
  )

  return (
    <>
      <LectorQr pausado={isPending || enPausa || deshacer.isPending} onLeer={alLeer} />
      {isIdle ? (
        <AvisoInfo titulo="Listo para escanear">
          Cada lectura se registra sola. Verás el nombre y el DNI parcial para confirmar que es la persona correcta.
        </AvisoInfo>
      ) : (
        <ResultadoRegistro registrar={registrar} deshacer={deshacer} />
      )}
    </>
  )
}

// ---------- Buscar por DNI ----------

function BuscarDni({ claseId, registrar, deshacer }: { claseId: string; registrar: Registro; deshacer: Deshacer }) {
  const [dni, setDni] = useState('')
  const buscar = useBuscarPorDni(claseId)
  const resultados = buscar.data?.resultados
  const registrandoId = registrar.isPending ? registrar.variables.participanteId : undefined
  const ocupada = registrar.isPending || deshacer.isPending
  const registro = registrar.data

  const enviarBusqueda = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (dni.length !== digitosDni || buscar.isPending || ocupada) return
    registrar.reset()
    buscar.mutate(dni)
  }

  return (
    <>
      <form onSubmit={enviarBusqueda} className="flex flex-col gap-1.5">
        <label htmlFor="dni-colegiado" className="text-sm leading-5 font-semibold text-ink">
          DNI del colegiado
        </label>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
            <Entrada
              id="dni-colegiado"
              type="text"
              value={dni}
              onChange={(e) => {
                buscar.reset()
                registrar.reset()
                setDni(e.target.value.replace(/\D/g, '').slice(0, digitosDni))
              }}
              inputMode="numeric"
              autoComplete="off"
              maxLength={digitosDni}
              disabled={ocupada}
              aria-describedby="dni-colegiado-ayuda"
              className="pl-9.5 sm:h-12 sm:text-base"
            />
          </div>
          <Boton type="submit" cargando={buscar.isPending} disabled={ocupada || dni.length !== digitosDni}>
            Buscar DNI
          </Boton>
        </div>
        <p id="dni-colegiado-ayuda" className="text-sm leading-5 text-muted">
          Ingresa los ocho dígitos del DNI, incluidos los ceros iniciales.
        </p>
      </form>

      {!registrar.isIdle && !registrar.isPending && <ResultadoRegistro registrar={registrar} deshacer={deshacer} />}

      {buscar.isError && (
        <p role="alert" className="text-sm text-danger">{mensajeDeError(buscar.error, 'No pudimos buscar el DNI. Intenta de nuevo.')}</p>
      )}
      {buscar.isPending && <Cargando texto="Buscando…" />}

      {resultados && resultados.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-white p-6 text-center">
          <Search className="size-9 text-muted" strokeWidth={1.5} aria-hidden />
          <p className="text-base leading-6 font-semibold text-ink">No encontramos ese DNI entre los inscritos</p>
          <p className="text-sm leading-5 text-muted">
            Revisa los dígitos. Si la persona no está inscrita, indícale que se inscriba en el catálogo; no se puede registrar su asistencia.
          </p>
        </div>
      )}

      {resultados && resultados.length > 0 && (
        <>
          <p className="text-sm leading-5 font-semibold text-muted" aria-live="polite">
            {resultados.length} {resultados.length === 1 ? 'coincidencia' : 'coincidencias'}
          </p>
          <ul className="flex flex-col gap-4">
            {resultados.map((r) => (
              <li key={r.participante.id}>
                <FilaCoincidencia
                  coincidencia={registro?.participante.id === r.participante.id
                    ? { ...r, horaRegistro: registro.horaRegistro } : r}
                  registrando={registrandoId === r.participante.id}
                  bloqueado={ocupada}
                  onRegistrar={() => registrar.mutate({ participanteId: r.participante.id })}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

/** «LH» para «Luis Alberto Huamán Rojas»: primer nombre y primer apellido. */
function iniciales(nombre: string) {
  const palabras = nombre.trim().split(/\s+/)
  const segunda = palabras.length >= 4 ? palabras[palabras.length - 2] : palabras[1]
  return `${palabras[0]?.[0] ?? ''}${segunda?.[0] ?? ''}`.toUpperCase()
}

function FilaCoincidencia({
  coincidencia,
  registrando,
  bloqueado,
  onRegistrar,
}: {
  coincidencia: CoincidenciaDni
  registrando: boolean
  bloqueado: boolean
  onRegistrar: () => void
}) {
  const { participante, horaRegistro: previa } = coincidencia
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs leading-4 font-semibold text-brand" aria-hidden>
        {iniciales(participante.nombre)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-base leading-6 font-medium wrap-anywhere text-ink">{participante.nombre}</p>
        <p className="text-sm leading-5 text-muted">DNI {participante.dniParcial ?? 'no registrado'}</p>
      </div>
      {previa ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning-soft px-2 py-0.5 text-xs leading-4 font-medium text-warning" title={`Registrada a las ${hora(previa)}`}>
          <CircleCheck className="size-3" aria-hidden />
          Ya registrada
        </span>
      ) : (
        <Boton
          onClick={onRegistrar}
          cargando={registrando}
          disabled={bloqueado}
          aria-label={`Registrar asistencia de ${participante.nombre}`}
          className="h-12 px-3.5 text-base"
        >
          Registrar
        </Boton>
      )}
    </div>
  )
}

// ---------- Resultado del registro ----------

const estilosResultado = {
  exito: { caja: 'border-success bg-success-soft', titulo: 'text-success', Icono: CircleCheck },
  advertencia: { caja: 'border-warning bg-warning-soft', titulo: 'text-warning', Icono: TriangleAlert },
  error: { caja: 'border-danger bg-danger-soft', titulo: 'text-danger', Icono: CircleX },
} as const

function TarjetaResultado({ tipo, titulo, linea, detalle }: { tipo: keyof typeof estilosResultado; titulo: string; linea?: string; detalle: string }) {
  const { caja, titulo: colorTitulo, Icono } = estilosResultado[tipo]
  return (
    <div role={tipo === 'exito' ? 'status' : 'alert'} className={cn('flex w-full items-center gap-3 rounded-xl border-2 p-4', caja)}>
      <Icono className={cn('size-9 shrink-0', colorTitulo)} strokeWidth={1.75} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn('text-base leading-6 font-semibold', colorTitulo)}>{titulo}</p>
        {linea && <p className="text-base leading-6 font-medium wrap-anywhere text-ink">{linea}</p>}
        <p className="text-sm leading-5 text-muted">{detalle}</p>
      </div>
    </div>
  )
}

function ResultadoRegistro({ registrar, deshacer }: { registrar: Registro; deshacer: Deshacer }) {
  if (registrar.isSuccess) {
    const { marcaId, participante, horaRegistro: registrada } = registrar.data
    return (
      <>
        <TarjetaResultado
          tipo="exito"
          titulo="Asistencia registrada"
          linea={participante.nombre}
          detalle={`DNI ${participante.dniParcial ?? 'no registrado'} · ${hora(registrada)}`}
        />
        <Boton
          variante="secundario"
          cargando={deshacer.isPending}
          onClick={() =>
            deshacer.mutate(marcaId, {
              onSuccess: () => {
                registrar.reset()
                toast.success(`Se deshizo el registro de ${participante.nombre}.`)
              },
            })
          }
          className="h-12 w-full bg-transparent text-base text-brand ring-0 hover:bg-brand-soft"
        >
          <RefreshCw className="size-5" aria-hidden />
          Deshacer este registro
        </Boton>
        {deshacer.isError && deshacer.variables === marcaId && (
          <p role="alert" className="text-sm text-danger">{mensajeDeError(deshacer.error, 'No pudimos deshacer el registro.')}</p>
        )}
      </>
    )
  }
  if (!registrar.isError) return null

  const error = registrar.error
  const participante = esApiError(error) ? (error.details.participante as AgremiadoPuerta | undefined) : undefined

  if (esApiError(error, 'ASISTENCIA_YA_REGISTRADA')) {
    const previa = error.details.horaRegistro as string | undefined
    return (
      <TarjetaResultado
        tipo="advertencia"
        titulo="Ya registrada"
        linea={participante?.nombre}
        detalle={previa ? `Su asistencia ya se registró a las ${hora(previa)} No se duplica.` : error.message}
      />
    )
  }
  if (esApiError(error, 'NO_INSCRITO')) {
    return (
      <TarjetaResultado
        tipo="error"
        titulo="No tiene una inscripción vigente"
        detalle="Pide al colegiado que revise su inscripción o consulte con coordinación."
      />
    )
  }
  if (esApiError(error, 'QR_PERSONAL_INVALIDO')) {
    return (
      <TarjetaResultado
        tipo="error"
        titulo="QR no válido"
        linea="Código alterado o de otro sistema"
        detalle="Pide al colegiado que abra «Mi QR» en la plataforma o búscalo por DNI."
      />
    )
  }
  return (
    <TarjetaResultado
      tipo="error"
      titulo="No se registró la asistencia"
      detalle={mensajeDeError(error, 'No pudimos registrar la asistencia. Intenta de nuevo.')}
    />
  )
}
