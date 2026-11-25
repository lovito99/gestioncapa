import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, LayoutGrid, MapPin, Video, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Interruptor } from '@/components/ui/Interruptor'
import { cn } from '@/lib/cn'
import { mensajeDeError } from '@/lib/api'
import { cursos, type DetalleCurso, type SalaSesion, type SesionCurso, type SesionEntrada } from '@/servicios/cursos'
import type { ModalidadSesion } from '@/servicios/modalidadCurso'
import { SEDES, sesionesProgramadas, validarSesion, type Errores, type Valores } from './reglasSesion'

const PORCENTAJES = [50, 60, 70, 80, 90, 100] as const

const OPCIONES: { valor: ModalidadSesion; titulo: string; texto: string; Icono: LucideIcon }[] = [
  { valor: 'PRESENCIAL', titulo: 'Presencial', texto: 'En el aula. La asistencia la registra el encargado con QR o DNI.', Icono: MapPin },
  { valor: 'VIRTUAL', titulo: 'Virtual', texto: 'En la sala virtual del CPPP. La asistencia se cuenta sola.', Icono: Video },
  { valor: 'AMBAS', titulo: 'Presencial y virtual', texto: 'En el aula y transmitida a la sala virtual.', Icono: LayoutGrid },
]

/** Recomendado por HU-26: solo el instructor comparte pantalla y da la palabra; mínimo 70 %. */
const SALA_POR_DEFECTO: SalaSesion = { grabacionPrevista: false, pantallaPermitida: false, microfonoPermitido: false, manoPermitida: true, porcentajeMinimo: 70 }

/** Sesiones anteriores al diseño S3 solo traen `lugar` («Aula 3, Sede CPPP Cusco …»): se separa si coincide una sede. */
function valoresIniciales(curso: DetalleCurso, sesion?: SesionCurso): Valores {
  if (!sesion) return { modalidad: 'PRESENCIAL', fecha: '', horaInicio: '', horaFin: '', sede: '', aula: '', encargadoId: curso.instructorId, qrRotatorio: false, sala: SALA_POR_DEFECTO }
  const sede = sesion.sede ?? SEDES.find(s => sesion.lugar.endsWith(s)) ?? ''
  const aula = sesion.aula ?? (sede ? sesion.lugar.slice(0, -sede.length).replace(/,\s*$/, '') : sesion.modalidad === 'VIRTUAL' ? '' : sesion.lugar)
  return {
    modalidad: sesion.modalidad, fecha: sesion.fecha, horaInicio: sesion.horaInicio, horaFin: sesion.horaFin, sede, aula,
    encargadoId: sesion.encargadoId ?? curso.instructorId, qrRotatorio: sesion.qrRotatorio ?? true, sala: { ...SALA_POR_DEFECTO, ...sesion.sala },
  }
}

/** S3 6.1 / 6.2 · Programar o editar una sesión con su propia modalidad (HU-36). */
export function ProgramarSesionPagina() {
  const { id = '', sesionId } = useParams()
  const consulta = useQuery({ queryKey: ['curso', id], queryFn: () => cursos.obtener(id) })
  const encargados = useQuery({ queryKey: ['cursos', 'instructores'], queryFn: cursos.instructores, staleTime: 5 * 60_000 })

  if (consulta.isPending) return <Cargando texto="Cargando el curso…" />
  if (consulta.isError) {
    return <Contenedor id={id} titulo=""><ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el curso.')} onReintentar={consulta.refetch} /></Contenedor>
  }
  const curso = consulta.data
  const sesiones = sesionesProgramadas(curso.sesiones)
  const sesion = sesionId ? curso.sesiones.find(s => s.id === sesionId) : undefined
  if (sesionId && !sesion) {
    return <Contenedor id={id} titulo={curso.titulo}><Aviso tipo="error" titulo="No encontramos esa sesión">Puede que se haya cancelado. Vuelve a la lista de sesiones del curso.</Aviso></Contenedor>
  }
  const numero = sesion ? sesiones.findIndex(s => s.id === sesion.id) + 1 || sesiones.length : sesiones.length + 1
  return (
    <Contenedor id={id} titulo={curso.titulo}>
      <Formulario key={sesion?.id ?? 'nueva'} curso={curso} sesion={sesion} numero={numero}
        encargados={encargados.data ?? []} cargandoEncargados={encargados.isPending} />
    </Contenedor>
  )
}

function Formulario({ curso, sesion, numero, encargados, cargandoEncargados }: {
  curso: DetalleCurso; sesion?: SesionCurso; numero: number; encargados: { id: string; nombre: string }[]; cargandoEncargados: boolean
}) {
  const navegar = useNavigate()
  const cache = useQueryClient()
  const [v, cambiar] = useState<Valores>(() => valoresIniciales(curso, sesion))
  const [errores, cambiarErrores] = useState<Errores>({})
  const [aviso, cambiarAviso] = useState<{ titulo: string; texto: string }>()
  const poner = <K extends keyof Valores>(campo: K, valor: Valores[K]) => {
    cambiar(actual => ({ ...actual, [campo]: valor }))
    if (campo in errores) cambiarErrores(actual => { const resto = { ...actual }; delete resto[campo as keyof Errores]; return resto })
  }
  const ponerSala = <K extends keyof SalaSesion>(campo: K, valor: SalaSesion[K]) => cambiar(actual => ({ ...actual, sala: { ...actual.sala, [campo]: valor } }))

  const guardar = useMutation({
    mutationFn: (entrada: SesionEntrada) => sesion
      ? cursos.editarSesion(sesion.id, { ...entrada, cursoId: curso.id, instructorId: curso.instructorId })
      : cursos.programarSesion(curso.id, entrada),
    onSuccess: async () => {
      await Promise.all([cache.invalidateQueries({ queryKey: ['curso', curso.id] }), cache.invalidateQueries({ queryKey: ['clases'] })])
      toast.success(sesion ? 'Sesión actualizada.' : v.modalidad === 'PRESENCIAL' ? 'Sesión programada.' : 'Sesión programada con su sala virtual.')
      navegar(`/admin/cursos/${curso.id}/sesiones`)
    },
  })

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const resultado = validarSesion(v)
    cambiarErrores(resultado.errores)
    cambiarAviso(resultado.aviso)
    if (resultado.aviso) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    const presencial = v.modalidad !== 'VIRTUAL'
    const virtual = v.modalidad !== 'PRESENCIAL'
    guardar.mutate({
      nombre: sesion?.nombre.trim() || `Sesión ${numero}`,
      fecha: v.fecha, horaInicio: v.horaInicio, horaFin: v.horaFin, modalidad: v.modalidad,
      lugar: presencial ? `${v.aula.trim()}, ${v.sede}` : '',
      ...(presencial && { sede: v.sede, aula: v.aula.trim(), encargadoId: v.encargadoId === curso.instructorId ? null : v.encargadoId, qrRotatorio: v.qrRotatorio }),
      ...(virtual && { sala: v.sala }),
    })
  }

  const presencial = v.modalidad !== 'VIRTUAL'
  const virtual = v.modalidad !== 'PRESENCIAL'
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl leading-8 font-bold text-ink">{sesion ? `Editar sesión ${numero}` : `Programar sesión ${numero}`}</h1>
        <p className="text-sm leading-5 text-muted">{curso.titulo} · Cada sesión puede tener su propia modalidad.</p>
      </div>
      {aviso && <Aviso tipo="error" titulo={aviso.titulo}>{aviso.texto}</Aviso>}
      {guardar.isError && <Aviso tipo="error" titulo="No pudimos guardar la sesión">{mensajeDeError(guardar.error, 'Inténtalo de nuevo en unos minutos.')}</Aviso>}

      <form noValidate onSubmit={enviar} className="flex flex-col gap-6">
        <fieldset disabled={guardar.isPending} className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-6">
          <legend className="sr-only">Datos de la sesión</legend>
          <h2 aria-hidden className="font-serif text-xl leading-7 font-bold text-ink">Datos de la sesión</h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex items-center gap-1 text-sm leading-5 font-semibold text-ink">
              Modalidad de la sesión <span aria-hidden className="text-required">*</span>
            </legend>
            <div className="flex flex-col gap-3 sm:flex-row">
              {OPCIONES.map(({ valor, titulo, texto, Icono }) => {
                const elegida = v.modalidad === valor
                return (
                  <label key={valor} className={cn('flex flex-1 cursor-pointer flex-col gap-2 rounded-lg p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-light',
                    elegida ? 'border-2 border-brand bg-brand-soft p-[15px]' : 'border border-line bg-white hover:bg-surface-2')}>
                    <input type="radio" name="modalidad" value={valor} checked={elegida} onChange={() => poner('modalidad', valor)} className="sr-only" />
                    <span className="flex items-center gap-2">
                      <span className={cn('flex size-9 items-center justify-center rounded-lg', elegida ? 'bg-brand text-white' : 'bg-page text-ink')}>
                        <Icono className="size-5" aria-hidden />
                      </span>
                      <span className="flex-1" />
                      {elegida && <CircleCheck className="size-5 text-brand" aria-hidden />}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className={cn('text-base leading-6 font-medium', elegida ? 'text-brand-ink' : 'text-ink')}>{titulo}</span>
                      <span className="text-sm leading-5 text-muted">{texto}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Fecha" obligatorio error={errores.fecha}>
              <Entrada type="date" value={v.fecha} onChange={e => poner('fecha', e.target.value)} estado={errores.fecha ? 'error' : 'normal'} />
            </Campo>
            <Campo etiqueta="Hora de inicio" obligatorio error={errores.horaInicio}>
              <Entrada type="time" value={v.horaInicio} onChange={e => poner('horaInicio', e.target.value)} estado={errores.horaInicio ? 'error' : 'normal'} />
            </Campo>
            <Campo etiqueta="Hora de fin" obligatorio error={errores.horaFin}>
              <Entrada type="time" value={v.horaFin} onChange={e => poner('horaFin', e.target.value)} estado={errores.horaFin ? 'error' : 'normal'} />
            </Campo>
          </div>

          {presencial && <>
            <Separador titulo="Lugar presencial" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Sede" obligatorio error={errores.sede}>
                <Selector value={v.sede} onChange={e => poner('sede', e.target.value)} estado={errores.sede ? 'error' : 'normal'}>
                  <option value="">Selecciona una sede</option>
                  {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                </Selector>
              </Campo>
              <Campo etiqueta="Aula o referencia" obligatorio error={errores.aula}>
                <Entrada value={v.aula} maxLength={100} placeholder="Ej.: Aula 3, segundo piso" onChange={e => poner('aula', e.target.value)} estado={errores.aula ? 'error' : 'normal'} />
              </Campo>
            </div>
            <Campo etiqueta="Encargado de asistencia" obligatorio error={errores.encargadoId} ayuda="Escaneará el QR personal de cada colegiado o lo buscará por DNI.">
              <Selector value={v.encargadoId} onChange={e => poner('encargadoId', e.target.value)} estado={errores.encargadoId ? 'error' : 'normal'}>
                <option value="">{cargandoEncargados ? 'Cargando…' : 'Selecciona al encargado'}</option>
                {!encargados.some(e => e.id === curso.instructorId) && <option value={curso.instructorId}>{curso.instructorNombre}</option>}
                {encargados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </Selector>
            </Campo>
            <Interruptor titulo="Permitir también el QR rotatorio del instructor" ayuda="Alternativa: el colegiado escanea el QR que proyecta el instructor."
              activo={v.qrRotatorio} onCambiar={valor => poner('qrRotatorio', valor)} />
          </>}

          {virtual && <>
            <Separador titulo="Sala virtual" />
            <Aviso titulo="La sala se crea automáticamente">Solo entran los inscritos con su sesión iniciada en la plataforma, después de pasar por la sala de espera.</Aviso>
            <div className="flex flex-col gap-3.5">
              <Interruptor titulo="Grabar la sesión" ayuda="Se avisará a los participantes antes de iniciar (Ley 29733)."
                activo={v.sala.grabacionPrevista} onCambiar={valor => ponerSala('grabacionPrevista', valor)} />
              <Interruptor titulo="Participantes pueden compartir pantalla" ayuda="Recomendado: desactivado. Solo el instructor comparte."
                activo={v.sala.pantallaPermitida} onCambiar={valor => ponerSala('pantallaPermitida', valor)} />
              <Interruptor titulo="Participantes pueden activar su micrófono" ayuda="Si está desactivado, el instructor da la palabra."
                activo={v.sala.microfonoPermitido} onCambiar={valor => ponerSala('microfonoPermitido', valor)} />
              <Interruptor titulo="Participantes pueden levantar la mano"
                activo={v.sala.manoPermitida} onCambiar={valor => ponerSala('manoPermitida', valor)} />
            </div>
            <Campo etiqueta="Asistencia mínima para contar la sesión" obligatorio>
              <Selector value={v.sala.porcentajeMinimo} onChange={e => ponerSala('porcentajeMinimo', Number(e.target.value))}>
                {PORCENTAJES.map(p => <option key={p} value={p}>{p} % del tiempo conectado</option>)}
              </Selector>
            </Campo>
          </>}
        </fieldset>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link to={`/admin/cursos/${curso.id}/sesiones`} className="inline-flex h-12 items-center justify-center rounded-lg px-5 text-base font-semibold text-brand hover:bg-brand-soft sm:h-10 sm:text-sm">Cancelar</Link>
          <Boton type="submit" cargando={guardar.isPending} className="h-12 text-base sm:h-10 sm:text-sm">Guardar sesión</Boton>
        </div>
      </form>
    </>
  )
}

function Separador({ titulo }: { titulo: string }) {
  return <>
    <hr className="border-line" />
    <h3 className="text-base leading-6 font-semibold text-ink">{titulo}</h3>
  </>
}

function Contenedor({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-200 flex-col gap-6 px-4 pt-6 pb-16 wrap-anywhere sm:pt-10">
      <EnlaceVolver to={`/admin/cursos/${id}/sesiones`}>{titulo ? `Volver a «${titulo}»` : 'Volver a las sesiones'}</EnlaceVolver>
      {children}
    </div>
  )
}
