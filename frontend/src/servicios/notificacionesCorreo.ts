import { api } from '@/lib/api'

export const etiquetasTipoCorreo = {
  INSCRIPCION_CONFIRMADA: 'Inscripción confirmada',
  COMPROBANTE: 'Comprobante de pago',
  RECHAZO: 'Pago rechazado',
  CAMBIO_SESION: 'Cambio de sesión',
  CONSTANCIA_EMITIDA: 'Constancia emitida',
} as const

export const etiquetasEstadoCorreo = {
  PENDIENTE: 'Pendiente',
  ENVIANDO: 'Enviando',
  ENVIADO: 'Aceptado por SMTP',
  FALLIDO: 'Fallido',
  INCIERTO: 'Entrega incierta',
  OMITIDO: 'Omitido',
} as const

export type TipoCorreo = keyof typeof etiquetasTipoCorreo
export type EstadoCorreo = keyof typeof etiquetasEstadoCorreo

export type AvisoCorreo = {
  id: string;
  tipo: TipoCorreo;
  estado: EstadoCorreo;
  cursoId: string;
  pagoId: string | null;
  intentos: number;
  creadoEn: string;
  enviadoEn: string | null;
  proximoIntentoEn: string | null;
  ultimoError: string | null;
}

type BandejaCorreo = {
  items: AvisoCorreo[];
  pagina: number;
  haySiguiente: boolean;
  habilitado: boolean;
  resumen: { pendientes: number; fallidos: number; inciertos: number; pendienteDesde: string | null };
}

export const notificacionesCorreo = {
  listar: async (filtros: { pagina: number; tipo: TipoCorreo | ''; estado: EstadoCorreo | '' }) =>
    (await api.get<BandejaCorreo>('/admin/notificaciones/correo', {
      params: { pagina: filtros.pagina, tipo: filtros.tipo || undefined, estado: filtros.estado || undefined },
    })).data,
}
