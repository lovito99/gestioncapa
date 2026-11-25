import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Dialogo } from '@/components/ui/Dialogo'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { esApiError, mensajeDeError } from '@/lib/api'
import { cursos, type FilaCierre } from '@/servicios/cursos'
import { AvisoDialogo, Celda, CampoMotivo, DatosDialogo, NotaEvaluacion, ResumenCurso, Tabla } from './piezas'

const asistencia = (f: FilaCierre) => `${f.presentes} de ${f.sesiones} (${f.porcentaje} %)`

/** El cierre aplica los requisitos del curso y permite excepciones en constancias de participación. */
export function CerrarCursoPagina() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const cache = useQueryClient()
  const cierre = useQuery({ queryKey: ['curso', id, 'cierre'], queryFn: () => cursos.cierre(id), retry: false })
  const [excepciones, cambiarExcepciones] = useState<Record<string, string>>({})
  const [enDialogo, cambiarEnDialogo] = useState<FilaCierre | null>(null)

  const cerrar = useMutation({
    mutationFn: () => cursos.cerrar(id, Object.entries(excepciones).map(([agremiadoId, motivo]) => ({ agremiadoId, motivo }))),
    onSuccess: async ({ emitidos,retenidos }) => {
      await Promise.all([cache.invalidateQueries({ queryKey: ['curso', id] }), cache.invalidateQueries({ queryKey: ['cursos'] })])
      toast.success(`Curso cerrado. Se emitieron ${emitidos} ${emitidos === 1 ? 'certificado' : 'certificados'}.${retenidos?` ${retenidos} constancia(s) retenida(s) por pago.`:''}`)
      navegar(`/admin/cursos/${id}/certificados`, { replace: true })
    },
  })

  if (cierre.isPending) return <Cargando texto="Calculando los requisitos del curso…" />
  if (cierre.isError) {
    return (
      <Contenedor id={id}>
        {esApiError(cierre.error, 'CURSO_CERRADO') ? (
          <Alerta tipo="informacion">
            {cierre.error.message}{' '}
            <button type="button" className="font-semibold underline" onClick={() => navegar(`/admin/cursos/${id}/certificados`)}>
              Ver certificados
            </button>
          </Alerta>
        ) : (
          <ErrorCarga mensaje={mensajeDeError(cierre.error, 'No pudimos cargar el cierre del curso.')} onReintentar={cierre.refetch} />
        )}
      </Contenedor>
    )
  }

  const { curso, requisitoAsistencia, filas, evaluacionIndividual } = cierre.data
  if (evaluacionIndividual) return <Navigate to={`/admin/cursos/${id}/certificados`} replace />
  const cumplen = filas.filter((f) => f.cumple).length
  const aprobacion = curso.tipoCertificado === 'APROBACION'

  return (
    <Contenedor id={id}>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">Cerrar curso</h1>
        <ResumenCurso curso={curso} />
      </div>
      <Alerta tipo="informacion">
        Asistencia mínima en las sesiones de este curso: {requisitoAsistencia} %.
        {aprobacion && ' También se requiere una evaluación aprobada.'}
      </Alerta>
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
        {filas.length} {filas.length === 1 ? 'inscrito' : 'inscritos'}:
        <Etiqueta tono="exito">{cumplen} {cumplen === 1 ? 'cumple' : 'cumplen'}</Etiqueta>
        <Etiqueta tono="peligro">{filas.length - cumplen} no {filas.length - cumplen === 1 ? 'cumple' : 'cumplen'}</Etiqueta>
      </p>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-line bg-white px-5 py-8 text-center text-sm text-muted">Este curso no tiene inscritos.</p>
      ) : (
        <Tabla cabeceras={['Nombre', 'Asistencia', 'Resultado', 'Motivo', 'Acción']}>
          {filas.map((f) => {
            const motivo = excepciones[f.agremiado.id]
            const impedimentos = []
            if (!f.cumple && (f.sesiones === 0 || f.porcentaje < requisitoAsistencia)) {
              impedimentos.push(`Asistencia: ${f.porcentaje} % de ${requisitoAsistencia} % requerido`)
            }
            if (aprobacion && !f.evaluacion?.aprobado) {
              impedimentos.push(f.evaluacion?.nota == null ? 'Evaluación pendiente' : 'Nota mínima no alcanzada')
            }
            return (
              <tr key={f.agremiado.id}>
                <Celda className="font-medium">{f.agremiado.nombre}</Celda>
                <Celda className="whitespace-nowrap">{asistencia(f)}</Celda>
                <Celda>
                  {f.cumple ? (
                    <Etiqueta tono="exito">Cumple</Etiqueta>
                  ) : motivo ? (
                    <Etiqueta tono="advertencia">Por excepción</Etiqueta>
                  ) : (
                    <Etiqueta tono="peligro">No cumple</Etiqueta>
                  )}
                  {aprobacion && f.evaluacion?.nota != null && <NotaEvaluacion evaluacion={f.evaluacion} />}
                </Celda>
                <Celda className="max-w-56 text-muted">
                  {motivo ? `Excepción: ${motivo}` : impedimentos.join(' · ') || '—'}
                </Celda>
                <Celda>
                  {f.cumple || aprobacion ? (
                    '—'
                  ) : motivo ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-danger hover:underline"
                      onClick={() => cambiarExcepciones(({ [f.agremiado.id]: _quitado, ...resto }) => resto)}
                    >
                      Quitar excepción
                    </button>
                  ) : (
                    <button type="button" className="text-sm font-semibold whitespace-nowrap text-brand hover:underline" onClick={() => cambiarEnDialogo(f)}>
                      Emitir por excepción
                    </button>
                  )}
                </Celda>
              </tr>
            )
          })}
        </Tabla>
      )}

      <p className="text-[13px] text-muted">
        {aprobacion ? 'Se emitirá el certificado a quienes cumplen los requisitos de asistencia y evaluación.'
          : 'Se emitirá la constancia a quienes cumplen el requisito de asistencia o tienen una excepción justificada.'}
      </p>
      {cerrar.isError && <Alerta tipo="error">{mensajeDeError(cerrar.error, 'No pudimos cerrar el curso.')}</Alerta>}
      <div className="flex flex-wrap justify-end gap-3">
        <Boton variante="secundario" onClick={() => navegar(`/admin/cursos/${id}/editar`)}>
          Cancelar
        </Boton>
        <Boton cargando={cerrar.isPending} disabled={filas.length === 0} onClick={() => cerrar.mutate()}>
          {aprobacion ? 'Emitir certificados' : 'Emitir constancias'}
        </Boton>
      </div>

      {!aprobacion && enDialogo && (
        <DialogoExcepcion
          fila={enDialogo}
          requisito={requisitoAsistencia}
          onCerrar={() => cambiarEnDialogo(null)}
          onConfirmar={(motivoNuevo) => {
            cambiarExcepciones((actuales) => ({ ...actuales, [enDialogo.agremiado.id]: motivoNuevo }))
            cambiarEnDialogo(null)
          }}
        />
      )}
    </Contenedor>
  )
}

/** 2.4a / 2.4b · El motivo es obligatorio y queda registrado con quién y cuándo emitió. */
function DialogoExcepcion({
  fila,
  requisito,
  onCerrar,
  onConfirmar,
}: {
  fila: FilaCierre
  requisito: number
  onCerrar: () => void
  onConfirmar: (motivo: string) => void
}) {
  const [motivo, cambiarMotivo] = useState('')
  const [error, cambiarError] = useState('')
  return (
    <Dialogo
      abierto
      onCerrar={onCerrar}
      titulo="Emitir constancia por excepción"
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={() => (motivo.trim() ? onConfirmar(motivo.trim()) : cambiarError('Ingresa el motivo de la excepción.'))}>
            Emitir constancia
          </Boton>
        </>
      }
    >
      <DatosDialogo
        datos={[
          ['Agremiado', fila.agremiado.nombre],
          ['Asistencia', `${asistencia(fila)} · se requiere ${requisito} %`],
        ]}
      />
      <AvisoDialogo>Quedará registrado quién emitió la constancia, cuándo y el motivo.</AvisoDialogo>
      <CampoMotivo
        etiqueta="Motivo de la excepción"
        placeholder="Explica por qué se emite la constancia"
        valor={motivo}
        onCambio={(valor) => {
          cambiarMotivo(valor)
          if (valor.trim()) cambiarError('')
        }}
        error={error}
      />
    </Dialogo>
  )
}

function Contenedor({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-200 flex-col gap-5 px-4 pt-8 pb-16 wrap-anywhere sm:pt-12">
      <EnlaceVolver to={`/admin/cursos/${id}/editar`}>Volver al curso</EnlaceVolver>
      {children}
    </div>
  )
}
