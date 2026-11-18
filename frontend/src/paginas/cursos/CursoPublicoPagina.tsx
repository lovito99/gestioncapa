import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { PaginaPublica } from '@/components/layout/Pagina'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { esApiError, mensajeDeError } from '@/lib/api'
import { costoPublicoCurso, esIdCursoPublico, fechaPublicaCurso } from '@/lib/enlaceCurso'
import { accesoConCurso } from '@/lib/retornoCurso'
import { cursos } from '@/servicios/cursos'
import { ETIQUETA_MODALIDAD } from './formatoCurso'
import { DatoCurso } from './presentacion'
import { CompartirCurso } from './CompartirCurso'

export function CursoPublicoPagina() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const idValido = esIdCursoPublico(id)
  const consulta = useQuery({
    queryKey: ['cursos', 'ficha-publica', id],
    queryFn: () => cursos.fichaPublica(id),
    enabled: idValido,
    retry: (intentos, error) => !esApiError(error, 'CURSO_NO_EXISTE') && intentos < 2,
  })
  let contenido
  if (!idValido || esApiError(consulta.error, 'CURSO_NO_EXISTE')) {
    contenido = <section className="space-y-2 rounded-xl border border-line bg-white p-5">
      <h1 className="text-2xl font-semibold">Curso no disponible</h1>
      <p>El curso no está disponible para consulta pública.</p>
    </section>
  } else if (consulta.isPending) {
    contenido = <Cargando texto="Cargando curso…" />
  } else if (consulta.isError) {
    contenido = <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el curso.')} onReintentar={consulta.refetch} />
  } else {
    const curso = consulta.data
    const disponible = curso.vigente && curso.cuposDisponibles > 0
    const puedeInscribirse = disponible && (!usuario || usuario.rol === 'AGREMIADO')
    const destino = usuario ? `/cursos/${id}` : accesoConCurso('/login', id)
    contenido = <section className="space-y-4 rounded-xl border border-line bg-white p-5">
      <h1 className="text-2xl font-semibold">{curso.titulo}</h1>
      <p className="whitespace-pre-wrap">{curso.descripcion || 'Sin descripción disponible.'}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <DatoCurso termino="Instructor">{curso.instructorNombre}</DatoCurso>
        <DatoCurso termino="Modalidad">{ETIQUETA_MODALIDAD[curso.modalidad]}</DatoCurso>
        <DatoCurso termino="Fechas">{fechaPublicaCurso(curso)}</DatoCurso>
        <DatoCurso termino="Cobro">{costoPublicoCurso(curso)}</DatoCurso>
        <DatoCurso termino="Horas lectivas">{curso.horasLectivas}</DatoCurso>
        <DatoCurso termino="Categoría">{curso.categoria}</DatoCurso>
      </dl>
      {!disponible && <p className="text-sm font-semibold text-muted">{curso.vigente ? 'Sin cupos' : 'Curso finalizado'}</p>}
      {puedeInscribirse && <Link to={destino} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Inscribirme</Link>}
      <CompartirCurso key={curso.id} curso={curso} />
    </section>
  }

  return <PaginaPublica>
    <main className="mx-auto w-full max-w-240 space-y-5 px-4 py-6 wrap-anywhere">
      <EnlaceVolver to="/capacitaciones">Volver al catálogo</EnlaceVolver>
      {contenido}
    </main>
  </PaginaPublica>
}
