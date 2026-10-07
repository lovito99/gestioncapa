import { zodResolver } from '@hookform/resolvers/zod'
import { Globe } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Campo, type EstadoCampo } from '@/components/ui/Campo'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { esApiError } from '@/lib/api'
import { useClase, useGuardarClase, useInstructores } from '@/servicios/clases'
import { CODIGOS_ERROR, type ClaseEntrada } from '@/types/api'

const esquema = z
  .object({
    nombre: z.string().trim().min(1, 'Ingresa el nombre de la clase'),
    instructorId: z.string().min(1, 'Selecciona un instructor'),
    fecha: z.string().min(1, 'Ingresa la fecha de la clase'),
    horaInicio: z.string().min(1, 'Ingresa la hora de inicio'),
    horaFin: z.string().min(1, 'Ingresa la hora de fin'),
    lugar: z.string().trim().min(1, 'Ingresa el lugar'),
  })
  .refine((d) => !d.horaInicio || !d.horaFin || d.horaFin > d.horaInicio, {
    path: ['horaFin'],
    message: 'La hora de fin debe ser posterior a la de inicio',
  })

type Formulario = z.infer<typeof esquema>
const VACIO: Formulario = { nombre: '', instructorId: '', fecha: '', horaInicio: '', horaFin: '', lugar: '' }

const MENSAJE_INCOMPLETO = 'No se pudo guardar la clase. Completa los campos obligatorios marcados.'

export function ClaseFormPagina() {
  const { id } = useParams()
  const esEdicion = Boolean(id)
  const clase = useClase(id ?? '')
  const instructores = useInstructores()

  if (esEdicion && clase.isPending) return <Contenedor><Cargando /></Contenedor>
  if (esEdicion && clase.isError)
    return (
      <Contenedor>
        <ErrorCarga mensaje="No pudimos cargar la clase." onReintentar={clase.refetch} />
      </Contenedor>
    )

  const iniciales: Formulario = clase.data
    ? {
        nombre: clase.data.nombre,
        instructorId: clase.data.instructor.id,
        fecha: clase.data.fecha,
        horaInicio: clase.data.horaInicio,
        horaFin: clase.data.horaFin,
        lugar: clase.data.lugar,
      }
    : VACIO

  return (
    <Contenedor>
      <FormularioClase
        id={id}
        iniciales={iniciales}
        instructores={instructores.data ?? []}
        cargandoInstructores={instructores.isPending}
      />
    </Contenedor>
  )
}

function Contenedor({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pt-8 pb-16 sm:px-6">
      <div className="mx-auto flex max-w-160 flex-col gap-6">{children}</div>
    </div>
  )
}

interface PropsFormulario {
  id?: string
  iniciales: Formulario
  instructores: { id: string; nombre: string }[]
  cargandoInstructores: boolean
}

function FormularioClase({ id, iniciales, instructores, cargandoInstructores }: PropsFormulario) {
  const navegar = useNavigate()
  const guardar = useGuardarClase(id)
  const [aviso, setAviso] = useState<{ mensaje: string; firma: string } | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitted },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: iniciales })

  // El aviso de conflicto solo aplica mientras no cambien instructor, fecha ni horas
  const [instructorId, fecha, horaInicio, horaFin] = useWatch({
    control,
    name: ['instructorId', 'fecha', 'horaInicio', 'horaFin'],
  })
  const firmaActual = [instructorId, fecha, horaInicio, horaFin].join('|')
  const conflicto = aviso?.firma === firmaActual ? aviso.mensaje : null

  const hayErroresDeCampo = Object.keys(errors).length > 0

  const enviar = handleSubmit(
    (datos) => {
      setErrorGeneral(null)
      guardar.mutate(datos satisfies ClaseEntrada, {
        onSuccess: (guardada) => {
          toast.success(id ? 'Clase actualizada.' : `Clase «${guardada.nombre}» creada.`)
          navegar('/coordinador/clases')
        },
        onError: (error) => {
          if (esApiError(error, CODIGOS_ERROR.CONFLICTO_HORARIO)) {
            setAviso({ mensaje: error.message, firma: firmaActual })
          } else if (esApiError(error, CODIGOS_ERROR.VALIDACION)) {
            for (const [campo, mensaje] of Object.entries(error.fields)) {
              setError(campo as keyof Formulario, { message: mensaje })
            }
          } else {
            setErrorGeneral(error.message)
          }
        },
      })
    },
    () => setAviso(null),
  )

  const estado = (campo: keyof Formulario, enConflicto = false): EstadoCampo =>
    errors[campo] ? 'error' : enConflicto && conflicto ? 'advertencia' : 'normal'

  return (
    <>
      <EnlaceVolver to="/coordinador/clases">Volver a clases</EnlaceVolver>

      <header>
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.6px] text-ink-2">
          {id ? 'Editar clase' : 'Nueva clase'}
        </h1>
        <p className="mt-1 text-sm leading-5 text-muted-2">Programa una clase presencial y asigna un instructor</p>
      </header>

      <form
        onSubmit={enviar}
        noValidate
        className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-[0_0_0_1px_rgba(192,199,209,0.6),0_1px_2px_rgba(0,0,0,0.05)]"
      >
        {isSubmitted && hayErroresDeCampo && <Alerta tipo="error">{MENSAJE_INCOMPLETO}</Alerta>}
        {conflicto && (
          <Alerta tipo="conflicto" titulo="Conflicto de horario">
            {conflicto}
          </Alerta>
        )}
        {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}

        <Campo etiqueta="Nombre de la clase" obligatorio error={errors.nombre?.message}>
          <Entrada
            placeholder="Ej.: Seguridad y salud en el trabajo"
            estado={estado('nombre')}
            {...register('nombre')}
          />
        </Campo>

        <Campo etiqueta="Instructor" obligatorio error={errors.instructorId?.message}>
          <Selector
            estado={estado('instructorId', true)}
            disabled={cargandoInstructores}
            className={instructorId ? '' : 'text-muted-3'}
            {...register('instructorId')}
          >
            <option value="">{cargandoInstructores ? 'Cargando instructores…' : 'Selecciona un instructor'}</option>
            {instructores.map((i) => (
              <option key={i.id} value={i.id} className="text-ink">
                {i.nombre}
              </option>
            ))}
          </Selector>
        </Campo>

        <Campo etiqueta="Fecha" obligatorio error={errors.fecha?.message}>
          <Entrada type="date" estado={estado('fecha')} {...register('fecha')} />
        </Campo>

        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Hora de inicio" obligatorio error={errors.horaInicio?.message}>
              <Entrada type="time" estado={estado('horaInicio', true)} {...register('horaInicio')} />
            </Campo>
            <Campo etiqueta="Hora de fin" obligatorio error={errors.horaFin?.message}>
              <Entrada type="time" estado={estado('horaFin', true)} {...register('horaFin')} />
            </Campo>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs leading-4 text-muted-2">
            <Globe className="size-3" aria-hidden />
            Hora de Lima (GMT-5)
          </p>
        </div>

        <Campo etiqueta="Lugar" obligatorio error={errors.lugar?.message}>
          <Entrada placeholder="Ej.: Auditorio principal, piso 2" estado={estado('lugar')} {...register('lugar')} />
        </Campo>

        <div className="mt-6 flex justify-end gap-3 border-t border-[#dae2fd] pt-5.25">
          <Boton variante="secundario" onClick={() => navegar('/coordinador/clases')}>
            Volver
          </Boton>
          <Boton type="submit" cargando={guardar.isPending}>
            Guardar clase
          </Boton>
        </div>
      </form>

    </>
  )
}
