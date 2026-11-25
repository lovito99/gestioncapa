import { api } from '@/lib/api'
import { guardarDescargaPdf } from './cursos'

export type EstadoLeccion = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA'
export type MarcaLeccion = Exclude<EstadoLeccion, 'PENDIENTE'>
export type LeccionYoutube = {
  id: string
  moduloId: string
  modulo: string
  titulo: string
  orden: number
  youtubeId: string | null
  duracionSegundos: number | null
  tienePdf: boolean
  estado: EstadoLeccion
  completadaEn: string | null
}
export type ListaLecciones = { revision: number; puedeGestionar: boolean; lecciones: LeccionYoutube[] }
export type NuevaLeccion = { moduloId: string; titulo: string; url: string; operacionId: string }
export type OrdenLecciones = { revision: number; ids: string[] }

const ruta = (curso: string) => `/cursos/${encodeURIComponent(curso)}/lecciones`
const unidad = (curso: string, leccion: string) => `${ruta(curso)}/${encodeURIComponent(leccion)}`

export const leccionesYoutube = {
  listar: async (curso: string) => (await api.get<ListaLecciones>(ruta(curso))).data,
  crear: async (curso: string, datos: NuevaLeccion) => (await api.post<LeccionYoutube>(ruta(curso), datos)).data,
  ordenar: async (curso: string, orden: OrdenLecciones) =>
    (await api.put<Pick<ListaLecciones, 'revision' | 'lecciones'>>(`${ruta(curso)}/orden`, orden)).data,
  adjuntar: async (curso: string, leccion: string, contenidoBase64: string) =>
    api.put(`${unidad(curso, leccion)}/pdf`, { contenidoBase64 }),
  descargar: async (curso: string, leccion: string) => {
    const { data } = await api.get<Blob>(`${unidad(curso, leccion)}/pdf`, { responseType: 'blob' })
    guardarDescargaPdf(data)
  },
  marcar: async (curso: string, leccion: string, estado: MarcaLeccion) =>
    (await api.put<Pick<LeccionYoutube, 'estado' | 'completadaEn'>>(`${unidad(curso, leccion)}/estado`, { estado })).data,
}
