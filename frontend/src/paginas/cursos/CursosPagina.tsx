import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Award, BookOpen, Calendar, ChevronRight, Clock, Filter, Search, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import { cursoTieneAulaDemo } from '@/lib/aulaGrabadaDemo'
import { cursos, type Curso, type CursoPublico } from '@/servicios/cursos'
import { condicionesCobro, cuposCurso, ETIQUETA_MODALIDAD, fechasCurso } from './formatoCurso'
import { BotonCompartir } from './CompartirCurso'
import { EtiquetaCobro, EtiquetaModalidad, EtiquetaSinCupos, FilaDato, PortadaCurso, PreciosCurso, tamanosTarjeta } from './piezasCurso'
import { TEXTO_COBRO } from './reglasCurso'

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
    <p className="text-sm">{curso.horasLectivas} horas lectivas · {ETIQUETA_MODALIDAD[curso.modalidad]}</p>
    <p className="text-sm">{condicionesCobro(curso)}</p>
    <p className={`text-sm font-semibold ${curso.cuposDisponibles === 0 ? 'text-danger' : 'text-ink'}`}>{curso.cuposDisponibles === 0 ? 'Sin cupos' : `${curso.cuposDisponibles} cupos disponibles`}</p>
    {curso.inscrito && <p className="text-sm font-semibold text-success">Ya estás inscrito(a)</p>}
    <p className="text-sm text-muted">{curso.estado === 'BORRADOR' ? 'Borrador' : 'Publicado'}</p>
    {editable && !cursoTieneAulaDemo(curso.id) && <Link className="inline-block text-sm font-semibold text-brand hover:underline" aria-label={`Editar ${curso.titulo}`} to={`/admin/cursos/${curso.id}/editar`}>Editar curso</Link>}
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
export function CatalogoPagina({ publico = false }: { publico?: boolean }) {
  const { usuario } = useAuth()
  const [parametros, cambiarParametros] = useSearchParams()
  const buscar = parametros.get('buscar') ?? ''
  const modalidad = parametros.get('modalidad') ?? ''
  const categoria = parametros.get('categoria') ?? ''
  const cobro = parametros.get('cobro') ?? ''
  const numero = Number(parametros.get('pagina') ?? 1)
  const pagina = Number.isInteger(numero) && numero > 0 && numero <= 100000 ? numero : 1
  const tamanoPagina = 6
  const [texto, cambiarTexto] = useState(buscar)
  const [masFiltros, cambiarMasFiltros] = useState(!!categoria)
  useEffect(() => cambiarTexto(buscar), [buscar])
  const consulta = useQuery({ queryKey: ['cursos', publico ? 'publico' : 'catalogo', usuario?.id, buscar, modalidad, categoria, cobro, pagina],
    queryFn: () => (publico ? cursos.publico : cursos.catalogo)({ buscar, ...(modalidad ? { modalidad } : {}), ...(categoria ? { categoria } : {}), ...(cobro ? { cobro } : {}), pagina, tamanoPagina }) })
  const actualizar = (campo: string, valor: string) => {
    const siguientes = new URLSearchParams(parametros)
    if (valor) siguientes.set(campo, valor); else siguientes.delete(campo)
    siguientes.delete('pagina'); cambiarParametros(siguientes)
  }
  const buscarCurso = (evento: FormEvent) => { evento.preventDefault(); actualizar('buscar', texto.trim()) }
  const irPagina = (valor: number) => { const siguientes = new URLSearchParams(parametros); siguientes.set('pagina', String(valor)); cambiarParametros(siguientes) }
  const hayFiltros = !!(buscar || modalidad || categoria || cobro)
  const selector = 'sm:h-12 sm:text-base'
  const campoCategoria = <Campo etiqueta="Categoría"><Selector className={selector} value={categoria} onChange={e => actualizar('categoria', e.target.value)}><option value="">Todas</option>{[...new Set([...(consulta.data?.categorias ?? []), ...(categoria ? [categoria] : [])])].map(c => <option key={c} value={c}>{c}</option>)}</Selector></Campo>
  return <div className="mx-auto flex max-w-300 flex-col gap-4 px-4 pt-4 pb-8 wrap-anywhere sm:px-10 sm:pt-10">
    {publico ? <>
      <BienvenidaPublica />
      <div id="proximos-cursos" className="flex scroll-mt-6 flex-col gap-1">
        <h2 className="font-serif text-xl leading-7 font-bold text-ink sm:text-2xl sm:leading-8">Próximos cursos</h2>
        <p className="text-sm leading-5 text-muted">Sin iniciar sesión puedes ver fechas, modalidad, horas y costo.</p>
      </div>
    </> : <div className="flex flex-col gap-1">
      <h1 className="font-serif text-xl leading-7 font-bold text-ink sm:text-2xl sm:leading-8">Catálogo de cursos</h1>
      <p className="text-sm leading-5 text-muted">Cursos publicados del CPPP Región Cusco. Toca una tarjeta para ver el detalle.</p>
    </div>}
    <form onSubmit={buscarCurso} role="search" className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem] lg:items-end">
      <Campo etiqueta="Buscar curso">
        <EntradaBusqueda value={texto} onChange={e => cambiarTexto(e.target.value)} />
      </Campo>
      <div className="flex items-end gap-3 lg:contents">
        <Campo etiqueta="Modalidad" className="min-w-0 flex-1"><Selector className={selector} value={modalidad} onChange={e => actualizar('modalidad', e.target.value)}><option value="">Todas</option>{Object.entries(ETIQUETA_MODALIDAD).map(([valor, nombre]) => <option value={valor} key={valor}>{nombre}</option>)}</Selector></Campo>
        <Campo etiqueta="Cobro" className="min-w-0 flex-1"><Selector className={selector} value={cobro} onChange={e => actualizar('cobro', e.target.value)}><option value="">Todos</option>{Object.entries(TEXTO_COBRO).map(([valor, nombre]) => <option value={valor} key={valor}>{nombre}</option>)}</Selector></Campo>
        <button type="button" aria-expanded={masFiltros} aria-controls="mas-filtros" aria-label={masFiltros ? 'Ocultar más filtros' : 'Más filtros'} onClick={() => cambiarMasFiltros(v => !v)}
          className={`flex size-12 shrink-0 items-center justify-center rounded-lg ring-1 ring-muted-3 ring-inset hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand lg:hidden ${masFiltros ? 'bg-brand-soft text-brand' : 'bg-white text-ink'}`}>
          <Filter className="size-5" aria-hidden />
        </button>
        <div className="hidden lg:block">{campoCategoria}</div>
      </div>
      {masFiltros && <div id="mas-filtros" className="lg:hidden">{campoCategoria}</div>}
    </form>
    {consulta.isPending ? <Cargando texto="Buscando cursos…" /> : consulta.isError ? <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el catálogo.')} onReintentar={consulta.refetch} /> : <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm leading-5 text-muted">{consulta.data.items.length
          ? `Mostrando ${(pagina - 1) * tamanoPagina + 1}–${(pagina - 1) * tamanoPagina + consulta.data.items.length} de ${consulta.data.total} ${consulta.data.total === 1 ? 'curso' : 'cursos'}`
          : 'No hay cursos que coincidan. Cambia la búsqueda o limpia los filtros.'}</p>
        {hayFiltros && <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => { cambiarTexto(''); cambiarParametros({}) }}>Limpiar filtros</button>}
      </div>
      {consulta.data.items.length > 0 && <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{consulta.data.items.map(curso => <li key={curso.id} className="min-w-0"><TarjetaCatalogo curso={curso} publico={publico} /></li>)}</ul>}
      {pagina > consulta.data.totalPaginas && consulta.data.total > 0 && <Boton variante="secundario" onClick={() => irPagina(1)}>Volver a la primera página</Boton>}
      {consulta.data.totalPaginas > 0 && <nav aria-label="Paginación de cursos" className="flex items-center justify-center gap-2 sm:gap-6">
        <Boton variante="secundario" className="h-12 text-base sm:h-10 sm:text-sm" disabled={pagina <= 1} onClick={() => irPagina(pagina - 1)}>‹ Anterior</Boton>
        <span className="text-sm leading-5 text-muted">Página {pagina} de {consulta.data.totalPaginas}</span>
        <Boton variante="secundario" className="h-12 text-base text-brand ring-brand sm:h-10 sm:text-sm" disabled={pagina >= consulta.data.totalPaginas} onClick={() => irPagina(pagina + 1)}>Siguiente ›</Boton>
      </nav>}
    </>}
  </div>
}

/** Buscador con la lupa dentro del campo, a la izquierda como en el Figma S3 3.1. */
function EntradaBusqueda(props: InputHTMLAttributes<HTMLInputElement>) {
  return <div className="relative">
    <Entrada {...props} type="search" maxLength={160} placeholder="Escribe el nombre del curso" className="pl-10 sm:h-12 sm:text-base" />
    {/* La lupa del Figma también envía la búsqueda */}
    <button type="submit" aria-label="Buscar" className="absolute top-1/2 left-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-light">
      <Search className="size-4.5" aria-hidden />
    </button>
  </div>
}

/**
 * S3 3.1 · Tarjeta del catálogo: portada 16:9 arriba y, debajo, título, modalidad, cobro, datos y precios.
 * Toda la tarjeta lleva al curso y se resalta al pasar el cursor, enfocarla o tocarla (HU-51);
 * el botón «Compartir» queda por encima del enlace.
 */
function TarjetaCatalogo({ curso, publico }: { curso: CursoPublico & { inscrito?: boolean }; publico: boolean }) {
  const { usuario } = useAuth()
  const idTitulo = `curso-${curso.id}-titulo`
  // SCRUM-187: sin sesión, la tarjeta abre la página pública del curso (S3 5.0 → 5.1)
  const destino = publico && !usuario ? `/capacitaciones/${curso.id}` : `/cursos/${curso.id}`
  const sinCupos = curso.cuposDisponibles === 0
  return <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white transition-[box-shadow,border-color,background-color] has-[a:hover]:border-brand has-[a:hover]:shadow-[0_4px_12px_rgba(100,20,43,0.12)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand has-[a:active]:border-brand has-[a:active]:bg-brand-soft">
    <PortadaCurso curso={curso} tamanos={tamanosTarjeta} diferida>
      <span className="absolute top-3 right-3 z-10"><BotonCompartir curso={curso} /></span>
      {sinCupos && <span className="absolute bottom-3 left-3"><EtiquetaSinCupos /></span>}
    </PortadaCurso>
    <div className="flex flex-1 flex-col gap-2.5 p-4">
      <div className="flex items-start gap-2">
        <h2 id={idTitulo} className="min-w-0 flex-1 text-base leading-6 font-semibold text-ink">
          <Link to={destino} className="outline-none after:absolute after:inset-0">{curso.titulo}</Link>
        </h2>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <EtiquetaModalidad modalidad={curso.modalidad} />
        <EtiquetaCobro curso={curso} />
        {curso.inscrito && <span className="inline-flex items-center rounded-md bg-success-soft px-2 py-0.5 text-xs leading-4 font-medium text-success">Inscrito(a)</span>}
      </div>
      <dl className="flex flex-col gap-1.5">
        <FilaDato icono={Calendar} etiqueta="Fechas">{fechasCurso(curso)}</FilaDato>
        <FilaDato icono={Clock} etiqueta="Horas">{curso.horasLectivas} horas lectivas</FilaDato>
        <FilaDato icono={Users} etiqueta="Cupos" alerta={sinCupos}>{cuposCurso(curso)}</FilaDato>
      </dl>
      <div className="mt-auto border-t border-line pt-2.5">
        <PreciosCurso curso={curso} mostrarGeneral={!publico || curso.admiteExternos === true} />
      </div>
    </div>
  </article>
}

/** SCRUM-187 · S3 5.0 · Bienvenida del subdominio público con los accesos principales. */
function BienvenidaPublica() {
  return <section aria-labelledby="titulo-bienvenida" className="flex items-center gap-8 overflow-hidden rounded-2xl bg-brand p-6 text-white sm:p-10">
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <p className="text-xs leading-4 font-medium tracking-[0.96px] text-gold-light uppercase">Capacitación docente · Región Cusco</p>
      <h1 id="titulo-bienvenida" className="font-serif text-[28px] leading-9 font-bold sm:text-[40px] sm:leading-12">Cursos vigentes del CPPP</h1>
      <p className="max-w-150 text-base leading-6 text-brand-soft">Elige tu curso, inscríbete y paga en línea, por transferencia o en efectivo. Al terminar, descarga tu constancia verificable.</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <a href="#proximos-cursos" className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-ink hover:bg-gold-light"><BookOpen className="size-4.5" aria-hidden />Ver cursos</a>
        <Link to="/verificar" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-brand hover:bg-brand-soft"><Award className="size-4.5" aria-hidden />Consultar constancias</Link>
      </div>
    </div>
    <div aria-hidden className="relative hidden h-50 w-90 shrink-0 overflow-hidden rounded-xl bg-brand-night lg:flex">
      <span className="absolute -top-12 -right-12 size-44 rounded-full bg-white/10" />
      <span className="absolute -bottom-8 -left-6 size-24 rounded-full bg-white/10" />
      <Award className="m-auto size-10 text-gold" strokeWidth={1.5} />
    </div>
  </section>
}
