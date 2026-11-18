import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { EstadoCertificado } from './certificados'
import type { ModalidadCurso, ModalidadSesion } from './modalidadCurso'

export type MaterialCurso = { id: string; titulo: string; tipo: 'PDF' | 'ENLACE' | 'VIDEO'; url: string | null }
export type ModuloCurso = { id: string; titulo: string; orden: number; materiales: MaterialCurso[] }
export type ModalidadCobro = 'PREVIO' | 'CERTIFICADO' | 'GRATUITO'
/** `costo` es el precio para colegiados; `precioGeneral`, el de externos (SCRUM-190). */
export type PoliticaCobro = { modalidadCobro: ModalidadCobro | ''; costo: number; precioGeneral: number; plazoPagoMinutos: number | null }
/** Precio que paga quien consulta el curso, según el padrón de colegiados (SCRUM-191). */
export type MiPrecio = { tipo: 'COLEGIADO' | 'GENERAL'; importe: number; dniParcial: string | null; enPadron: boolean }
export type Curso = {
  modalidadCobro?: ModalidadCobro | null; plazoPagoMinutos?: number | null; versionCobro?: number;
  /** Precio para docentes externos; ausente en cursos anteriores a SCRUM-190 (se usa `costo`). */
  precioGeneral?: number | null;
  admiteExternos?: boolean;
  /** URL de la portada 16:9; `null` usa la imagen por defecto de la categoría (SCRUM-182). */
  portadaUrl?: string | null;
  miPrecio?: MiPrecio | null;
  impedimentoInscripcion?: { codigo: string; mensaje: string };
  id: string; titulo: string; descripcion: string; instructorId: string; instructorNombre: string;
  horasLectivas: number; modalidad: ModalidadCurso; costo: number; cupos: number;
  categoria: string; fechaInicio: string | null; fechaFin: string | null; cuposDisponibles: number; inscrito?: boolean;
  tipoCertificado: 'PARTICIPACION' | 'APROBACION'; notaMinima: number; estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO';
  estadoInscripcion?: 'EN_CURSO' | 'TERMINADO' | 'PENDIENTE_PAGO' | 'CANCELADA' | null;
  accesoContenido?: boolean;
  miInscripcion?: { intentoId:string;modalidadCobro:ModalidadCobro;importeCentimos:number;moneda:'PEN';plazoPagoMinutos:number|null;
    inscritoEn:string;venceEn:string|null;pagoId:string|null;estado:string;estadoFinanciero:string;estadoEntrega?:string|null } | null;
  requisitoAsistencia: number;
}
export const categoriasCatalogo = ['Educación', 'General', 'Seguridad y salud', 'Tecnología'] as const
export type ModuloEntrada = { id?: string; titulo: string }
/** S3 6.1 · Reglas de la sala virtual al programar la sesión (mismas claves que `PATCH /reuniones/:id/politicas`). */
export type SalaSesion = { grabacionPrevista: boolean; pantallaPermitida: boolean; microfonoPermitido: boolean; manoPermitida: boolean; porcentajeMinimo: number }
/**
 * `lugar` se sigue enviando («Aula 3, Sede CPPP Cusco») para el backend actual; `sede`, `aula`,
 * `encargadoId`, `qrRotatorio` y `sala` son los campos nuevos del diseño S3 6.1 (opcionales).
 */
export type SesionEntrada = { nombre: string; fecha: string; horaInicio: string; horaFin: string; lugar: string; modalidad: ModalidadSesion
  sede?: string; aula?: string; encargadoId?: string; qrRotatorio?: boolean; sala?: SalaSesion }
/** `reunion` solo llega a quien gestiona el curso o tiene acceso a él (HU-36). */
export type SesionCurso = SesionEntrada & { id: string; cursoId?: string; estado: 'PROGRAMADA' | 'CANCELADA'; reunion: { identificador: string; estado: string } | null }
export type AsistenciaCurso = { totalSesiones: number; presentes: number; porcentaje: number; requisitoAsistencia: number; cumpleAsistencia: boolean }
export type DetalleCurso = Curso & { modulos: ModuloCurso[]; sesiones: SesionCurso[] }
export type FilaCierre = { agremiado: { id: string; nombre: string }; presentes: number; sesiones: number; porcentaje: number; cumple: boolean }
export type CierreCurso = { curso: DetalleCurso; requisitoAsistencia: number; filas: FilaCierre[] }
export type ExcepcionCierre = { agremiadoId: string; motivo: string }
export type FilaCertificado = { agremiado: { id: string; nombre: string }; cumple: boolean; porExcepcion: boolean;
  entrega?:{estado:'RETENIDA'|'EMITIDA';pagoId:string;estadoPago:'PENDIENTE'|'PAGADO'}|null;
  certificado: { codigo: string; estado: EstadoCertificado; nombre: string } | null }
export type CertificadosCurso = { curso: DetalleCurso; filas: FilaCertificado[] }
export type CursoEntrada = Pick<Curso, 'titulo' | 'descripcion' | 'instructorId' | 'horasLectivas' | 'modalidad' | 'costo' | 'cupos' | 'tipoCertificado'> & {
  modalidadCobro?: ModalidadCobro; plazoPagoMinutos?: number | null; precioGeneral?: number;
  categoria?: string; fechaInicio?: string | null; fechaFin?: string | null;
  notaMinima?: number; modulos: ModuloEntrada[]
}
/** Categorías que ofrece el formulario de curso; pendientes de confirmar con el CPPP */
export const CATEGORIAS_CURSO = ['Educación', 'Evaluación', 'Didáctica', 'Gestión escolar', 'Tecnología educativa', 'Seguridad y salud', 'General']
export const MODALIDADES_CURSO = { PRESENCIAL: 'Presencial', VIRTUAL: 'Virtual', HIBRIDA: 'Híbrida', GRABADO: 'Grabado' } as const
export const CERTIFICADOS_CURSO = { PARTICIPACION: 'Constancia de participación', APROBACION: 'Certificado de aprobación' } as const

/** Lee un PDF de hasta 5 MB y devuelve su contenido en base64, como lo espera la API. */
export function leerPdfBase64(archivo: File): Promise<string> {
  if (archivo.size > 5242880) return Promise.reject(new Error('El PDF no puede superar 5 MB.'))
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result).split(',')[1] ?? '')
    lector.onerror = () => reject(new Error('No pudimos leer el PDF. Selecciónalo de nuevo.'))
    lector.readAsDataURL(archivo)
  })
}
export type MaterialEntrada = { titulo: string } & ({ tipo: 'PDF'; contenidoBase64: string } | { tipo: 'ENLACE' | 'VIDEO'; url: string })
export type FiltrosCatalogo = { buscar?: string; modalidad?: string; categoria?: string; cobro?: string; pagina?: number; tamanoPagina?: number }
/** Portada que se sube con el curso: JPG, PNG o WebP de hasta 1 MB (SCRUM-182). */
export type PortadaEntrada = { nombre: string; tipo: 'image/jpeg' | 'image/png' | 'image/webp'; contenidoBase64: string }
export type CursoPublico = Pick<Curso, 'id' | 'titulo' | 'descripcion' | 'instructorNombre' | 'horasLectivas' | 'modalidad' | 'costo' | 'cupos' | 'cuposDisponibles' | 'categoria' | 'fechaInicio' | 'fechaFin' | 'modalidadCobro' | 'plazoPagoMinutos' | 'versionCobro' | 'precioGeneral' | 'portadaUrl'>
/**
 * SCRUM-187 · Detalle público del curso (sin sesión). Las sesiones no traen la sala virtual,
 * el encargado ni datos de inscritos.
 */
export type CursoPublicoDetalle = CursoPublico & Pick<Curso, 'tipoCertificado' | 'notaMinima'> & { requisitoAsistencia: number
  sesiones: Pick<SesionCurso, 'id' | 'nombre' | 'fecha' | 'horaInicio' | 'horaFin' | 'lugar' | 'modalidad'>[] }
export type PaginaCatalogo<T = Curso> = { items: T[]; total: number; pagina: number; tamanoPagina: number; totalPaginas: number; categorias: string[] }
/** Porcentaje de asistencia que pide el Figma cuando el curso no indica otro */
export const REQUISITO_ASISTENCIA_POR_DEFECTO = 80

/**
 * Transición: el backend actual aún no envía `sesiones` ni `requisitoAsistencia`
 * (ver docs/esp/pantallas-figma.md). Con estos valores las pantallas no se rompen; cuando el
 * backend los envíe, se usan los suyos.
 */
function conValoresNuevos<T extends Curso>(curso: T): T & { sesiones: SesionCurso[]; requisitoAsistencia: number } {
  const enviado = curso as T & Partial<Pick<DetalleCurso, 'sesiones' | 'requisitoAsistencia'>>
  return { ...curso, sesiones: enviado.sesiones ?? [], requisitoAsistencia: enviado.requisitoAsistencia ?? REQUISITO_ASISTENCIA_POR_DEFECTO }
}

/**
 * Transición SCRUM-187: si el backend aún no tiene `GET /publico/cursos/:id` (404), arma el detalle
 * desde el catálogo público con valores por defecto y sin sesiones. Si tampoco está ahí, propaga el 404.
 */
async function publicoDetalle(id: string): Promise<CursoPublicoDetalle> {
  try {
    return (await api.get<CursoPublicoDetalle>(`/publico/cursos/${id}`)).data
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error
    for (let pagina = 1; pagina <= 10; pagina++) {
      const lista = (await api.get<PaginaCatalogo<CursoPublico>>('/publico/cursos', { params: { pagina, tamanoPagina: 50 } })).data
      const curso = lista.items.find(item => String(item.id) === id)
      if (curso) return { tipoCertificado: 'PARTICIPACION', notaMinima: 0, requisitoAsistencia: REQUISITO_ASISTENCIA_POR_DEFECTO, sesiones: [], ...curso }
      if (pagina >= lista.totalPaginas) break
    }
    throw error
  }
}

export const cursos = {
  actualizarCobro: async (id: string, entrada: Omit<PoliticaCobro, 'precioGeneral'> & { precioGeneral?: number; versionCobro: number }) =>
    conValoresNuevos((await api.patch<DetalleCurso>(`/cursos/${id}/cobro`, entrada)).data),
  subirPortada: async (id: string, entrada: PortadaEntrada) => (await api.put<{ portadaUrl: string }>(`/cursos/${id}/portada`, entrada)).data,
  quitarPortada: async (id: string) => { await api.delete(`/cursos/${id}/portada`) },
  publicoDetalle: (id: string) => publicoDetalle(id),
  enlaceCompartir: async (id: string) => (await api.get<EnlaceCompartir>(`/publico/cursos/${id}/compartir`)).data,
  publico: async (filtros: FiltrosCatalogo) => (await api.get<PaginaCatalogo<CursoPublico>>('/publico/cursos', { params: filtros })).data,
  catalogo: async (filtros: FiltrosCatalogo) => (await api.get<PaginaCatalogo>('/catalogo/cursos/pagina', { params: filtros })).data,
  inscribirme: async (id: string, versionCobro?: number, tipoPrecio?: MiPrecio['tipo']) =>
    (await api.post<{ cursoId: string; estado: 'EN_CURSO' | 'TERMINADO' | 'PENDIENTE_PAGO'; yaInscrito: boolean }>(
      `/cursos/${id}/inscribirme`, { versionCobro, tipoPrecio })).data,
  programarSesion: async (id: string, entrada: SesionEntrada) => (await api.post<SesionCurso>(`/cursos/${id}/sesiones`, entrada)).data,
  /** Editar una sesión: es una clase del curso, se guarda con `PUT /clases/:id`. */
  editarSesion: async (sesionId: string, entrada: SesionEntrada & { cursoId: string; instructorId: string }) => (await api.put<SesionCurso>(`/clases/${sesionId}`, entrada)).data,
  miAsistencia: async (id: string) => (await api.get<AsistenciaCurso>(`/cursos/${id}/mi-asistencia`)).data,
  listar: async (catalogo = false) => (await api.get<Curso[]>(catalogo ? '/catalogo/cursos' : '/cursos')).data,
  obtener: async (id: string) => conValoresNuevos((await api.get<DetalleCurso>(`/cursos/${id}`)).data),
  instructores: async () => (await api.get<{ id: string; nombre: string }[]>('/cursos/instructores')).data,
  crear: async (entrada: CursoEntrada) => conValoresNuevos((await api.post<DetalleCurso>('/cursos', entrada)).data),
  actualizar: async (id: string, entrada: CursoEntrada) => conValoresNuevos((await api.put<DetalleCurso>(`/cursos/${id}`, entrada)).data),
  quitarMaterial: async (id: string, moduloId: string, materialId: string) => { await api.delete(`/cursos/${id}/modulos/${moduloId}/materiales/${materialId}`) },
  publicar: async (id: string) => conValoresNuevos((await api.post<DetalleCurso>(`/cursos/${id}/publicar`)).data),
  material: async (id: string, moduloId: string, entrada: MaterialEntrada) => (await api.post<MaterialCurso>(`/cursos/${id}/modulos/${moduloId}/materiales`, entrada)).data,
  cierre: async (id: string) => (await api.get<CierreCurso>(`/cursos/${id}/cierre`)).data,
  cerrar: async (id: string, excepciones: ExcepcionCierre[]) => (await api.post<{ emitidos: number;retenidos?:number }>(`/cursos/${id}/cerrar`, { excepciones })).data,
  certificados: async (id: string) => (await api.get<CertificadosCurso>(`/cursos/${id}/certificados`)).data,
  emitirExcepcion: async (id: string, agremiadoId: string, motivo: string) => (await api.post<{ codigo: string|null;retenida?:boolean;pagoId?:string }>(`/cursos/${id}/excepciones`, { agremiadoId, motivo })).data,
  anularCertificado: async (codigo: string, motivo: string) => { await api.post(`/certificados/${encodeURIComponent(codigo)}/anular`, { motivo }) },
  corregirCertificado: async (codigo: string, nombre: string, motivo: string) =>
    (await api.post<{ codigo: string }>(`/certificados/${encodeURIComponent(codigo)}/corregir`, { nombre, motivo })).data,
  descargar: async (id: string, moduloId: string, materialId: string) => (await api.get<Blob>(`/cursos/${id}/modulos/${moduloId}/materiales/${materialId}/archivo`, { responseType: 'blob' })).data,
}

/** Cursos que se pueden elegir al programar una clase (3.2): todos menos los cerrados. */
export function useCursosParaClase() {
  return useQuery({
    queryKey: ['cursos', 'para-clase'],
    queryFn: async () => (await cursos.listar()).filter((c) => c.estado !== 'CERRADO'),
  })
}
