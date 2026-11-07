import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Dialogo } from '@/components/ui/Dialogo'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { esApiError, mensajeDeError } from '@/lib/api'
import { CERTIFICADOS_CURSO, cursos, type FilaCierre } from '@/servicios/cursos'
import { AvisoDialogo, Celda, CampoMotivo, DatosDialogo, ResumenCurso, Tabla } from './piezas'

const asistencia = (f: FilaCierre) => `${f.presentes} de ${f.sesiones} (${f.porcentaje} %)`

/**
 * 2.4 · Cerrar curso. Muestra quién cumple el requisito de asistencia; a quien no cumple se le
 * puede emitir por excepción con un motivo (2.4a / 2.4b). Las excepciones se envían junto con
 * el cierre: así el curso se cierra y se emiten todos los certificados en una sola operación.
 */
export function CerrarCursoPagina() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const cache = useQueryClient()
  const cierre = useQuery({ queryKey: ['curso', id, 'cierre'], queryFn: () => cursos.cierre(id), retry: false })
  const [excepciones, cambiarExcepciones] = useState<Record<string, string>>({})
  const [enDialogo, cambiarEnDialogo] = useState<FilaCierre | null>(null)

  const cerrar = useMutation({
    mutationFn: () => cursos.cerrar(id, Object.entries(excepciones).map(([agremiadoId, motivo]) => ({ agremiadoId, motivo }))),
    onSuccess: async ({ emitidos }) => {
      await Promise.all([cache.invalidateQueries({ queryKey: ['curso', id] }), cache.invalidateQueries({ queryKey: ['cursos'] })])
      toast.success(`Curso cerrado. Se emitieron ${emitidos} ${emitidos === 1 ? 'certificado' : 'certificados'}.`)
      navegar(`/admin/cursos/${id}/certificados`, { replace: true })
    },
  })

  if (cierre.isPending) return <Cargando texto="Calculando la asistencia del curso…" />
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

  const { curso, requisitoAsistencia, filas } = cierre.data
  const cumplen = filas.filter((f) => f.cumple).length
  const documento = curso.tipoCertificado === 'APROBACION' ? 'el certificado' : 'la constancia'

  return (
    <Contenedor id={id}>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">Cerrar curso</h1>
        <ResumenCurso curso={curso} />
      </div>
      <Alerta tipo="informacion">
        Requisito para la {CERTIFICADOS_CURSO[curso.tipoCertificado].toLowerCase()}: asistencia en al menos el {requisitoAsistencia} % de las
        sesiones.
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
                </Celda>
                <Celda className="max-w-56 text-muted">
                  {f.cumple ? '—' : motivo ? `Excepción: ${motivo}` : `Asistencia: ${f.porcentaje} % de ${requisitoAsistencia} % requerido`}
                </Celda>
                <Celda>
                  {f.cumple ? (
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
        Solo se emitirá {documento} a quienes cumplen el requisito, salvo que se emita por
        excepción con un motivo.
      </p>
      {cerrar.isError && <Alerta tipo="error">{mensajeDeError(cerrar.error, 'No pudimos cerrar el curso.')}</Alerta>}
      <div className="flex flex-wrap justify-end gap-3">
        <Boton variante="secundario" onClick={() => navegar(`/admin/cursos/${id}/editar`)}>
          Cancelar
        </Boton>
        <Boton cargando={cerrar.isPending} disabled={filas.length === 0} onClick={() => cerrar.mutate()}>
          {curso.tipoCertificado === 'APROBACION' ? 'Emitir certificados' : 'Emitir constancias'}
        </Boton>
      </div>

      {enDialogo && (
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
