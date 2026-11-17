import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Lock, Mic, MicOff, UserX, Video, VideoOff, X } from 'lucide-react'
import { PaginaPublica } from '@/components/layout/Pagina'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { Dialogo } from '@/components/ui/Dialogo'
import { Interruptor } from '@/components/ui/Interruptor'
import { cn } from '@/lib/cn'
import { CPPP } from '@/lib/cppp'
import { fechaConAnio, hora12 } from '@/lib/formato'
import type { Reunion } from '@/servicios/reuniones'
import { iniciales } from './iniciales'

export function Avatar({ nombre, oscuro = false }: { nombre: string; oscuro?: boolean }) {
  return <span aria-hidden className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold', oscuro ? 'bg-white text-brand' : 'bg-brand-soft text-brand')}>{iniciales(nombre)}</span>
}

/** Hora de Lima de una fecha-hora ISO («2026-11-23T14:00:00Z» → «09:00»). */
const horaLima = (iso: string) => new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' }).format(new Date(iso))
const fechaLima = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(iso))

/** Botón «Volver al curso»: regresa a la página anterior (el curso desde donde se entró) o a «Mis cursos». */
function useVolver() {
  const navegar = useNavigate()
  return () => { if (window.history.length > 1) navegar(-1); else navegar('/participante/cursos') }
}

/**
 * S3 9.1 / 9.2 · Vestíbulo claro de la sala: vista previa con micrófono y cámara, datos de la sesión,
 * avisos de grabación y asistencia. Mientras el instructor no admite, muestra «Esperando…».
 */
export function VestibuloSala({ reunion, nombre, moderador, esperando, conectando, microfono, camara, alMicrofono, alCamara, alEntrar }: {
  reunion?: Reunion; nombre: string; moderador: boolean; esperando: boolean; conectando: boolean
  microfono: boolean; camara: boolean; alMicrofono: () => void; alCamara: () => void; alEntrar?: () => void
}) {
  const volver = useVolver()
  return <div className="fixed inset-0 z-50 overflow-auto">
    <PaginaPublica>
      <main className="mx-auto flex w-full max-w-300 flex-col gap-6 px-4 pt-6 pb-16 sm:px-10 sm:pt-10">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand hover:underline">← Volver al curso</button>
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:items-start">
          <section aria-label="Vista previa" className="flex flex-col gap-2">
            <div className="flex aspect-video flex-col items-center justify-center gap-4 rounded-xl bg-visor">
              <span aria-hidden className="flex size-24 items-center justify-center rounded-full bg-brand font-serif text-2xl font-bold text-gold-light">{iniciales(nombre)}</span>
              <p className="text-sm text-white">{camara ? 'Tu cámara se encenderá al entrar' : 'Tu cámara está apagada'}</p>
            </div>
            <div className="flex justify-center gap-6 rounded-xl bg-visor/95 py-3">
              <BotonBarra etiqueta="Micrófono" activo={microfono} onClick={alMicrofono} icono={microfono ? <Mic className="size-5" /> : <MicOff className="size-5" />} />
              <BotonBarra etiqueta="Cámara" activo={camara} onClick={alCamara} icono={camara ? <Video className="size-5" /> : <VideoOff className="size-5" />} />
            </div>
          </section>
          <section aria-label="Datos de la sesión" className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
            {moderador
              ? <Aviso titulo="Eres el anfitrión">Los colegiados esperarán en la sala de espera hasta que los admitas.</Aviso>
              : <Aviso tipo="advertencia" titulo={esperando ? 'Esperando que el instructor te admita' : conectando ? 'Entrando a la sala de espera…' : 'Listo para entrar'}>
                {esperando ? 'Entrarás automáticamente. No cierres esta ventana.' : 'Solo entran los inscritos, después de que el instructor los admite.'}
              </Aviso>}
            <h1 className="font-sans text-base leading-6 font-semibold text-ink">{reunion?.titulo ?? 'Sesión virtual'}</h1>
            {reunion && <dl className="flex flex-col gap-2.5 text-sm leading-5">
              <Dato icono={<Calendar className="size-4" />} termino="Sesión">{fechaConAnio(fechaLima(reunion.inicioProgramado))}</Dato>
              <Dato icono={<Clock className="size-4" />} termino="Horario">{hora12(horaLima(reunion.inicioProgramado))} – {hora12(horaLima(reunion.finProgramado))}</Dato>
            </dl>}
            {reunion?.grabacionPrevista && <Aviso titulo="Esta sesión se grabará">La grabación se usa solo para el curso. Al entrar aceptas que se registre tu participación (Ley 29733).</Aviso>}
            {reunion && !moderador && <Aviso titulo="Para que cuente tu asistencia">Mantente conectado al menos el {reunion.porcentajeMinimo} % de la sesión. Tu tiempo se registra solo.</Aviso>}
            {alEntrar && <Boton onClick={alEntrar} cargando={conectando} disabled={!reunion} className="h-12 w-full text-base sm:h-10 sm:text-sm">{moderador ? 'Entrar a la sala' : 'Entrar a la sala de espera'}</Boton>}
            <button type="button" onClick={volver} className="text-sm font-semibold text-brand hover:underline">{esperando || conectando ? 'Salir de la sala de espera' : 'Volver'}</button>
          </section>
        </div>
      </main>
    </PaginaPublica>
  </div>
}

function Dato({ icono, termino, children }: { icono: ReactNode; termino: string; children: ReactNode }) {
  return <div className="flex items-center gap-2">
    <span aria-hidden className="text-muted">{icono}</span>
    <dt className="text-muted">{termino}</dt>
    <dd className="flex-1 text-right text-ink">{children}</dd>
  </div>
}

/** S3 9.1 · «Esta sesión se grabará»: el colegiado acepta antes de entrar (Ley 29733). */
export function DialogoGrabacion({ abierto, alNoEntrar, alEntrar }: { abierto: boolean; alNoEntrar: () => void; alEntrar: () => void }) {
  const [acepta, cambiarAcepta] = useState(false)
  return <Dialogo abierto={abierto} onCerrar={alNoEntrar} titulo="Esta sesión se grabará" acciones={<>
    <button type="button" onClick={alNoEntrar} className="h-10 rounded-lg px-5 text-sm font-semibold text-brand hover:bg-brand-soft">No entrar</button>
    <Boton onClick={alEntrar} disabled={!acepta}>Entrar a la sala</Boton>
  </>}>
    <p className="-mt-3 text-sm text-muted">Antes de entrar, confirma que estás de acuerdo.</p>
    <p className="text-sm leading-5 text-ink">El instructor grabará la sesión para que los inscritos puedan repasarla. Tu nombre y, si los activas, tu cámara y micrófono pueden quedar en la grabación. Puedes mantenerlos apagados.</p>
    <label className="flex items-center gap-2 text-sm text-ink">
      <input data-autofocus type="checkbox" checked={acepta} onChange={evento => cambiarAcepta(evento.target.checked)} className="size-4 accent-brand" />
      Entiendo y acepto que la sesión se grabe (Ley 29733).
    </label>
  </Dialogo>
}

/** S3 9.1 · Pantallas finales: retirado por el instructor, no admitido o sin acceso a la sala. */
export function PantallaFinSala({ motivo }: { motivo: 'retirado' | 'rechazado' | 'sinAcceso' }) {
  const volver = useVolver()
  const navegar = useNavigate()
  const sinAcceso = motivo === 'sinAcceso'
  const titulo = { retirado: 'El instructor te retiró de esta sesión', rechazado: 'El instructor no te admitió en esta sesión', sinAcceso: 'No puedes entrar a esta sala' }[motivo]
  return <div className="fixed inset-0 z-50 overflow-auto">
    <PaginaPublica>
      <main className="mx-auto flex w-full max-w-150 flex-col gap-6 px-4 pt-6 pb-16 sm:pt-10">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand hover:underline">← Volver al curso</button>
        <section className="flex flex-col items-center gap-4 rounded-xl border border-line bg-white px-6 py-8 text-center sm:px-12">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">{sinAcceso ? <Lock className="size-6" /> : <UserX className="size-6" />}</span>
          <h1 className="font-serif text-2xl leading-8 font-bold text-ink sm:text-[28px] sm:leading-9">{titulo}</h1>
          <p className="text-sm leading-5 text-muted">{sinAcceso
            ? 'Solo los inscritos en el curso pueden entrar, y únicamente desde la plataforma con su sesión iniciada. El enlace copiado no funciona fuera de ella.'
            : 'No podrás volver a entrar a la sesión de hoy. Si crees que fue un error, comunícate con coordinación del CPPP.'}</p>
          <div className="flex w-full flex-col gap-3">
            {sinAcceso ? <>
              <Boton onClick={() => navegar('/participante/cursos')} className="w-full">Ir a mis cursos</Boton>
              <Boton variante="secundario" onClick={() => navegar('/catalogo')} className="w-full text-brand ring-brand">Ver el curso en el catálogo</Boton>
            </> : <>
              <Boton onClick={volver} className="w-full">Volver al curso</Boton>
              <a href={`https://wa.me/51${CPPP.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold text-brand ring-1 ring-brand ring-inset hover:bg-brand-soft">Contactar a coordinación</a>
            </>}
          </div>
        </section>
      </main>
    </PaginaPublica>
  </div>
}

/** Botón redondo de la barra inferior (S3 9.3): ícono en círculo y etiqueta debajo. */
export function BotonBarra({ etiqueta, icono, activo = false, peligro = false, disabled, onClick, presionado, className }: {
  etiqueta: string; icono: ReactNode; activo?: boolean; peligro?: boolean; disabled?: boolean; onClick?: () => void; presionado?: boolean; className?: string
}) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-pressed={presionado} aria-label={etiqueta}
    className={cn('group flex w-14 shrink-0 flex-col items-center gap-1 text-[10px] leading-3 text-white/85 disabled:text-white/40 sm:w-auto sm:min-w-16 sm:text-xs', className)}>
    <span className={cn('flex size-11 items-center justify-center rounded-full transition-colors group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-gold-light',
      peligro ? 'bg-danger-strong text-white group-hover:bg-danger' : activo ? 'bg-white text-brand' : 'bg-white/15 text-white group-hover:bg-white/25',
      'group-disabled:bg-white/10 group-disabled:text-white/40')}>{icono}</span>
    <span aria-hidden className="-mx-1 text-center sm:mx-0 sm:leading-4 sm:whitespace-nowrap">{etiqueta}</span>
  </button>
}

export type PermisosSala = { pantalla: boolean; microfono: boolean; camara: boolean; mano: boolean }

/** S3 9.3 · «Permisos de los participantes»: se aplican al instante en la llamada. */
export function PanelPermisos({ valor, disponible, ocupado, alCambiar, alCerrar }: {
  valor: PermisosSala; disponible: boolean; ocupado: boolean; alCambiar: (permiso: keyof PermisosSala, activo: boolean) => void; alCerrar: () => void
}) {
  return <section role="dialog" aria-label="Permisos de los participantes" className="fixed bottom-24 left-1/2 z-40 flex max-h-[calc(100dvh-8rem)] w-[min(22rem,calc(100vw-1rem))] -translate-x-1/2 flex-col gap-4 overflow-auto rounded-xl bg-white p-5 text-ink shadow-2xl">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base leading-6 font-semibold">Permisos de los participantes</h2>
      <button type="button" onClick={alCerrar} aria-label="Cerrar permisos" className="rounded p-1 text-muted hover:bg-surface-2"><X className="size-5" /></button>
    </div>
    <Interruptor titulo="Compartir pantalla" ayuda="Recomendado: desactivado." activo={valor.pantalla} disabled={!disponible || ocupado} onCambiar={activo => alCambiar('pantalla', activo)} />
    <Interruptor titulo="Activar su micrófono" ayuda="Si está apagado, das la palabra tú." activo={valor.microfono} disabled={!disponible || ocupado} onCambiar={activo => alCambiar('microfono', activo)} />
    <Interruptor titulo="Activar su cámara" activo={valor.camara} disabled={!disponible || ocupado} onCambiar={activo => alCambiar('camara', activo)} />
    <Interruptor titulo="Levantar la mano" activo={valor.mano} disabled={ocupado} onCambiar={activo => alCambiar('mano', activo)} />
    <Interruptor titulo="Sala de espera" ayuda="Siempre activa: tú admites a cada persona." activo disabled onCambiar={() => {}} />
    <Aviso titulo={disponible ? 'Los cambios se aplican al instante' : 'Moderación no disponible'}>
      {disponible ? 'El servidor también bloquea lo que desactives.' : 'El servidor de videoconferencia no permite moderar micrófono, cámara ni pantalla.'}
    </Aviso>
  </section>
}

/** S3 9.3 · «¿Expulsar a …?» con motivo opcional; no se le cuenta la asistencia. */
export function DialogoExpulsar({ nombre, ocupado, alCancelar, alExpulsar }: { nombre: string | null; ocupado: boolean; alCancelar: () => void; alExpulsar: (motivo: string) => void }) {
  const [motivo, cambiarMotivo] = useState('')
  return <Dialogo abierto={nombre !== null} onCerrar={alCancelar} titulo={`¿Expulsar a ${nombre ?? ''}?`} acciones={<>
    <button type="button" onClick={alCancelar} className="h-10 rounded-lg px-5 text-sm font-semibold text-brand hover:bg-brand-soft">Cancelar</button>
    <Boton variante="peligro" cargando={ocupado} onClick={() => alExpulsar(motivo.trim())}><UserX className="size-[18px]" aria-hidden />Expulsar</Boton>
  </>}>
    <p className="-mt-3 text-sm text-muted">Saldrá de la sesión y no podrá volver a entrar hoy.</p>
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      <span>Motivo <span className="font-normal text-muted">(opcional)</span></span>
      <input data-autofocus value={motivo} maxLength={300} onChange={evento => cambiarMotivo(evento.target.value)} placeholder="Ej.: comparte contenido inapropiado"
        className="h-10 rounded-lg px-3 font-normal ring-1 ring-muted-3 ring-inset outline-none focus-visible:ring-2 focus-visible:ring-brand-light" />
    </label>
    <Aviso tipo="advertencia" titulo="No se le contará la asistencia de esta sesión">Quedará registrado en la auditoría.</Aviso>
  </Dialogo>
}
