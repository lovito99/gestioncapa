import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EstadoCertificado } from './certificados'

export type MaterialCurso = { id: string; titulo: string; tipo: 'PDF' | 'ENLACE' | 'VIDEO'; url: string | null }
export type ModuloCurso = { id: string; titulo: string; orden: number; materiales: MaterialCurso[] }
export type Curso = {
  id: string; titulo: string; descripcion: string; instructorId: string; instructorNombre: string;
  horasLectivas: number; modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA'; costo: number; cupos: number;
  categoria: string; fechaInicio: string | null; fechaFin: string | null; cuposDisponibles: number; inscrito?: boolean;
  tipoCertificado: 'PARTICIPACION' | 'APROBACION'; notaMinima: number; estado: EstadoCurso;
  /** Porcentaje mínimo de sesiones asistidas para obtener la constancia (SCRUM-171); 80 por defecto */
  requisitoAsistencia: number;
}
/** CERRADO: el administrador cerró el curso y emitió los certificados (2.4) */
export type EstadoCurso = 'BORRADOR' | 'PUBLICADO' | 'CERRADO'
/** Sesión del curso: es una clase con `cursoId` igual al curso (3.2 · Nueva clase) */
export type SesionCurso = { id: string; nombre: string; fecha: string; horaInicio: string; horaFin: string; lugar: string; estado: 'PROGRAMADA' | 'CANCELADA' }
export type DetalleCurso = Curso & { modulos: ModuloCurso[]; sesiones: SesionCurso[] }

/** 2.4 · Fila de «Cerrar curso»: asistencia de cada inscrito frente al requisito */
export type FilaCierre = {
  agremiado: { id: string; nombre: string }
  presentes: number; sesiones: number; porcentaje: number; cumple: boolean
}
export type CierreCurso = { curso: DetalleCurso; requisitoAsistencia: number; filas: FilaCierre[] }
/** Constancia emitida a quien no cumple el requisito; el motivo queda registrado */
export type ExcepcionCierre = { agremiadoId: string; motivo: string }

/** 2.5 · Fila de «Certificados del curso» */
export type FilaCertificado = {
  agremiado: { id: string; nombre: string }
  cumple: boolean; porExcepcion: boolean
  certificado: { codigo: string; estado: EstadoCertificado; nombre: string } | null
}
export type CertificadosCurso = { curso: DetalleCurso; filas: FilaCertificado[] }
/** Al editar, los módulos con `id` conservan su material; los que no lo tienen son nuevos */
export type ModuloEntrada = { id?: string; titulo: string }
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
export type PaginaCatalogo = { items: Curso[]; total: number; pagina: number; tamanoPagina: number; totalPaginas: number; categorias: string[] }
export const cursos = {
  catalogo: async (filtros: FiltrosCatalogo) => (await api.get<PaginaCatalogo>('/catalogo/cursos/pagina', { params: filtros })).data,
  inscribirme: async (id: string) => (await api.post<{ cursoId: string; estado: string; yaInscrito: boolean }>(`/cursos/${id}/inscribirme`)).data,
  listar: async (catalogo = false) => (await api.get<Curso[]>(catalogo ? '/catalogo/cursos' : '/cursos')).data,
  obtener: async (id: string) => (await api.get<DetalleCurso>(`/cursos/${id}`)).data,
  instructores: async () => (await api.get<{ id: string; nombre: string }[]>('/cursos/instructores')).data,
  crear: async (entrada: CursoEntrada) => (await api.post<DetalleCurso>('/cursos', entrada)).data,
  actualizar: async (id: string, entrada: CursoEntrada) => (await api.put<DetalleCurso>(`/cursos/${id}`, entrada)).data,
  quitarMaterial: async (id: string, moduloId: string, materialId: string) => { await api.delete(`/cursos/${id}/modulos/${moduloId}/materiales/${materialId}`) },
  publicar: async (id: string) => (await api.post<DetalleCurso>(`/cursos/${id}/publicar`)).data,
  material: async (id: string, moduloId: string, entrada: MaterialEntrada) => (await api.post<MaterialCurso>(`/cursos/${id}/modulos/${moduloId}/materiales`, entrada)).data,
  cierre: async (id: string) => (await api.get<CierreCurso>(`/cursos/${id}/cierre`)).data,
  cerrar: async (id: string, excepciones: ExcepcionCierre[]) => (await api.post<{ emitidos: number }>(`/cursos/${id}/cerrar`, { excepciones })).data,
  certificados: async (id: string) => (await api.get<CertificadosCurso>(`/cursos/${id}/certificados`)).data,
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
