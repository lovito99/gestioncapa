import { api } from '@/lib/api'
import type { ModalidadCurso } from './modalidadCurso'

export type ConfiguracionContenido = { obligatorio: boolean; duracionMs: number | null }
export type MaterialContenido = ConfiguracionContenido & {
  id: string
  moduloId: string
  modulo: string
  titulo: string
  tipo: 'VIDEO' | 'PDF' | 'ENLACE'
  url: string | null
  version: number
}
export type ProgresoContenido = { vistoMs: number; posicionMs: number; completadaEn: string | null }
export type UnidadContenido = MaterialContenido & ProgresoContenido
export type AulaContenido = {
  titulo: string
  modalidad: ModalidadCurso
  medido: boolean
  porcentaje: number
  obligatorias: number
  completadas: number
  unidades: UnidadContenido[]
}
export type GestionContenido = Pick<AulaContenido, 'titulo' | 'modalidad' | 'medido'> & {
  estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO'
  unidades: MaterialContenido[]
  leccionesSalida: string[]
}
export type SesionReproduccion = ProgresoContenido & { sesionId: string; version: number; duracionMs: number }
export type ReporteContenido = { sesionId: string; secuencia: number; desdeMs: number; hastaMs: number; posicionMs: number }

const ruta = (id: string) => `/cursos/${encodeURIComponent(id)}/avance`
const material = (id: string, unidad: string) => `${ruta(id)}/materiales/${encodeURIComponent(unidad)}`

export const avance = {
  aula: async (id: string, titular: string) => (await api.get<AulaContenido>(`${ruta(id)}/${encodeURIComponent(titular)}`)).data,
  gestion: async (id: string) => (await api.get<GestionContenido>(`${ruta(id)}/gestion`)).data,
  activar: async (id: string) => (await api.post(`${ruta(id)}/activar`)).data,
  configurar: async (id: string, unidad: string, entrada: ConfiguracionContenido) =>
    (await api.put<MaterialContenido>(material(id, unidad), entrada)).data,
  marcar: async (id: string, unidad: string) =>
    (await api.post<ProgresoContenido>(`${material(id, unidad)}/visto`)).data,
  reproducir: async (id: string, unidad: string) =>
    (await api.post<SesionReproduccion>(`${material(id, unidad)}/reproducir`, undefined, { timeout: 7000 })).data,
  guardar: async (id: string, unidad: string, entrada: ReporteContenido) =>
    (await api.post<ProgresoContenido>(`${material(id, unidad)}/progreso`, entrada, { timeout: 7000 })).data,
}
