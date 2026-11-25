import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada } from '@/components/ui/Entrada'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { evaluaciones, type PoliticaEvaluacion } from '@/servicios/evaluaciones'

export function PoliticaEvaluacionPagina() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const cache = useQueryClient()
  const clave = ['politicaEvaluacion', id, usuario?.id]
  const consulta = useQuery({ queryKey: clave, queryFn: () => evaluaciones.politica(id), retry: false })
  const cambio = useMutation({
    mutationFn: (entrada: PoliticaEvaluacion) => evaluaciones.actualizarPolitica(id, entrada),
    onSuccess: politica => {
      cache.setQueryData(clave, politica)
      void cache.invalidateQueries({ queryKey: ['curso', id] })
      void cache.invalidateQueries({ queryKey: ['cursos'] })
    },
  })

  return <section className="mx-auto max-w-160 space-y-5 px-4 py-6 sm:py-10">
    <EnlaceVolver to={`/cursos/${id}`}>Volver al curso</EnlaceVolver>
    <h1 className="font-serif text-2xl font-bold text-ink">Configurar evaluaciones</h1>
    {consulta.isPending ? <Cargando texto="Cargando configuración…" /> : consulta.isError ? (
      <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar la configuración.')} onReintentar={consulta.refetch} />
    ) : <PoliticaEvaluacionFormulario key={id} politica={consulta.data} guardar={entrada => cambio.mutateAsync(entrada)} />}
  </section>
}

export function PoliticaEvaluacionFormulario({ politica, guardar }: {
  politica: PoliticaEvaluacion
  guardar: (entrada: PoliticaEvaluacion) => Promise<unknown>
}) {
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting, isSubmitSuccessful } } =
    useForm<PoliticaEvaluacion>({ defaultValues: politica })
  const enviar = handleSubmit(async entrada => {
    try {
      await guardar(entrada)
      reset(entrada, { keepIsSubmitted: true })
    } catch (error) {
      setError('root', { message: mensajeDeError(error, 'No pudimos guardar la configuración.') })
    }
  })

  return <form noValidate onSubmit={enviar} className="space-y-4 rounded-xl border border-line bg-white p-5 sm:p-6">
    <p className="text-sm text-muted">Estos valores se aplican a las evaluaciones que se publiquen después de guardar.</p>
    <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
      <Campo obligatorio etiqueta="Nota mínima sobre 20" error={errors.notaMinima?.message}>
        <Entrada type="number" min={0} max={20} step="any" required defaultValue={politica.notaMinima}
          estado={errors.notaMinima ? 'error' : 'normal'}
          {...register('notaMinima', { valueAsNumber: true, validate: nota => Number.isFinite(nota) && nota >= 0 && nota <= 20 || 'Ingresa una nota entre 0 y 20.' })} />
      </Campo>
      <Campo obligatorio etiqueta="Intentos máximos" error={errors.intentosMaximos?.message}>
        <Entrada type="number" min={1} max={2147483647} required defaultValue={politica.intentosMaximos}
          estado={errors.intentosMaximos ? 'error' : 'normal'}
          {...register('intentosMaximos', { valueAsNumber: true, validate: intentos => Number.isInteger(intentos) && intentos >= 1 && intentos <= 2147483647
            || 'Ingresa un número entero entre 1 y 2147483647.' })} />
      </Campo>
    </fieldset>
    {errors.root?.message && <Aviso tipo="error" titulo="Configuración sin guardar">{errors.root.message}</Aviso>}
    {isSubmitSuccessful && !errors.root && <Aviso tipo="exito" titulo="Configuración guardada" />}
    <Boton type="submit" cargando={isSubmitting}>Guardar configuración</Boton>
  </form>
}
