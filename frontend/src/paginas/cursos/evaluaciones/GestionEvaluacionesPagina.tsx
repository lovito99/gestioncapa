import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { evaluaciones, type EvaluacionAutor, type EvaluacionEntrada, type GestionEvaluaciones } from '@/servicios/evaluaciones'
import { EditorEvaluacion } from './EditorEvaluacion'

export function GestionEvaluacionesPagina() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const cache = useQueryClient()
  const clave = ['gestionEvaluaciones', id, usuario?.id]
  const consulta = useQuery({ queryKey: clave, queryFn: () => evaluaciones.gestion(id), retry: false })
  const [edicion, editar] = useState<string | null>(null)
  const [mensaje, mostrarMensaje] = useState('')
  const guardarEnLista = (resultado: EvaluacionAutor) => {
    cache.setQueryData<GestionEvaluaciones>(clave, gestion => gestion && ({
      ...gestion, evaluaciones: [...gestion.evaluaciones.filter(item => item.id !== resultado.id), resultado],
    }))
    void cache.invalidateQueries({ queryKey: clave })
    void cache.invalidateQueries({ queryKey: ['evaluaciones', id] })
  }
  const guardar = useMutation({
    mutationFn: (entrada: EvaluacionEntrada) => edicion && edicion !== 'nueva'
      ? evaluaciones.editar(id, edicion, entrada)
      : evaluaciones.crear(id, entrada),
    onSuccess: resultado => {
      guardarEnLista(resultado)
      editar(resultado.id)
      mostrarMensaje('Borrador guardado')
    },
  })
  const publicar = useMutation({
    mutationFn: (evaluacionId: string) => evaluaciones.publicar(id, evaluacionId),
    onSuccess: resultado => {
      guardarEnLista(resultado)
      editar(null)
      mostrarMensaje('Evaluación publicada')
    },
  })
  const actual = consulta.data?.evaluaciones.find(item => item.id === edicion)

  function seleccionar(idEvaluacion: string | null) {
    mostrarMensaje('')
    publicar.reset()
    editar(idEvaluacion)
  }

  return <section className="mx-auto max-w-240 space-y-5 px-4 py-6 sm:py-10">
    <EnlaceVolver to={`/cursos/${id}`}>Volver al curso</EnlaceVolver>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-serif text-2xl font-bold text-ink">Gestionar evaluaciones</h1>
      {consulta.data && !edicion && <Boton onClick={() => seleccionar('nueva')}>Nueva evaluación</Boton>}
    </header>
    {mensaje && <Aviso tipo="exito" titulo={mensaje} />}
    {publicar.isError && <Aviso tipo="error" titulo="Evaluación sin publicar">
      {mensajeDeError(publicar.error, 'No pudimos publicar la evaluación.')}
    </Aviso>}
    {consulta.isPending ? <Cargando texto="Cargando evaluaciones…" /> : consulta.isError ? (
      <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar las evaluaciones.')} onReintentar={consulta.refetch} />
    ) : <>
      {edicion && <section className="space-y-4 rounded-xl border border-line bg-white p-5 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-bold text-ink">{actual ? 'Editar borrador' : 'Nueva evaluación'}</h2>
          <Boton variante="secundario" disabled={guardar.isPending || publicar.isPending} onClick={() => seleccionar(null)}>Volver a la lista</Boton>
        </header>
        <EditorEvaluacion key={edicion} evaluacion={actual} modalidad={consulta.data.modalidad}
          lecciones={consulta.data.lecciones} avanceMedido={consulta.data.avanceMedido} guardar={entrada => guardar.mutateAsync(entrada)}
          publicar={actual && !actual.publicada ? () => publicar.mutate(actual.id) : undefined}
          ocupado={guardar.isPending || publicar.isPending} />
      </section>}
      {consulta.data.evaluaciones.length === 0 && !edicion ? <p className="text-sm text-muted">Aún no hay evaluaciones para este curso.</p> :
        <ul className="space-y-3">
          {consulta.data.evaluaciones.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
            <div className="space-y-1">
              <h2 className="font-semibold text-ink">{item.titulo}</h2>
              <p className="text-sm text-muted">{item.preguntas.length} {item.preguntas.length === 1 ? 'pregunta' : 'preguntas'}
                {item.oficial ? ' · Cuestionario oficial' : ''}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tono={item.publicada ? 'exito' : 'marca'}>{item.publicada ? 'Publicada' : 'Borrador'}</Etiqueta>
              {!item.publicada && <Boton variante="secundario" disabled={edicion === item.id || guardar.isPending || publicar.isPending}
                onClick={() => seleccionar(item.id)}>Editar borrador</Boton>}
            </div>
          </li>)}
        </ul>}
    </>}
  </section>
}
