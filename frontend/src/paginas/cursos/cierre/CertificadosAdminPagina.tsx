import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EtiquetaEstadoCurso } from '@/components/ui/Etiqueta'
import { mensajeDeError } from '@/lib/api'
import { cursos } from '@/servicios/cursos'
import { fechasCurso } from '../formatoCurso'
import { Celda, Tabla } from './piezas'

const enlace = 'text-sm font-semibold text-brand hover:underline'

/**
 * Menú «Certificados» del administrador. El Figma no tiene esta pantalla: es un índice para
 * llegar a «Cerrar curso» (2.4) o a «Certificados del curso» (2.5) según el estado de cada curso.
 */
export function CertificadosAdminPagina() {
  const consulta = useQuery({ queryKey: ['cursos', false], queryFn: () => cursos.listar() })
  return (
    <div className="mx-auto flex max-w-240 flex-col gap-5 px-4 pt-8 pb-16 wrap-anywhere sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ink">Certificados</h1>
          <p className="text-sm text-muted">Los certificados se emiten al cerrar cada curso, según la asistencia de sus inscritos.</p>
        </div>
        <Link to="/verificar" className={enlace}>
          Verificar un certificado
        </Link>
      </div>
      {consulta.isPending ? (
        <Cargando texto="Cargando cursos…" />
      ) : consulta.isError ? (
        <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar los cursos.')} onReintentar={consulta.refetch} />
      ) : (
        <Tabla cabeceras={['Curso', 'Fechas', 'Estado', 'Acción']}>
          {consulta.data.map((c) => (
            <tr key={c.id}>
              <Celda className="font-medium">{c.titulo}</Celda>
              <Celda className="whitespace-nowrap text-muted">{fechasCurso(c)}</Celda>
              <Celda>
                <EtiquetaEstadoCurso estado={c.estado} />
              </Celda>
              <Celda>
                {c.estado === 'CERRADO' ? (
                  <Link to={`/admin/cursos/${c.id}/certificados`} className={enlace}>
                    Ver certificados
                  </Link>
                ) : c.estado === 'PUBLICADO' ? (
                  <Link to={`/admin/cursos/${c.id}/cerrar`} className={enlace}>
                    Cerrar curso
                  </Link>
                ) : (
                  <span className="text-muted">Publícalo primero</span>
                )}
              </Celda>
            </tr>
          ))}
        </Tabla>
      )}
    </div>
  )
}
