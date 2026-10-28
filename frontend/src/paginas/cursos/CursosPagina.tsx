import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { cursos } from '@/servicios/cursos'

export function CursosPagina({ catalogo = false }: { catalogo?: boolean }) {
  const { usuario } = useAuth()
  const soloCatalogo = catalogo || !['ADMIN', 'INSTRUCTOR'].includes(usuario?.rol ?? '')
  const consulta = useQuery({ queryKey: ['cursos', soloCatalogo], queryFn: () => cursos.listar(soloCatalogo) })
  return <div className="mx-auto max-w-240 space-y-5 px-4 py-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{soloCatalogo ? 'Catálogo de cursos' : 'Mis cursos'}</h1>
      {usuario?.rol === 'ADMIN' && <Link className="rounded-lg bg-brand px-4 py-3 font-semibold text-white" to="/admin/cursos/nuevo">Crear curso</Link>}
    </header>
    {consulta.isPending ? <Cargando texto="Cargando cursos…" /> : consulta.isError ? <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar los cursos.')} onReintentar={consulta.refetch} /> : consulta.data.length === 0 ? <p>{soloCatalogo ? 'Aún no hay cursos publicados.' : 'Aún no tienes cursos asignados o creados.'}</p> :
      <ul className="grid gap-4 sm:grid-cols-2">{consulta.data.map(curso => <li className="min-w-0 rounded-xl border border-line bg-white p-5 wrap-anywhere" key={curso.id}>
        <h2 className="text-lg font-semibold"><Link className="text-brand underline" to={`/cursos/${curso.id}`}>{curso.titulo}</Link></h2>
        <p className="mt-2 text-sm">{curso.instructorNombre} · {curso.horasLectivas} horas lectivas</p>
        <p className="text-sm">{curso.modalidad} · S/ {curso.costo.toFixed(2)} · {curso.cupos} cupos</p>
        <p className="mt-2 text-sm">{curso.estado === 'BORRADOR' ? 'Borrador' : 'Publicado'}</p>
      </li>)}</ul>}
  </div>
}
