import { api } from '@/lib/api'

type LeccionAula = { tipo: 'LECCION'; id: string; titulo: string; resumen: string; video: string }
export type EvaluacionAula = { tipo: 'EVALUACION'; id: string; titulo: string; pregunta: string; opciones: string[] }
export type ActividadAula = LeccionAula | EvaluacionAula
export type ModuloAula = { id: string; titulo: string; actividades: ActividadAula[] }
export type AulaGrabada = { titulo: string; modulos: ModuloAula[]; completadas: string[] }
type ResultadoActividad = { correcta: boolean; completadas: string[] }

export const aulaGrabada = {
  obtener: async (cursoId: string) =>
    (await api.get<AulaGrabada>(`/cursos/${encodeURIComponent(cursoId)}/aula`)).data,
  completar: async (cursoId: string, actividadId: string, opcion?: number) =>
    (await api.post<ResultadoActividad>(`/cursos/${encodeURIComponent(cursoId)}/aula/actividades/${encodeURIComponent(actividadId)}`, { opcion })).data,
  constancia: async (cursoId: string) =>
    (await api.get<Blob>(`/cursos/${encodeURIComponent(cursoId)}/aula/constancia`, { responseType: 'blob' })).data,
}
