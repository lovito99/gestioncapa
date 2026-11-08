import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EstadoCertificado } from './certificados'

export type MaterialCurso = { id: string; titulo: string; tipo: 'PDF' | 'ENLACE' | 'VIDEO'; url: string | null }
export type ModuloCurso = { id: string; titulo: string; orden: number; materiales: MaterialCurso[] }
export type Curso = {
  id: string; titulo: string; descripcion: string; instructorId: string; instructorNombre: string;
  horasLectivas: number; modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA'; costo: number; cupos: number;
  categoria: string; fechaInicio: string | null; fechaFin: string | null; cuposDisponibles: number; inscrito?: boolean;
  tipoCertificado: 'PARTICIPACION' | 'APROBACION'; notaMinima: number; estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO';
  estadoInscripcion?: 'EN_CURSO' | 'TERMINADO' | 'PENDIENTE_PAGO' | null;
  requisitoAsistencia: number;
}
export const categoriasCatalogo = ['Educación', 'General', 'Seguridad y salud', 'Tecnología'] as const
export type ModuloEntrada = { id?: string; titulo: string }
export type SesionEntrada = { nombre: string; fecha: string; horaInicio: string; horaFin: string; lugar: string }
export type SesionCurso = SesionEntrada & { id: string; cursoId?: string; estado: 'PROGRAMADA' | 'CANCELADA' }
export type AsistenciaCurso = { totalSesiones: number; presentes: number; porcentaje: number; requisitoAsistencia: number; cumpleAsistencia: boolean }
export type DetalleCurso = Curso & { modulos: ModuloCurso[]; sesiones: SesionCurso[] }
export type FilaCierre = { agremiado: { id: string; nombre: string }; presentes: number; sesiones: number; porcentaje: number; cumple: boolean }
export type CierreCurso = { curso: DetalleCurso; requisitoAsistencia: number; filas: FilaCierre[] }
export type ExcepcionCierre = { agremiadoId: string; motivo: string }
export type FilaCertificado = { agremiado: { id: string; nombre: string }; cumple: boolean; porExcepcion: boolean;
  certificado: { codigo: string; estado: EstadoCertificado; nombre: string } | null }
export type CertificadosCurso = { curso: DetalleCurso; filas: FilaCertificado[] }
export type CursoEntrada = Pick<Curso, 'titulo' | 'descripcion' | 'instructorId' | 'horasLectivas' | 'modalidad' | 'costo' | 'cupos' | 'tipoCertificado'> & {
  categoria?: string; fechaInicio?: string | null; fechaFin?: string | null;
  notaMinima?: number; modulos: ModuloEntrada[]
}
/** Categorías que ofrece el formulario de curso; pendientes de confirmar con el CPPP */
export const CATEGORIAS_CURSO = ['Educación', 'Evaluación', 'Didáctica', 'Gestión escolar', 'Tecnología educativa', 'Seguridad y salud', 'General']
export const MODALIDADES_CURSO = { PRESENCIAL: 'Presencial', VIRTUAL: 'Virtual', HIBRIDA: 'Híbrida' } as const
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
export type FiltrosCatalogo = { buscar?: string; modalidad?: string; categoria?: string; pagina?: number; tamanoPagina?: number }
export type CursoPublico = Pick<Curso, 'id' | 'titulo' | 'descripcion' | 'instructorNombre' | 'horasLectivas' | 'modalidad' | 'costo' | 'cupos' | 'cuposDisponibles' | 'categoria' | 'fechaInicio' | 'fechaFin'>
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

export const cursos = {
  publico: async (filtros: FiltrosCatalogo) => (await api.get<PaginaCatalogo<CursoPublico>>('/publico/cursos', { params: filtros })).data,
  catalogo: async (filtros: FiltrosCatalogo) => (await api.get<PaginaCatalogo>('/catalogo/cursos/pagina', { params: filtros })).data,
  inscribirme: async (id: string) => (await api.post<{ cursoId: string; estado: 'EN_CURSO' | 'TERMINADO' | 'PENDIENTE_PAGO'; yaInscrito: boolean }>(`/cursos/${id}/inscribirme`)).data,
  programarSesion: async (id: string, entrada: SesionEntrada) => (await api.post<SesionCurso>(`/cursos/${id}/sesiones`, entrada)).data,
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
  cerrar: async (id: string, excepciones: ExcepcionCierre[]) => (await api.post<{ emitidos: number }>(`/cursos/${id}/cerrar`, { excepciones })).data,
  certificados: async (id: string) => (await api.get<CertificadosCurso>(`/cursos/${id}/certificados`)).data,
  emitirExcepcion: async (id: string, agremiadoId: string, motivo: string) => (await api.post<{ codigo: string }>(`/cursos/${id}/excepciones`, { agremiadoId, motivo })).data,
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
