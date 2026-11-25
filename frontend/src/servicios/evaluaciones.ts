import { api } from '@/lib/api'
import type { ModalidadCurso } from './modalidadCurso'

export type PoliticaEvaluacion = { notaMinima: number; intentosMaximos: number }
export type LeccionEvaluacion = { id: string; titulo: string; modulo: string; url: string }
export type PreguntaAutor = { enunciado: string; opciones: string[]; correcta: number }
export type EvaluacionEntrada = { titulo: string; oficial: boolean; preguntas: PreguntaAutor[]; leccionesIds: string[] }
export type EvaluacionAutor = EvaluacionEntrada & { id: string; publicada: boolean }
export type GestionEvaluaciones = { modalidad: ModalidadCurso; avanceMedido: boolean; lecciones: LeccionEvaluacion[]; evaluaciones: EvaluacionAutor[] }

export type EstadoEvaluacion = {
  mejorNota: number | null
  aprobado: boolean
  intentosUsados: number
  intentosRestantes: number
  finalizado: boolean
}
export type EvaluacionResumen = PoliticaEvaluacion & {
  id: string
  titulo: string
  oficial: boolean
  bloqueada: boolean
  estado: EstadoEvaluacion
}
export type EvaluacionPublica = EvaluacionResumen & {
  preguntas: { id: string; enunciado: string; opciones: { id: string; texto: string }[] }[]
}
export type AulaEvaluacion = {
  titulo: string
  modalidad: ModalidadCurso
  lecciones: (LeccionEvaluacion & { completada: boolean })[]
  evaluaciones: EvaluacionResumen[]
}
export type IntentoEvaluacionEntrada = { operacionId: string; respuestas: { preguntaId: string; opcionId: string }[] }
export type IntentoEvaluacion = { nota: number; aprobado: boolean; estado: EstadoEvaluacion }

const rutaCurso = (id: string) => `/cursos/${encodeURIComponent(id)}`
const rutaLista = (id: string) => `${rutaCurso(id)}/evaluaciones`
const rutaEvaluacion = (id: string, evaluacionId: string) => `${rutaLista(id)}/${encodeURIComponent(evaluacionId)}`

export const evaluaciones = {
  politica: async (id: string) => (await api.get<PoliticaEvaluacion>(`${rutaCurso(id)}/politica-evaluacion`)).data,
  actualizarPolitica: async (id: string, entrada: PoliticaEvaluacion) =>
    (await api.patch<PoliticaEvaluacion>(`${rutaCurso(id)}/politica-evaluacion`, entrada)).data,
  gestion: async (id: string) => (await api.get<GestionEvaluaciones>(`${rutaLista(id)}/gestion`)).data,
  crear: async (id: string, entrada: EvaluacionEntrada) =>
    (await api.post<EvaluacionAutor>(`${rutaLista(id)}/gestion`, entrada)).data,
  editar: async (id: string, evaluacionId: string, entrada: EvaluacionEntrada) =>
    (await api.put<EvaluacionAutor>(rutaEvaluacion(id, evaluacionId), entrada)).data,
  publicar: async (id: string, evaluacionId: string) =>
    (await api.post<EvaluacionAutor>(`${rutaEvaluacion(id, evaluacionId)}/publicar`, {})).data,
  aula: async (id: string) => (await api.get<AulaEvaluacion>(rutaLista(id))).data,
  obtener: async (id: string, evaluacionId: string) =>
    (await api.get<EvaluacionPublica>(rutaEvaluacion(id, evaluacionId))).data,
  rendir: async (id: string, evaluacionId: string, entrada: IntentoEvaluacionEntrada) =>
    (await api.post<IntentoEvaluacion>(`${rutaEvaluacion(id, evaluacionId)}/intentos`, entrada)).data,
  completar: async (id: string, leccionId: string) =>
    (await api.post<{ completada: boolean }>(`${rutaLista(id)}/lecciones/${encodeURIComponent(leccionId)}/completar`, {})).data,
}
