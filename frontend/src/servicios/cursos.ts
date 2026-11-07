import { api } from '@/lib/api'

export type MaterialCurso = { id: string; titulo: string; tipo: 'PDF' | 'ENLACE' | 'VIDEO'; url: string | null }
export type ModuloCurso = { id: string; titulo: string; orden: number; materiales: MaterialCurso[] }
export type Curso = {
  id: string; titulo: string; descripcion: string; instructorId: string; instructorNombre: string;
  horasLectivas: number; modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA'; costo: number; cupos: number;
  tipoCertificado: 'PARTICIPACION' | 'APROBACION'; notaMinima: number; estado: 'BORRADOR' | 'PUBLICADO';
}
export type SesionEntrada = { nombre: string; fecha: string; horaInicio: string; horaFin: string; lugar: string }
export type SesionCurso = SesionEntrada & { id: string; cursoId: string; estado: 'PROGRAMADA' | 'CANCELADA' }
export type AsistenciaCurso = { totalSesiones: number; presentes: number; porcentaje: number; requisitoAsistencia: number; cumpleAsistencia: boolean }
export type DetalleCurso = Curso & { modulos: ModuloCurso[]; sesiones: SesionCurso[] }
export type CursoEntrada = Pick<Curso, 'titulo' | 'descripcion' | 'instructorId' | 'horasLectivas' | 'modalidad' | 'costo' | 'cupos' | 'tipoCertificado'> & {
  notaMinima?: number; modulos: { titulo: string }[]
}
export type MaterialEntrada = { titulo: string } & ({ tipo: 'PDF'; contenidoBase64: string } | { tipo: 'ENLACE' | 'VIDEO'; url: string })
export const cursos = {
  programarSesion: async (id: string, entrada: SesionEntrada) => (await api.post<SesionCurso>(`/cursos/${id}/sesiones`, entrada)).data,
  miAsistencia: async (id: string) => (await api.get<AsistenciaCurso>(`/cursos/${id}/mi-asistencia`)).data,
  listar: async (catalogo = false) => (await api.get<Curso[]>(catalogo ? '/catalogo/cursos' : '/cursos')).data,
  obtener: async (id: string) => (await api.get<DetalleCurso>(`/cursos/${id}`)).data,
  instructores: async () => (await api.get<{ id: string; nombre: string }[]>('/cursos/instructores')).data,
  crear: async (entrada: CursoEntrada) => (await api.post<DetalleCurso>('/cursos', entrada)).data,
  publicar: async (id: string) => (await api.post<DetalleCurso>(`/cursos/${id}/publicar`)).data,
  material: async (id: string, moduloId: string, entrada: MaterialEntrada) => (await api.post<MaterialCurso>(`/cursos/${id}/modulos/${moduloId}/materiales`, entrada)).data,
  descargar: async (id: string, moduloId: string, materialId: string) => (await api.get<Blob>(`/cursos/${id}/modulos/${moduloId}/materiales/${materialId}/archivo`, { responseType: 'blob' })).data,
}
