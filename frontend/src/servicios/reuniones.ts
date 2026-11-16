import { api } from '@/lib/api'

/** Permisos que el instructor guarda para su sala (HU-26). */
export type PoliticasReunion = {
  camaraPermitida: boolean
  microfonoPermitido: boolean
  pantallaPermitida: boolean
  manoPermitida: boolean
  porcentajeMinimo: number
  grabacionPrevista: boolean
}
export type Reunion = PoliticasReunion & {
  identificador: string
  claseIdentificador: string
  titulo: string
  inicioProgramado: string
  finProgramado: string
  estado: 'programada' | 'iniciada' | 'cancelada' | 'finalizada'
}
export type CredencialReunion = { token: string; dominio: string; direccionServidor: string; nombreSala: string; nombre: string }
export type ParticipanteAutorizado = { identificador: string; nombre: string; correo: string; rol: string; estado: string }
export type ResultadoAsistencia = { usuarioIdentificador: string; nombre: string; segundosConectados: number; porcentaje: number; cuenta: boolean; expulsado: boolean }
export type AsistenciaReunion = { porcentajeMinimo: number; iniciadaEn: string | null; finalizadaEn: string | null; resultados: ResultadoAsistencia[] }
export const reuniones = {
  obtener: async (identificador: string) => (await api.get<Reunion>(`/reuniones/${identificador}`)).data,
  participantes: async (identificador: string) => (await api.get<ParticipanteAutorizado[]>(`/reuniones/${identificador}/participantes`)).data,
  listar: async () => (await api.get<Reunion[]>('/reuniones')).data,
  crear: async (datos: { claseIdentificador: string; titulo: string; inicioProgramado: string; finProgramado: string }) =>
    (await api.post<Reunion>('/reuniones', datos)).data,
  cambiarEstado: async (identificador: string, accion: string) =>
    (await api.post(`/reuniones/${identificador}/${accion}`)).data,
  credencial: async (identificador: string, opciones: { aceptaGrabacion?: boolean } = {}) =>
    (await api.post<CredencialReunion>(`/reuniones/${identificador}/credencial`, opciones)).data,
  guardarPoliticas: async (identificador: string, politicas: PoliticasReunion) =>
    (await api.patch<Reunion>(`/reuniones/${identificador}/politicas`, politicas)).data,
  retirar: async (identificador: string, usuarioIdentificador: string) =>
    (await api.post<{ accesoRevocado: boolean }>(`/reuniones/${identificador}/participantes/${usuarioIdentificador}/retirar`)).data,
  asistencia: async (identificador: string) => (await api.get<AsistenciaReunion>(`/reuniones/${identificador}/asistencia`)).data,
}
