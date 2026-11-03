import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Dialogo } from '@/components/ui/Dialogo'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta, EtiquetaEstadoCurso } from '@/components/ui/Etiqueta'
import { esApiError, mensajeDeError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fechaCorta, rangoHorario } from '@/lib/formato'
import {
  CATEGORIAS_CURSO,
  CERTIFICADOS_CURSO,
  MODALIDADES_CURSO,
  cursos,
  leerPdfBase64,
  type CursoEntrada,
  type DetalleCurso,
  type MaterialCurso,
  type MaterialEntrada,
} from '@/servicios/cursos'

const numero = (requerido: string) => z.number({ error: requerido })

const esquema = z
  .object({
    titulo: z.string().trim().min(1, 'Ingresa el nombre del curso.').max(160),
    descripcion: z.string().trim().min(1, 'Ingresa la descripción del curso.').max(5000),
    categoria: z.string().min(1, 'Selecciona una categoría.'),
    modalidad: z.enum(['PRESENCIAL', 'VIRTUAL', 'HIBRIDA'], { error: 'Selecciona la modalidad.' }),
    instructorId: z.string().min(1, 'Selecciona un instructor.'),
    fechaInicio: z.string().min(1, 'Ingresa la fecha de inicio.'),
    fechaFin: z.string().min(1, 'Ingresa la fecha de fin.'),
    horasLectivas: numero('Ingresa las horas lectivas.').gt(0, 'Las horas lectivas deben ser mayores que 0.').max(10000),
    costo: numero('Ingresa el costo; usa 0.00 si es gratuito.').min(0, 'El costo no puede ser negativo.').multipleOf(0.01, 'Usa como máximo dos decimales.'),
    cupos: numero('Ingresa los cupos.').int('Los cupos deben ser un número entero.').min(1, 'Debe haber al menos 1 cupo.').max(1000000),
    tipoCertificado: z.enum(['PARTICIPACION', 'APROBACION'], { error: 'Selecciona el tipo de certificado.' }),
    notaMinima: numero('Ingresa la nota mínima.').min(0, 'La nota mínima va de 0 a 20.').max(20, 'La nota mínima va de 0 a 20.'),
  })
  .refine((d) => !d.fechaInicio || !d.fechaFin || d.fechaFin >= d.fechaInicio, {
    path: ['fechaFin'],
    message: 'La fecha de fin no puede ser anterior a la de inicio.',
  })
type Formulario = z.infer<typeof esquema>

/** Módulo en edición: `id` solo existe si ya está guardado en el servidor. */
type ModuloBorrador = { clave: string; id?: string; titulo: string }

const valoresDe = (curso?: DetalleCurso): Partial<Formulario> =>
  curso
    ? {
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        categoria: curso.categoria,
        modalidad: curso.modalidad,
        instructorId: curso.instructorId,
        fechaInicio: curso.fechaInicio ?? '',
        fechaFin: curso.fechaFin ?? '',
        horasLectivas: curso.horasLectivas,
        costo: curso.costo,
        cupos: curso.cupos,
        tipoCertificado: curso.tipoCertificado,
        notaMinima: curso.notaMinima,
      }
    : // Selectores sin opción elegida, como en el Figma; zod rechaza el valor vacío
      { categoria: '', modalidad: '' as Formulario['modalidad'], instructorId: '', tipoCertificado: 'PARTICIPACION', notaMinima: 14 }

const modulosDe = (curso?: DetalleCurso): ModuloBorrador[] =>
  (curso?.modulos ?? []).toSorted((a, b) => a.orden - b.orden).map((m) => ({ clave: m.id, id: m.id, titulo: m.titulo }))

const tarjeta = 'flex flex-col rounded-xl border border-line bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:p-6'
const enlaceSecundario =
  'inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-semibold text-ink-2 ring-1 ring-line-2 ring-inset hover:bg-surface-2'
const fechaSesion = (fecha: string) => `${fechaCorta(fecha)} ${fecha.slice(0, 4)}`

/** 2.2 / 2.3 · Sesiones del curso: son las clases programadas con este curso (3.2). */
function SesionesCurso({ curso }: { curso: DetalleCurso }) {
  const sesiones = curso.sesiones.filter((s) => s.estado === 'PROGRAMADA')
  return (
    <section className={cn(tarjeta, 'gap-3')} aria-labelledby="titulo-sesiones">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="titulo-sesiones" className="font-serif text-xl font-bold text-ink">
            Sesiones del curso
          </h2>
          <p className="text-[13px] text-muted">
            {sesiones.length === 1 ? '1 sesión programada' : `${sesiones.length} sesiones programadas`}
          </p>
        </div>
        {curso.estado !== 'CERRADO' && (
          <Link to={`/admin/clases/nueva?curso=${curso.id}`} className={enlaceSecundario}>
            Programar sesión
          </Link>
        )}
      </div>
      {sesiones.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay sesiones. Programa la primera para registrar la asistencia del curso.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-120 text-left text-sm">
            <thead className="bg-surface-3 text-xs font-medium tracking-[0.6px] text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Horario</th>
                <th className="px-4 py-3 font-medium">Lugar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sesiones.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-ink">{fechaSesion(s.fecha)}</td>
                  <td className="px-4 py-3 text-ink">{rangoHorario(s.horaInicio, s.horaFin)}</td>
                  <td className="px-4 py-3 text-ink">{s.lugar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** 2.1 Nuevo curso y 2.2 / 2.3 Editar curso (borrador o publicado), según haya `:id`. */
export function CursoFormPagina() {
  const { id } = useParams()
  const curso = useQuery({ queryKey: ['curso', id], queryFn: () => cursos.obtener(id!), enabled: !!id })

  if (id && curso.isPending) return <Cargando texto="Cargando curso…" />
  if (id && curso.isError)
    return <ErrorCarga mensaje={mensajeDeError(curso.error, 'No pudimos cargar el curso.')} onReintentar={curso.refetch} />
  return <FormularioCurso key={curso.data?.id ?? 'nuevo'} curso={curso.data} />
}

function FormularioCurso({ curso }: { curso?: DetalleCurso }) {
  const navegar = useNavigate()
  const cache = useQueryClient()
  const instructores = useQuery({ queryKey: ['cursos', 'instructores'], queryFn: cursos.instructores })
  const [modulos, cambiarModulos] = useState<ModuloBorrador[]>(() => modulosDe(curso))
  const [errorModulos, cambiarErrorModulos] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: valoresDe(curso) })

  const guardar = useMutation({
    mutationFn: async ({ datos, publicar }: { datos: Formulario; publicar: boolean }) => {
      const entrada: CursoEntrada = { ...datos, modulos: modulos.map(({ id, titulo }) => ({ id, titulo: titulo.trim() })) }
      const guardado = curso ? await cursos.actualizar(curso.id, entrada) : await cursos.crear(entrada)
      return publicar ? cursos.publicar(guardado.id) : guardado
    },
    onSuccess: async (guardado, { publicar }) => {
      cache.setQueryData(['curso', guardado.id], guardado)
      await cache.invalidateQueries({ queryKey: ['cursos'] })
      if (!curso) {
        toast.success('Curso guardado como borrador.')
        navegar(`/admin/cursos/${guardado.id}/editar`, { replace: true })
        return
      }
      // Los módulos nuevos ya tienen id: desde ahora se les puede agregar material
      cambiarModulos(modulosDe(guardado))
      reset(valoresDe(guardado))
      toast.success(publicar ? 'Curso publicado. Ya aparece en el catálogo.' : 'Cambios guardados.')
    },
    onError: (error) => {
      if (!esApiError(error)) return
      for (const [campo, mensaje] of Object.entries(error.fields)) {
        if (campo in esquema.shape) setError(campo as keyof Formulario, { message: mensaje })
      }
    },
  })

  const enviar = (publicar: boolean) =>
    handleSubmit(
      (datos) => {
        if (validarModulos()) guardar.mutate({ datos, publicar })
      },
      () => validarModulos(),
    )
  const validarModulos = () => {
    const mensaje =
      modulos.length === 0
        ? 'Agrega al menos un módulo.'
        : modulos.some((m) => !m.titulo.trim())
          ? 'Escribe el nombre de cada módulo.'
          : ''
    cambiarErrorModulos(mensaje)
    return !mensaje
  }

  const hayErrores = Object.keys(errors).length > 0 || !!errorModulos
  const errorServidor = guardar.isError && !hayErrores ? mensajeDeError(guardar.error, 'No pudimos guardar el curso.') : null
  const publicado = curso?.estado === 'PUBLICADO'
  const cerrado = curso?.estado === 'CERRADO'
  const estado = (campo: keyof Formulario) => (errors[campo] ? 'error' : 'normal')

  return (
    <div className="mx-auto flex max-w-200 flex-col gap-6 px-4 pt-8 pb-16 wrap-anywhere sm:pt-12">
      <EnlaceVolver to="/cursos">Volver a cursos</EnlaceVolver>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">{curso ? 'Editar curso' : 'Nuevo curso'}</h1>
          {curso && <EtiquetaEstadoCurso estado={curso.estado} />}
        </div>
        <p className="text-sm text-muted">
          {curso ? 'Modifica los datos y los módulos del curso.' : 'Completa los datos del curso. Se guardará como borrador.'}
        </p>
      </div>

      {hayErrores ? (
        <Alerta tipo="error">No se pudo guardar el curso. Revisa los campos marcados.</Alerta>
      ) : errorServidor ? (
        <Alerta tipo="error">{errorServidor}</Alerta>
      ) : curso ? (
        cerrado ? (
          <Alerta tipo="informacion">
            El curso está cerrado y sus certificados ya fueron emitidos.{' '}
            <Link to={`/admin/cursos/${curso.id}/certificados`} className="font-semibold underline">
              Ver certificados
            </Link>
          </Alerta>
        ) : publicado ? (
          <Alerta tipo="exito">El curso está publicado y aparece en el catálogo.</Alerta>
        ) : (
          <Alerta tipo="informacion">
            El curso está en borrador y no aparece en el catálogo. Al publicarlo, los colegiados podrán verlo.
          </Alerta>
        )
      ) : null}

      <form id="formulario-curso" noValidate onSubmit={enviar(false)} className="contents">
        <fieldset disabled={guardar.isPending} className={cn(tarjeta, 'min-w-0 gap-4')}>
          <h2 className="font-serif text-xl font-bold text-ink">Datos del curso</h2>
          <Campo etiqueta="Nombre del curso" obligatorio error={errors.titulo?.message}>
            <Entrada placeholder="Ej.: Evaluación formativa en el aula" maxLength={160} estado={estado('titulo')} {...register('titulo')} />
          </Campo>
          <Campo etiqueta="Descripción" obligatorio error={errors.descripcion?.message}>
            <Entrada placeholder="Describe de qué trata el curso" maxLength={5000} estado={estado('descripcion')} {...register('descripcion')} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Categoría" obligatorio error={errors.categoria?.message}>
              <Selector estado={estado('categoria')} {...register('categoria')}>
                <option value="" disabled>
                  Selecciona una categoría
                </option>
                {/* Un curso antiguo puede tener una categoría que ya no está en la lista */}
                {[...new Set([...CATEGORIAS_CURSO, ...(curso ? [curso.categoria] : [])])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Modalidad" obligatorio error={errors.modalidad?.message}>
              <Selector estado={estado('modalidad')} {...register('modalidad')}>
                <option value="" disabled>
                  Selecciona la modalidad
                </option>
                {Object.entries(MODALIDADES_CURSO).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </Selector>
            </Campo>
          </div>
          <Campo etiqueta="Instructor asignado" obligatorio error={errors.instructorId?.message}>
            <Selector estado={estado('instructorId')} disabled={instructores.isPending || instructores.isError} {...register('instructorId')}>
              <option value="" disabled>
                {instructores.isPending ? 'Cargando instructores…' : 'Selecciona un instructor'}
              </option>
              {instructores.data?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          {instructores.isError && (
            <p role="alert" className="-mt-2 text-xs text-danger">
              No pudimos cargar los instructores.{' '}
              <button type="button" className="font-semibold underline" onClick={() => void instructores.refetch()}>
                Intentar de nuevo
              </button>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Fecha de inicio" obligatorio error={errors.fechaInicio?.message}>
              <Entrada type="date" estado={estado('fechaInicio')} {...register('fechaInicio')} />
            </Campo>
            <Campo etiqueta="Fecha de fin" obligatorio error={errors.fechaFin?.message}>
              <Entrada type="date" estado={estado('fechaFin')} {...register('fechaFin')} />
            </Campo>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Horas lectivas" obligatorio error={errors.horasLectivas?.message} ayuda="Debe ser mayor que 0.">
              <Entrada type="number" inputMode="decimal" min="0" step="any" placeholder="Ej.: 24" estado={estado('horasLectivas')} {...register('horasLectivas', { valueAsNumber: true })} />
            </Campo>
            <Campo etiqueta="Costo (S/)" obligatorio error={errors.costo?.message} ayuda="0.00 si el curso es gratuito.">
              <Entrada type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" estado={estado('costo')} {...register('costo', { valueAsNumber: true })} />
            </Campo>
            <Campo etiqueta="Cupos" obligatorio error={errors.cupos?.message}>
              <Entrada type="number" inputMode="numeric" min="1" step="1" placeholder="Ej.: 30" estado={estado('cupos')} {...register('cupos', { valueAsNumber: true })} />
            </Campo>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Tipo de certificado" obligatorio error={errors.tipoCertificado?.message}>
              <Selector estado={estado('tipoCertificado')} {...register('tipoCertificado')}>
                {Object.entries(CERTIFICADOS_CURSO).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Nota mínima" obligatorio error={errors.notaMinima?.message} ayuda="Escala de 0 a 20. Si no la cambias, se usa 14.">
              <Entrada type="number" inputMode="decimal" min="0" max="20" step="any" estado={estado('notaMinima')} {...register('notaMinima', { valueAsNumber: true })} />
            </Campo>
          </div>
        </fieldset>
      </form>

      <Modulos
        curso={curso}
        modulos={modulos}
        cambiarModulos={(cambio) => {
          cambiarModulos(cambio)
          cambiarErrorModulos('')
        }}
        error={errorModulos}
        bloqueado={guardar.isPending}
      />

      {curso && <SesionesCurso curso={curso} />}

      <div className="flex flex-wrap justify-end gap-3">
        {/* 2.3 → 2.4: el curso publicado se cierra para emitir los certificados */}
        {publicado && (
          <Link to={`/admin/cursos/${curso.id}/cerrar`} className={enlaceSecundario}>
            Cerrar curso
          </Link>
        )}
        {cerrado && (
          <Link to={`/admin/cursos/${curso.id}/certificados`} className={enlaceSecundario}>
            Ver certificados
          </Link>
        )}
        <Boton variante="secundario" onClick={() => navegar('/cursos')}>
          Cancelar
        </Boton>
        {!curso ? (
          <Boton type="submit" form="formulario-curso" cargando={guardar.isPending}>
            Guardar borrador
          </Boton>
        ) : publicado || cerrado ? (
          <Boton type="submit" form="formulario-curso" cargando={guardar.isPending}>
            Guardar cambios
          </Boton>
        ) : (
          <>
            <Boton type="submit" form="formulario-curso" variante="secundario" disabled={guardar.isPending}>
              Guardar cambios
            </Boton>
            <Boton cargando={guardar.isPending} onClick={() => void enviar(true)()}>
              Publicar curso
            </Boton>
          </>
        )}
      </div>
    </div>
  )
}

function Modulos({
  curso,
  modulos,
  cambiarModulos,
  error,
  bloqueado,
}: {
  curso?: DetalleCurso
  modulos: ModuloBorrador[]
  cambiarModulos: (cambio: (actuales: ModuloBorrador[]) => ModuloBorrador[]) => void
  error: string
  bloqueado: boolean
}) {
  const [arrastrado, cambiarArrastrado] = useState<number | null>(null)
  const [editando, cambiarEditando] = useState<string | null>(null)
  const [abierto, cambiarAbierto] = useState<string | null>(() => modulos[0]?.clave ?? null)

  const mover = (desde: number, hasta: number) =>
    cambiarModulos((actuales) => {
      if (hasta < 0 || hasta >= actuales.length || desde === hasta) return actuales
      const nuevos = [...actuales]
      const [modulo] = nuevos.splice(desde, 1)
      nuevos.splice(hasta, 0, modulo!)
      return nuevos
    })
  const agregar = () => {
    const clave = `nuevo-${crypto.randomUUID()}`
    cambiarModulos((actuales) => [...actuales, { clave, titulo: '' }])
    cambiarEditando(clave)
  }

  return (
    <section className={cn(tarjeta, 'gap-3')} aria-labelledby="titulo-modulos">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="titulo-modulos" className="font-serif text-xl font-bold text-ink">
            Módulos
          </h2>
          <p className="text-[13px] text-muted">Arrastra para cambiar el orden. El material lo agrega el instructor asignado.</p>
        </div>
        <Boton variante="secundario" onClick={agregar} disabled={bloqueado || modulos.length >= 100}>
          + Agregar módulo
        </Boton>
      </div>

      {modulos.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay módulos. Agrega el primero.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {modulos.map((modulo, indice) => (
            <li
              key={modulo.clave}
              draggable={!bloqueado && editando !== modulo.clave}
              onDragStart={() => cambiarArrastrado(indice)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastrado !== null) mover(arrastrado, indice)
                cambiarArrastrado(null)
              }}
              onDragEnd={() => cambiarArrastrado(null)}
              className={cn(
                'flex flex-col gap-2.5 rounded-lg border border-line bg-white px-4 py-3',
                arrastrado === indice && 'opacity-50',
              )}
            >
              <ModuloFila
                curso={curso}
                modulo={modulo}
                indice={indice}
                total={modulos.length}
                editando={editando === modulo.clave}
                abierto={abierto === modulo.clave}
                bloqueado={bloqueado}
                alEditar={(valor) => cambiarEditando(valor ? modulo.clave : null)}
                alAbrir={() => cambiarAbierto((actual) => (actual === modulo.clave ? null : modulo.clave))}
                alRenombrar={(titulo) =>
                  cambiarModulos((actuales) => actuales.map((m) => (m.clave === modulo.clave ? { ...m, titulo } : m)))
                }
                alQuitar={() => cambiarModulos((actuales) => actuales.filter((m) => m.clave !== modulo.clave))}
                alMover={(paso) => mover(indice, indice + paso)}
              />
            </li>
          ))}
        </ol>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </section>
  )
}

function ModuloFila({
  curso,
  modulo,
  indice,
  total,
  editando,
  abierto,
  bloqueado,
  alEditar,
  alAbrir,
  alRenombrar,
  alQuitar,
  alMover,
}: {
  curso?: DetalleCurso
  modulo: ModuloBorrador
  indice: number
  total: number
  editando: boolean
  abierto: boolean
  bloqueado: boolean
  alEditar: (valor: boolean) => void
  alAbrir: () => void
  alRenombrar: (titulo: string) => void
  alQuitar: () => void
  alMover: (paso: -1 | 1) => void
}) {
  const idPanel = useId()
  const guardado = modulo.id ? curso?.modulos.find((m) => m.id === modulo.id) : undefined
  const materiales = guardado?.materiales ?? []
  // En "Nuevo curso" todavía no hay material: solo se agrega a módulos ya guardados
  const conMaterial = !!curso
  const nombre = modulo.titulo.trim() || `Módulo ${indice + 1}`
  const botonIcono = 'flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40'

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted" aria-hidden />
        <Etiqueta>Módulo {indice + 1}</Etiqueta>
        {editando ? (
          <div className="flex min-w-0 flex-1 basis-56 items-center gap-2">
            <Entrada
              autoFocus
              aria-label={`Nombre del módulo ${indice + 1}`}
              maxLength={160}
              placeholder="Nombre del módulo"
              value={modulo.titulo}
              onChange={(e) => alRenombrar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  alEditar(false)
                }
              }}
              className="h-10 sm:h-8"
            />
            <Boton variante="secundario" className="h-10 px-3 sm:h-8" onClick={() => alEditar(false)}>
              Listo
            </Boton>
            <button type="button" onClick={alQuitar} disabled={bloqueado} className="text-[13px] font-semibold text-danger hover:underline">
              Quitar
            </button>
          </div>
        ) : conMaterial && modulo.id ? (
          <button
            type="button"
            onClick={alAbrir}
            aria-expanded={abierto}
            aria-controls={idPanel}
            className="min-w-0 flex-1 basis-40 text-left text-sm font-semibold text-ink hover:text-brand"
          >
            {nombre}
          </button>
        ) : (
          <p className={cn('min-w-0 flex-1 basis-40 text-sm font-semibold', modulo.titulo.trim() ? 'text-ink' : 'text-muted')}>
            {modulo.titulo.trim() || 'Sin nombre'}
          </p>
        )}
        {!editando && (
          <div className="ml-auto flex items-center gap-1">
            {conMaterial && modulo.id && (
              <span className="mr-2 text-[13px] whitespace-nowrap text-muted">
                {materiales.length} {materiales.length === 1 ? 'material' : 'materiales'}
              </span>
            )}
            <button type="button" className={botonIcono} disabled={bloqueado || indice === 0} onClick={() => alMover(-1)} aria-label={`Subir ${nombre}`}>
              <ArrowUp className="size-3.5" strokeWidth={2.5} aria-hidden />
            </button>
            <button type="button" className={botonIcono} disabled={bloqueado || indice === total - 1} onClick={() => alMover(1)} aria-label={`Bajar ${nombre}`}>
              <ArrowDown className="size-3.5" strokeWidth={2.5} aria-hidden />
            </button>
            <button type="button" onClick={() => alEditar(true)} disabled={bloqueado} className="ml-2 text-[13px] font-semibold text-brand hover:underline">
              Editar
            </button>
          </div>
        )}
      </div>

      {conMaterial && abierto && !editando && (
        <div id={idPanel} className="flex flex-col gap-2.5">
          {guardado ? (
            <MaterialesModulo cursoId={curso.id} moduloId={guardado.id} materiales={materiales} />
          ) : (
            <p className="text-[13px] text-muted">Guarda los cambios para agregar material a este módulo.</p>
          )}
        </div>
      )}
    </>
  )
}

const TIPOS_MATERIAL = { PDF: 'PDF', ENLACE: 'Enlace', VIDEO: 'Video' } as const
type TipoMaterial = keyof typeof TIPOS_MATERIAL

function MaterialesModulo({ cursoId, moduloId, materiales }: { cursoId: string; moduloId: string; materiales: MaterialCurso[] }) {
  const cache = useQueryClient()
  const [agregando, cambiarAgregando] = useState<TipoMaterial | null>(null)
  const [aQuitar, cambiarAQuitar] = useState<MaterialCurso | null>(null)
  const quitar = useMutation({
    mutationFn: (material: MaterialCurso) => cursos.quitarMaterial(cursoId, moduloId, material.id),
    onSuccess: async () => {
      cambiarAQuitar(null)
      await cache.invalidateQueries({ queryKey: ['curso', cursoId] })
      toast.success('Material quitado.')
    },
  })

  return (
    <>
      {materiales.map((material) => (
        <div key={material.id} className="flex items-center gap-2.5 rounded-lg bg-page px-3 py-2">
          <Etiqueta tono="marca">{TIPOS_MATERIAL[material.tipo]}</Etiqueta>
          {material.url ? (
            <a href={material.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 text-sm text-ink hover:text-brand hover:underline">
              {material.titulo} <span className="sr-only">(abre otra pestaña)</span>
            </a>
          ) : (
            <span className="min-w-0 flex-1 text-sm text-ink">{material.titulo}</span>
          )}
          <button type="button" onClick={() => cambiarAQuitar(material)} className="text-[13px] font-semibold text-danger hover:underline">
            Quitar
          </button>
        </div>
      ))}

      {agregando ? (
        <FormularioMaterial
          cursoId={cursoId}
          moduloId={moduloId}
          tipo={agregando}
          alTerminar={() => cambiarAgregando(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-brand">+ Agregar material:</span>
          {(['PDF', 'ENLACE', 'VIDEO'] as const).map((tipo) => (
            <Boton key={tipo} variante="secundario" className="h-10 sm:h-8" onClick={() => cambiarAgregando(tipo)}>
              {tipo === 'VIDEO' ? 'Video por URL' : TIPOS_MATERIAL[tipo]}
            </Boton>
          ))}
        </div>
      )}

      <Dialogo
        abierto={!!aQuitar}
        onCerrar={() => cambiarAQuitar(null)}
        titulo="¿Quitar este material?"
        acciones={
          <>
            <Boton variante="secundario" data-autofocus onClick={() => cambiarAQuitar(null)}>
              Cancelar
            </Boton>
            <Boton variante="peligro" cargando={quitar.isPending} onClick={() => aQuitar && quitar.mutate(aQuitar)}>
              Quitar material
            </Boton>
          </>
        }
      >
        <p>
          «{aQuitar?.titulo}» dejará de estar disponible para los participantes del curso.
        </p>
        {quitar.isError && <p role="alert" className="mt-2 text-danger">{mensajeDeError(quitar.error, 'No pudimos quitar el material.')}</p>}
      </Dialogo>
    </>
  )
}

function FormularioMaterial({
  cursoId,
  moduloId,
  tipo,
  alTerminar,
}: {
  cursoId: string
  moduloId: string
  tipo: TipoMaterial
  alTerminar: () => void
}) {
  const cache = useQueryClient()
  const agregar = useMutation({
    mutationFn: async (entrada: MaterialEntrada) => cursos.material(cursoId, moduloId, entrada),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['curso', cursoId] })
      toast.success('Material agregado.')
      alTerminar()
    },
  })
  const [errorLocal, cambiarErrorLocal] = useState('')

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const titulo = String(datos.get('titulo') ?? '').trim()
    cambiarErrorLocal('')
    try {
      if (tipo === 'PDF') {
        const archivo = datos.get('archivo')
        if (!(archivo instanceof File) || !archivo.size) throw new Error('Selecciona un archivo PDF.')
        agregar.mutate({ titulo, tipo, contenidoBase64: await leerPdfBase64(archivo) })
      } else {
        agregar.mutate({ titulo, tipo, url: String(datos.get('url') ?? '').trim() })
      }
    } catch (fallo) {
      cambiarErrorLocal(fallo instanceof Error ? fallo.message : 'No pudimos leer el archivo.')
    }
  }
  const error = errorLocal || (agregar.isError ? mensajeDeError(agregar.error, 'No pudimos agregar el material.') : '')

  return (
    <form onSubmit={(e) => void guardar(e)} className="rounded-lg border border-line bg-page p-3">
      <fieldset disabled={agregar.isPending} className="grid min-w-0 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-[13px] font-semibold text-ink">
          Agregar {tipo === 'VIDEO' ? 'video por URL' : TIPOS_MATERIAL[tipo].toLowerCase()}
        </legend>
        <Campo etiqueta="Título del material" obligatorio>
          <Entrada name="titulo" required maxLength={160} autoFocus />
        </Campo>
        {tipo === 'PDF' ? (
          <Campo etiqueta="Archivo PDF (hasta 5 MB)" obligatorio>
            <Entrada name="archivo" type="file" accept="application/pdf,.pdf" required className="h-auto py-2 sm:h-auto" />
          </Campo>
        ) : (
          <Campo etiqueta="URL" obligatorio>
            <Entrada name="url" type="url" pattern="https://.*" maxLength={2048} required placeholder="https://…" />
          </Campo>
        )}
        {error && (
          <p role="alert" className="text-xs text-danger sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Boton type="submit" cargando={agregar.isPending}>
            Agregar
          </Boton>
          <Boton variante="secundario" onClick={alTerminar}>
            Cancelar
          </Boton>
        </div>
      </fieldset>
    </form>
  )
}

