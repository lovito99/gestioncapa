import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Dialogo } from '@/components/ui/Dialogo'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Entrada } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { Etiqueta, EtiquetaEstadoCurso } from '@/components/ui/Etiqueta'
import { ApiError, mensajeDeError } from '@/lib/api'
import type { EstadoCertificado } from '@/servicios/certificados'
import { CERTIFICADOS_CURSO, cursos, type FilaCertificado } from '@/servicios/cursos'
import { AvisoDialogo, Celda, CampoMotivo, DatosDialogo, ResumenCurso, Tabla } from './piezas'

const ESTADO: Record<EstadoCertificado, { texto: string; tono: 'exito' | 'peligro' | 'advertencia' }> = {
  VALIDO: { texto: 'Válido', tono: 'exito' },
  ANULADO: { texto: 'Anulado', tono: 'peligro' },
  REEMPLAZADO: { texto: 'Reemplazado', tono: 'advertencia' },
}

type Accion = { tipo: 'anular' | 'corregir'; fila: FilaCertificado & { certificado: NonNullable<FilaCertificado['certificado']> } }

/** 2.5 · Certificados emitidos al cerrar el curso, con las acciones Corregir y Anular. */
export function CertificadosCursoPagina() {
  const { id = '' } = useParams()
  const consulta = useQuery({ queryKey: ['curso', id, 'certificados'], queryFn: () => cursos.certificados(id), retry: false })
  const [accion, cambiarAccion] = useState<Accion | null>(null)

  if (consulta.isPending) return <Cargando texto="Cargando certificados…" />
  const volver = <EnlaceVolver to={`/admin/cursos/${id}/editar`}>Volver al curso</EnlaceVolver>
  if (consulta.isError) {
    return (
      <div className="mx-auto flex max-w-200 flex-col gap-5 px-4 pt-8 pb-16 sm:pt-12">
        {volver}
        <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar los certificados.')} onReintentar={consulta.refetch} />
      </div>
    )
  }

  const { curso, filas } = consulta.data
  const emitidos = filas.filter((f) => f.certificado).length
  const nombreDocumento = CERTIFICADOS_CURSO[curso.tipoCertificado].toLowerCase()
  const plural = curso.tipoCertificado === 'APROBACION' ? 'certificados de aprobación' : 'constancias de participación'

  return (
    <div className="mx-auto flex max-w-200 flex-col gap-5 px-4 pt-8 pb-16 wrap-anywhere sm:pt-12">
      {volver}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">Certificados del curso</h1>
          <EtiquetaEstadoCurso estado={curso.estado} />
        </div>
        <ResumenCurso curso={curso} />
      </div>
      <Alerta tipo="exito">{emitidos === 1 ? `Se emitió 1 ${nombreDocumento}.` : `Se emitieron ${emitidos} ${plural}.`}</Alerta>

      <Tabla cabeceras={['Nombre', 'Resultado', 'Certificado', 'Acciones']}>
        {filas.map((f) => (
          <tr key={f.agremiado.id}>
            <Celda className="font-medium">{f.certificado?.nombre ?? f.agremiado.nombre}</Celda>
            <Celda>
              {f.cumple ? (
                <Etiqueta tono="exito">Cumple</Etiqueta>
              ) : f.porExcepcion ? (
                <Etiqueta tono="advertencia">Por excepción</Etiqueta>
              ) : (
                <Etiqueta tono="peligro">No cumple</Etiqueta>
              )}
            </Celda>
            <Celda>
              {f.certificado ? (
                <span className="flex flex-col items-start gap-1">
                  <Link to={`/verificar/${encodeURIComponent(f.certificado.codigo)}`} className="font-medium whitespace-nowrap text-ink hover:text-brand hover:underline">
                    {f.certificado.codigo}
                  </Link>
                  <Etiqueta tono={ESTADO[f.certificado.estado].tono}>{ESTADO[f.certificado.estado].texto}</Etiqueta>
                </span>
              ) : (
                <span className="text-muted">No emitido</span>
              )}
            </Celda>
            <Celda>
              {f.certificado?.estado === 'VALIDO' ? (
                <span className="flex gap-4 whitespace-nowrap">
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand hover:underline"
                    onClick={() => cambiarAccion({ tipo: 'corregir', fila: f as Accion['fila'] })}
                    aria-label={`Corregir el certificado de ${f.agremiado.nombre}`}
                  >
                    Corregir
                  </button>
                  <button
                    type="button"
                    className="text-sm font-semibold text-danger hover:underline"
                    onClick={() => cambiarAccion({ tipo: 'anular', fila: f as Accion['fila'] })}
                    aria-label={`Anular el certificado de ${f.agremiado.nombre}`}
                  >
                    Anular
                  </button>
                </span>
              ) : (
                '—'
              )}
            </Celda>
          </tr>
        ))}
      </Tabla>

      {accion?.tipo === 'anular' && <DialogoAnular cursoId={id} fila={accion.fila} onCerrar={() => cambiarAccion(null)} />}
      {accion?.tipo === 'corregir' && <DialogoCorregir cursoId={id} fila={accion.fila} onCerrar={() => cambiarAccion(null)} />}
    </div>
  )
}

function useRecargar(cursoId: string) {
  const cache = useQueryClient()
  return () => cache.invalidateQueries({ queryKey: ['curso', cursoId, 'certificados'] })
}

/** 2.5a / 2.5b · Anular: la verificación pública mostrará el certificado como «Anulado». */
function DialogoAnular({ cursoId, fila, onCerrar }: { cursoId: string; fila: Accion['fila']; onCerrar: () => void }) {
  const recargar = useRecargar(cursoId)
  const [motivo, cambiarMotivo] = useState('')
  const [error, cambiarError] = useState('')
  const anular = useMutation({
    mutationFn: () => cursos.anularCertificado(fila.certificado.codigo, motivo.trim()),
    onSuccess: async () => {
      await recargar()
      toast.success(`Certificado ${fila.certificado.codigo} anulado.`)
      onCerrar()
    },
    onError: (e) => cambiarError(e instanceof ApiError ? (e.fields.motivo ?? '') : ''),
  })
  return (
    <Dialogo
      abierto
      onCerrar={onCerrar}
      titulo="Anular certificado"
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            cargando={anular.isPending}
            onClick={() => (motivo.trim() ? anular.mutate() : cambiarError('Ingresa el motivo de la anulación.'))}
          >
            Anular certificado
          </Boton>
        </>
      }
    >
      <DatosDialogo datos={[['Agremiado', fila.certificado.nombre], ['Código', fila.certificado.codigo]]} />
      <AvisoDialogo>El certificado quedará como «anulado» y la verificación pública lo mostrará así.</AvisoDialogo>
      <CampoMotivo
        etiqueta="Motivo de la anulación"
        placeholder="Explica por qué se anula el certificado"
        valor={motivo}
        onCambio={(valor) => {
          cambiarMotivo(valor)
          if (valor.trim()) cambiarError('')
        }}
        error={error}
      />
      {anular.isError && !error && <Alerta tipo="error">{mensajeDeError(anular.error, 'No pudimos anular el certificado.')}</Alerta>}
    </Dialogo>
  )
}

/** 2.5c · Corregir: se anula el actual («reemplazado») y se emite uno nuevo con otro código. */
function DialogoCorregir({ cursoId, fila, onCerrar }: { cursoId: string; fila: Accion['fila']; onCerrar: () => void }) {
  const recargar = useRecargar(cursoId)
  const [nombre, cambiarNombre] = useState(fila.certificado.nombre)
  const [motivo, cambiarMotivo] = useState('')
  const [errores, cambiarErrores] = useState<{ nombre?: string; motivo?: string }>({})
  const corregir = useMutation({
    mutationFn: () => cursos.corregirCertificado(fila.certificado.codigo, nombre.trim(), motivo.trim()),
    onSuccess: async ({ codigo }) => {
      await recargar()
      toast.success(`Se emitió el certificado ${codigo}.`)
      onCerrar()
    },
    onError: (e) => {
      if (e instanceof ApiError && Object.keys(e.fields).length) cambiarErrores(e.fields)
    },
  })
  const enviar = () => {
    const nuevos = {
      ...(nombre.trim() ? {} : { nombre: 'Ingresa el nombre corregido.' }),
      ...(motivo.trim() ? {} : { motivo: 'Ingresa el motivo de la corrección.' }),
    }
    cambiarErrores(nuevos)
    if (!nuevos.nombre && !nuevos.motivo) corregir.mutate()
  }
  return (
    <Dialogo
      abierto
      onCerrar={onCerrar}
      titulo="Corregir certificado"
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={corregir.isPending} onClick={enviar}>
            Corregir y emitir nuevo
          </Boton>
        </>
      }
    >
      <DatosDialogo datos={[['Agremiado', fila.certificado.nombre], ['Código', fila.certificado.codigo]]} />
      <Campo etiqueta="Nombre corregido" obligatorio error={errores.nombre}>
        <Entrada data-autofocus value={nombre} maxLength={160} onChange={(e) => cambiarNombre(e.target.value)} estado={errores.nombre ? 'error' : 'normal'} />
      </Campo>
      <CampoMotivo
        etiqueta="Motivo de la corrección"
        placeholder="Explica qué se corrige"
        valor={motivo}
        onCambio={cambiarMotivo}
        error={errores.motivo}
        autoFocus={false}
      />
      <AvisoDialogo>
        Se anulará el certificado {fila.certificado.codigo} y se emitirá uno nuevo con otro código. El anterior mostrará «reemplazado».
      </AvisoDialogo>
      {corregir.isError && !errores.nombre && !errores.motivo && (
        <Alerta tipo="error">{mensajeDeError(corregir.error, 'No pudimos corregir el certificado.')}</Alerta>
      )}
    </Dialogo>
  )
}
