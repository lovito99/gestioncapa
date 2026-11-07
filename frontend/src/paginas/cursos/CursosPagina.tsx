import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Calendar, ChevronRight, Search, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { cursos, type Curso } from '@/servicios/cursos'
import { costoCurso, cuposCurso, ETIQUETA_MODALIDAD, fechasCurso } from './formatoCurso'
import { DatoCurso, EtiquetasCurso } from './presentacion'

const modalidades = { PRESENCIAL: 'Presencial', VIRTUAL: 'Virtual', HIBRIDA: 'Híbrida' }
export function FechasCurso({ curso }: { curso: Pick<Curso, 'fechaInicio' | 'fechaFin'> }) {
  const fecha = (valor: string) => valor.split('-').reverse().join('/')
  return <span>{curso.fechaInicio && curso.fechaFin ? `${fecha(curso.fechaInicio)} al ${fecha(curso.fechaFin)}` : 'Fechas por confirmar'}</span>
}
function TarjetaCurso({ curso, editable = false }: { curso: Curso; editable?: boolean }) {
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
    {editable && <Link className="inline-block text-sm font-semibold text-brand hover:underline" aria-label={`Editar ${curso.titulo}`} to={`/admin/cursos/${curso.id}/editar`}>Editar curso</Link>}
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
      <ul className="grid gap-4 sm:grid-cols-2">{consulta.data.map(curso => <TarjetaCurso key={curso.id} curso={curso} editable={usuario?.rol === 'ADMIN'} />)}</ul>}
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
  const tamanoPagina = 6
  const [texto, cambiarTexto] = useState(buscar)
  useEffect(() => cambiarTexto(buscar), [buscar])
  const consulta = useQuery({ queryKey: ['cursos', 'catalogo', usuario?.id, buscar, modalidad, categoria, pagina],
    queryFn: () => cursos.catalogo({ buscar, ...(modalidad ? { modalidad } : {}), ...(categoria ? { categoria } : {}), pagina, tamanoPagina }) })
  const actualizar = (campo: string, valor: string) => {
    const siguientes = new URLSearchParams(parametros)
    if (valor) siguientes.set(campo, valor); else siguientes.delete(campo)
    siguientes.delete('pagina'); cambiarParametros(siguientes)
  }
  const buscarCurso = (evento: FormEvent) => { evento.preventDefault(); actualizar('buscar', texto.trim()) }
  const irPagina = (valor: number) => { const siguientes = new URLSearchParams(parametros); siguientes.set('pagina', String(valor)); cambiarParametros(siguientes) }
  const hayFiltros = !!(buscar || modalidad || categoria)
  return <div className="mx-auto flex max-w-240 flex-col gap-4 px-4 pt-6 pb-8 wrap-anywhere sm:pt-10">
    <h1 className="text-[22px] font-bold text-ink">Catálogo de cursos</h1>
    <p className="text-sm text-muted">Cursos publicados del CPPP Región Cusco.</p>
    <form onSubmit={buscarCurso} role="search" className="flex flex-col gap-4">
      <Campo etiqueta="Buscar curso">
        <EntradaBusqueda value={texto} onChange={e => cambiarTexto(e.target.value)} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Modalidad"><Selector className="sm:h-12 sm:text-base" value={modalidad} onChange={e => actualizar('modalidad', e.target.value)}><option value="">Todas</option>{Object.entries(ETIQUETA_MODALIDAD).map(([valor, nombre]) => <option value={valor} key={valor}>{nombre}</option>)}</Selector></Campo>
        <Campo etiqueta="Categoría"><Selector className="sm:h-12 sm:text-base" value={categoria} onChange={e => actualizar('categoria', e.target.value)}><option value="">Todas</option>{[...new Set([...(consulta.data?.categorias ?? []), ...(categoria ? [categoria] : [])])].map(c => <option key={c} value={c}>{c}</option>)}</Selector></Campo>
      </div>
    </form>
    {consulta.isPending ? <Cargando texto="Buscando cursos…" /> : consulta.isError ? <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el catálogo.')} onReintentar={consulta.refetch} /> : <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm text-muted">{consulta.data.items.length
          ? `Mostrando ${(pagina - 1) * tamanoPagina + 1}–${(pagina - 1) * tamanoPagina + consulta.data.items.length} de ${consulta.data.total} ${consulta.data.total === 1 ? 'curso' : 'cursos'}`
          : 'No hay cursos que coincidan. Cambia la búsqueda o limpia los filtros.'}</p>
        {hayFiltros && <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => { cambiarTexto(''); cambiarParametros({}) }}>Limpiar filtros</button>}
      </div>
      {consulta.data.items.length > 0 && <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">{consulta.data.items.map(curso => <li key={curso.id} className="min-w-0"><TarjetaCatalogo curso={curso} /></li>)}</ul>}
      {pagina > consulta.data.totalPaginas && consulta.data.total > 0 && <Boton variante="secundario" onClick={() => irPagina(1)}>Volver a la primera página</Boton>}
      {consulta.data.totalPaginas > 0 && <nav aria-label="Paginación de cursos" className="flex items-center justify-between gap-3 sm:justify-center sm:gap-6">
        <Boton variante="secundario" disabled={pagina <= 1} onClick={() => irPagina(pagina - 1)}>‹ Anterior</Boton>
        <span className="text-sm font-medium text-ink">Página {pagina} de {consulta.data.totalPaginas}</span>
        <Boton variante="secundario" disabled={pagina >= consulta.data.totalPaginas} onClick={() => irPagina(pagina + 1)}>Siguiente ›</Boton>
      </nav>}
    </>}
  </div>
}

/** Buscador con la lupa dentro del campo; la lupa también envía la búsqueda. */
function EntradaBusqueda(props: InputHTMLAttributes<HTMLInputElement>) {
  return <div className="relative">
    <Entrada {...props} type="search" maxLength={160} placeholder="Escribe el nombre del curso" className="pr-12 sm:h-12 sm:text-base" />
    <button type="submit" aria-label="Buscar" className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-light">
      <Search className="size-4" aria-hidden />
    </button>
  </div>
}

/** 2.1 · Tarjeta del catálogo: toda la tarjeta abre el detalle del curso. */
function TarjetaCatalogo({ curso }: { curso: Curso }) {
  // El enlace se anuncia solo con el título, no con todo el texto de la tarjeta
  const idTitulo = `curso-${curso.id}-titulo`
  return <Link to={`/cursos/${curso.id}`} aria-labelledby={idTitulo} className="flex h-full flex-col gap-2.5 rounded-xl border border-line bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
    <div className="flex items-center gap-2">
      <h2 id={idTitulo} className="min-w-0 flex-1 text-base font-semibold text-ink">{curso.titulo}</h2>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </div>
    <EtiquetasCurso curso={curso} />
    <p className="text-sm text-muted">{curso.descripcion || 'Sin descripción disponible.'}</p>
    <div className="mt-auto flex flex-col gap-1.5 border-t border-line pt-2.5">
      <p className="flex items-center gap-2 text-sm text-muted"><User className="size-4 shrink-0 text-brand" aria-hidden />Instructor: {curso.instructorNombre}</p>
      <p className="flex items-center gap-2 text-sm text-muted"><Calendar className="size-4 shrink-0 text-brand" aria-hidden />{fechasCurso(curso)}</p>
      <dl className="flex flex-col gap-1.5">
        <DatoCurso termino="Horas">{curso.horasLectivas} horas lectivas</DatoCurso>
        <DatoCurso termino="Costo">{costoCurso(curso.costo)}</DatoCurso>
        <DatoCurso termino="Cupos" alerta={curso.cuposDisponibles === 0}>{cuposCurso(curso)}</DatoCurso>
      </dl>
    </div>
  </Link>
}
