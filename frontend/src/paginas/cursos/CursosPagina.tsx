import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { cursos, type Curso } from '@/servicios/cursos'

const modalidades = { PRESENCIAL: 'Presencial', VIRTUAL: 'Virtual', HIBRIDA: 'Híbrida' }
export function FechasCurso({ curso }: { curso: Pick<Curso, 'fechaInicio' | 'fechaFin'> }) {
  const fecha = (valor: string) => valor.split('-').reverse().join('/')
  return <span>{curso.fechaInicio && curso.fechaFin ? `${fecha(curso.fechaInicio)} al ${fecha(curso.fechaFin)}` : 'Fechas por confirmar'}</span>
}
function TarjetaCurso({ curso }: { curso: Curso }) {
  return <li className="min-w-0 space-y-2 rounded-xl border border-line bg-white p-5 wrap-anywhere">
    <p className="text-sm font-semibold text-brand">{curso.categoria}</p>
    <h2 className="text-lg font-semibold"><Link className="text-brand underline" to={`/cursos/${curso.id}`}>{curso.titulo}</Link></h2>
    <p className="whitespace-pre-wrap text-sm">{curso.descripcion || 'Sin descripción disponible.'}</p>
    <p className="text-sm">Instructor: {curso.instructorNombre}</p>
    <p className="text-sm"><FechasCurso curso={curso} /></p>
    <p className="text-sm">{curso.horasLectivas} horas lectivas · {modalidades[curso.modalidad]}</p>
    <p className="text-sm">{curso.costo === 0 ? 'Gratis' : `S/ ${curso.costo.toFixed(2)}`}</p>
    <p className={`text-sm font-semibold ${curso.cuposDisponibles === 0 ? 'text-danger' : 'text-ink'}`}>{curso.cuposDisponibles === 0 ? 'Sin cupos' : `${curso.cuposDisponibles} cupos disponibles`}</p>
    {curso.inscrito && <p className="text-sm font-semibold text-success">Ya estás inscrito(a)</p>}
    <p className="text-sm text-muted">{curso.estado === 'BORRADOR' ? 'Borrador' : 'Publicado'}</p>
  </li>
}
export function CursosPagina({ catalogo = false }: { catalogo?: boolean }) {
  const { usuario } = useAuth()
  const soloCatalogo = catalogo || !['ADMIN', 'INSTRUCTOR'].includes(usuario?.rol ?? '')
  if (soloCatalogo) return <CatalogoPagina />
  return <MisCursosPagina />
}
function MisCursosPagina() {
  const { usuario } = useAuth()
  const consulta = useQuery({ queryKey: ['cursos', false], queryFn: () => cursos.listar() })
  return <div className="mx-auto max-w-240 space-y-5 px-4 py-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Mis cursos</h1>
      {usuario?.rol === 'ADMIN' && <Link className="rounded-lg bg-brand px-4 py-3 font-semibold text-white" to="/admin/cursos/nuevo">Crear curso</Link>}
    </header>
    {consulta.isPending ? <Cargando texto="Cargando cursos…" /> : consulta.isError ? <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar los cursos.')} onReintentar={consulta.refetch} /> : consulta.data.length === 0 ? <p>Aún no tienes cursos asignados o creados.</p> :
      <ul className="grid gap-4 sm:grid-cols-2">{consulta.data.map(curso => <TarjetaCurso key={curso.id} curso={curso} />)}</ul>}
  </div>
}
function CatalogoPagina() {
  const { usuario } = useAuth()
  const [parametros, cambiarParametros] = useSearchParams()
  const buscar = parametros.get('buscar') ?? ''
  const modalidad = parametros.get('modalidad') ?? ''
  const categoria = parametros.get('categoria') ?? ''
  const numero = Number(parametros.get('pagina') ?? 1)
  const pagina = Number.isInteger(numero) && numero > 0 && numero <= 100000 ? numero : 1
  const [texto, cambiarTexto] = useState(buscar)
  useEffect(() => cambiarTexto(buscar), [buscar])
  const consulta = useQuery({ queryKey: ['cursos', 'catalogo', usuario?.id, buscar, modalidad, categoria, pagina],
    queryFn: () => cursos.catalogo({ buscar, ...(modalidad ? { modalidad } : {}), ...(categoria ? { categoria } : {}), pagina, tamanoPagina: 6 }) })
  const actualizar = (campo: string, valor: string) => {
    const siguientes = new URLSearchParams(parametros)
    if (valor) siguientes.set(campo, valor); else siguientes.delete(campo)
    siguientes.delete('pagina'); cambiarParametros(siguientes)
  }
  const buscarCurso = (evento: FormEvent) => { evento.preventDefault(); actualizar('buscar', texto.trim()) }
  const irPagina = (valor: number) => { const siguientes = new URLSearchParams(parametros); siguientes.set('pagina', String(valor)); cambiarParametros(siguientes) }
  return <div className="mx-auto max-w-240 space-y-5 px-4 py-6 wrap-anywhere">
    <h1 className="text-2xl font-semibold">Catálogo de cursos</h1>
    <form onSubmit={buscarCurso} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
      <Campo etiqueta="Buscar por nombre" className="min-w-0 flex-1 basis-48"><Entrada value={texto} onChange={e => cambiarTexto(e.target.value)} maxLength={160} placeholder="Nombre del curso" /></Campo>
      <Boton type="submit">Buscar</Boton>
      <Campo etiqueta="Filtrar por modalidad" className="min-w-0 flex-1 basis-48"><Selector value={modalidad} onChange={e => actualizar('modalidad', e.target.value)}><option value="">Todas las modalidades</option>{Object.entries(modalidades).map(([valor, nombre]) => <option value={valor} key={valor}>{nombre}</option>)}</Selector></Campo>
      <Campo etiqueta="Filtrar por categoría" className="min-w-0 flex-1 basis-48"><Selector value={categoria} onChange={e => actualizar('categoria', e.target.value)}><option value="">Todas las categorías</option>{[...new Set([...(consulta.data?.categorias ?? []), ...(categoria ? [categoria] : [])])].map(c => <option key={c} value={c}>{c}</option>)}</Selector></Campo>
      <Boton variante="secundario" onClick={() => { cambiarTexto(''); cambiarParametros({}) }}>Limpiar filtros</Boton>
    </form>
    {consulta.isPending ? <Cargando texto="Buscando cursos…" /> : consulta.isError ? <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el catálogo.')} onReintentar={consulta.refetch} /> : <>
      <p role="status">{consulta.data.total} {consulta.data.total === 1 ? 'curso encontrado' : 'cursos encontrados'}</p>
      {consulta.data.items.length ? <ul className="grid gap-4 sm:grid-cols-2">{consulta.data.items.map(curso => <TarjetaCurso key={curso.id} curso={curso} />)}</ul> : <p>No hay cursos que coincidan. Cambia la búsqueda o limpia los filtros.</p>}
      {pagina > consulta.data.totalPaginas && consulta.data.total > 0 && <Boton variante="secundario" onClick={() => irPagina(1)}>Volver a la primera página</Boton>}
      {consulta.data.totalPaginas > 0 && <nav aria-label="Paginación de cursos" className="flex flex-wrap items-center justify-center gap-3">
        <Boton variante="secundario" disabled={pagina <= 1} onClick={() => irPagina(pagina - 1)}>Anterior</Boton>
        <span>Página {pagina} de {consulta.data.totalPaginas}</span>
        <Boton variante="secundario" disabled={pagina >= consulta.data.totalPaginas} onClick={() => irPagina(pagina + 1)}>Siguiente</Boton>
      </nav>}
    </>}
  </div>
}
