import { useQuery } from '@tanstack/react-query'
import { Award, Calendar, Clock, UserRound, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Aviso } from '@/components/ui/Aviso'
import { Boton } from '@/components/ui/Boton'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { esApiError, mensajeDeError } from '@/lib/api'
import { accesoConCurso } from '@/lib/retornoCurso'
import { cursos, type CursoPublicoDetalle } from '@/servicios/cursos'
import { BotonCompartir } from './CompartirCurso'
import { cuposCurso, fechasCurso } from './formatoCurso'
import { EtiquetaCategoria, EtiquetaCobro, EtiquetaModalidad, FilaDato, PortadaCurso } from './piezasCurso'
import { modalidadCobroDe, soles, textoPlazo } from './reglasCurso'
import { SesionesDetalle } from './SesionesDetalle'

/**
 * SCRUM-187 · S3 5.1 / 5.2 · Página pública del curso: la abre cualquiera con el enlace
 * «Compartir», sin iniciar sesión. «Inscribirme» pide el acceso y vuelve a este curso.
 */
export function PaginaPublicaCursoPagina() {
  const { id = '' } = useParams()
  const consulta = useQuery({ queryKey: ['cursos', 'publico', 'detalle', id], queryFn: () => cursos.publicoDetalle(id), retry: false })

  if (consulta.isPending) return <Cargando texto="Cargando curso…" />
  if (consulta.isError) {
    return <Contenedor>
      {esApiError(consulta.error, 'CURSO_NO_EXISTE')
        ? <Aviso tipo="advertencia" titulo="Este curso ya no está disponible">Puede que haya terminado o que el enlace esté incompleto. Revisa los cursos vigentes del CPPP.</Aviso>
        : <ErrorCarga mensaje={mensajeDeError(consulta.error, 'No pudimos cargar el curso.')} onReintentar={consulta.refetch} />}
    </Contenedor>
  }
  const curso = consulta.data
  return (
    <Contenedor>
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_23.5rem] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          <PortadaCurso curso={curso} className="rounded-xl" />
          <div className="flex flex-wrap gap-2">
            <EtiquetaModalidad modalidad={curso.modalidad} />
            <EtiquetaCobro curso={curso} />
            <EtiquetaCategoria categoria={curso.categoria} />
          </div>
          <div className="flex items-start gap-3">
            <h1 className="min-w-0 flex-1 font-serif text-2xl leading-8 font-bold text-ink sm:text-[32px] sm:leading-10">{curso.titulo}</h1>
            <span className="sm:hidden"><BotonCompartir curso={curso} grande /></span>
            <span className="hidden sm:inline-flex"><BotonCompartir curso={curso} conTexto /></span>
          </div>
          {curso.descripcion && <p className="text-base leading-6 whitespace-pre-wrap text-muted">{curso.descripcion}</p>}
          <dl className="flex flex-col gap-2.5 rounded-xl border border-line bg-white p-5">
            <FilaDato icono={UserRound} etiqueta="Instructor">{curso.instructorNombre}</FilaDato>
            <FilaDato icono={Calendar} etiqueta="Fechas">{fechasCurso(curso)}</FilaDato>
            <FilaDato icono={Clock} etiqueta="Horas">{curso.horasLectivas} horas lectivas</FilaDato>
            <FilaDato icono={Users} etiqueta="Cupos" alerta={curso.cuposDisponibles === 0}>{cuposCurso(curso)}</FilaDato>
            <FilaDato icono={Award} etiqueta="Certificado">
              {curso.tipoCertificado === 'APROBACION' ? `Certificado de aprobación · nota mínima ${curso.notaMinima}` : 'Constancia de participación'} · asistencia mínima {curso.requisitoAsistencia} %
            </FilaDato>
          </dl>
          <SesionesDetalle sesiones={curso.sesiones} />
        </div>
        <aside className="lg:sticky lg:top-8">
          <TarjetaPrecio curso={curso} />
        </aside>
      </div>
    </Contenedor>
  )
}

function TarjetaPrecio({ curso }: { curso: CursoPublicoDetalle }) {
  const { usuario } = useAuth()
  const navegar = useNavigate()
  const cobro = modalidadCobroDe(curso)
  const sinCupos = curso.cuposDisponibles === 0
  const general = curso.admiteExternos ? curso.precioGeneral : null
  const plazo = curso.plazoPagoMinutos ? textoPlazo(curso.plazoPagoMinutos) : 'unos días'
  const inscribirme = () => navegar(usuario ? `/cursos/${curso.id}` : accesoConCurso('/login', curso.id))
  return (
    <section aria-label="Inscripción" className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-6">
      <p className="text-xs leading-4 font-semibold text-brand">{cobro === 'CERTIFICADO' ? 'Precio de la constancia' : 'Precio'}</p>
      {cobro === 'GRATUITO'
        ? <p className="font-serif text-[28px] leading-9 font-bold text-success">Gratuito</p>
        : <div className="flex flex-col gap-2">
          <FilaPrecio titulo={general == null ? 'Tarifa del curso' : 'Colegiados del CPPP'} detalle={general == null ? undefined : 'Con afiliación habilitada y verificada'} importe={curso.costo} />
          {general != null && <FilaPrecio titulo="Público general" detalle="Docentes externos o no colegiados" importe={general} />}
        </div>}
      {!curso.admiteExternos && curso.precioGeneral != null && <p className="text-xs text-muted">La inscripción con tarifa general todavía no está disponible.</p>}
      {cobro === 'PREVIO' && <Aviso tipo="advertencia" titulo="Pago antes de llevar el curso">Al inscribirte tendrás {plazo} para pagar. Mientras tanto no podrás ver el contenido ni registrar asistencia.</Aviso>}
      {cobro === 'CERTIFICADO' && <Aviso titulo="Pagas solo el certificado">Llevas el curso gratis. Pagas la constancia al terminar, si cumples los requisitos.</Aviso>}
      {cobro === 'GRATUITO' && <Aviso tipo="exito" titulo="Curso gratuito">Ni la inscripción ni la constancia requieren pago.</Aviso>}
      <Boton onClick={inscribirme} disabled={sinCupos} className="h-12 w-full text-base sm:h-10 sm:text-sm">{sinCupos ? 'Sin cupos' : 'Inscribirme'}</Boton>
      {!usuario && <p className="text-center text-xs leading-4 text-muted">Te pediremos iniciar sesión o crear tu cuenta y volverás a este curso.</p>}
      {cobro !== 'GRATUITO' && <p className="text-xs leading-4 text-muted">Formas de pago: tarjeta o Yape (en línea), transferencia BCP o efectivo en la sede.</p>}
    </section>
  )
}

function FilaPrecio({ titulo, detalle, importe }: { titulo: string; detalle?: string; importe: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-page p-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-sm leading-5 font-semibold text-ink">{titulo}</p>
        {detalle && <p className="text-xs leading-4 text-muted">{detalle}</p>}
      </div>
      <p className="font-serif text-xl leading-7 font-bold whitespace-nowrap text-ink">{soles(importe)}</p>
    </div>
  )
}

function Contenedor({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-6 px-4 pt-6 pb-16 wrap-anywhere sm:px-10 sm:pt-10">
      <EnlaceVolver to="/capacitaciones">Ver todos los cursos</EnlaceVolver>
      {children}
    </main>
  )
}
