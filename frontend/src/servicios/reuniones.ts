import { api } from '@/lib/api'

export type Reunion = {
  identificador: string
  claseIdentificador: string
  titulo: string
  inicioProgramado: string
  finProgramado: string
  estado: 'programada' | 'iniciada' | 'cancelada' | 'finalizada'
}
export type CredencialReunion = { token: string; dominio: string; direccionServidor: string; nombreSala: string; nombre: string }
export type ParticipanteAutorizado = { identificador: string; nombre: string; correo: string; rol: string; estado: string }
export const reuniones = {
  obtener: async (identificador: string) => (await api.get<Reunion>(`/reuniones/${identificador}`)).data,
  participantes: async (identificador: string) => (await api.get<ParticipanteAutorizado[]>(`/reuniones/${identificador}/participantes`)).data,
  listar: async () => (await api.get<Reunion[]>('/reuniones')).data,
  crear: async (datos: { claseIdentificador: string; titulo: string; inicioProgramado: string; finProgramado: string }) =>
    (await api.post<Reunion>('/reuniones', datos)).data,
  cambiarEstado: async (identificador: string, accion: string) =>
    (await api.post(`/reuniones/${identificador}/${accion}`)).data,
  credencial: async (identificador: string) =>
    (await api.post<CredencialReunion>(`/reuniones/${identificador}/credencial`)).data,
}
