import { api } from '@/lib/api'

export type MaterialCurso = { id: string; titulo: string; tipo: 'PDF' | 'ENLACE' | 'VIDEO'; url: string | null }
export type ModuloCurso = { id: string; titulo: string; orden: number; materiales: MaterialCurso[] }
export type Curso = {
  id: string; titulo: string; descripcion: string; instructorId: string; instructorNombre: string;
  horasLectivas: number; modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA'; costo: number; cupos: number;
  categoria: string; fechaInicio: string | null; fechaFin: string | null; cuposDisponibles: number; inscrito?: boolean;
  tipoCertificado: 'PARTICIPACION' | 'APROBACION'; notaMinima: number; estado: 'BORRADOR' | 'PUBLICADO';
}
export type DetalleCurso = Curso & { modulos: ModuloCurso[] }
export type CursoEntrada = Pick<Curso, 'titulo' | 'descripcion' | 'instructorId' | 'horasLectivas' | 'modalidad' | 'costo' | 'cupos' | 'tipoCertificado'> & {
  categoria?: string; fechaInicio?: string | null; fechaFin?: string | null;
  notaMinima?: number; modulos: { titulo: string }[]
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
  publicar: async (id: string) => (await api.post<DetalleCurso>(`/cursos/${id}/publicar`)).data,
  material: async (id: string, moduloId: string, entrada: MaterialEntrada) => (await api.post<MaterialCurso>(`/cursos/${id}/modulos/${moduloId}/materiales`, entrada)).data,
  descargar: async (id: string, moduloId: string, materialId: string) => (await api.get<Blob>(`/cursos/${id}/modulos/${moduloId}/materiales/${materialId}/archivo`, { responseType: 'blob' })).data,
}
