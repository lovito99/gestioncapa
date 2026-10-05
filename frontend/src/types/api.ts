/**
 * Contrato de datos con el backend.
 * Mantener sincronizado con el OpenAPI/Swagger que publique el equipo de backend.
 */

export type Rol = 'COORDINADOR' | 'INSTRUCTOR'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  /** Etiqueta visible en el encabezado, p. ej. "Coordinadora" */
  cargo: string
}

export interface LoginRespuesta {
  token: string
  usuario: Usuario
}

export type EstadoClase = 'PROGRAMADA' | 'CANCELADA'

export interface InstructorResumen {
  id: string
  nombre: string
}

export interface Clase {
  id: string
  nombre: string
  instructor: InstructorResumen
  /** Fecha en formato ISO `YYYY-MM-DD`, hora de Lima */
  fecha: string
  /** `HH:mm`, hora de Lima */
  horaInicio: string
  /** `HH:mm`, hora de Lima */
  horaFin: string
  lugar: string
  inscritos: number
  estado: EstadoClase
}

export interface ClaseEntrada {
  nombre: string
  instructorId: string
  fecha: string
  horaInicio: string
  horaFin: string
  lugar: string
}

export interface Participante {
  id: string
  nombre: string
  email: string
}

export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE'

export interface RegistroAsistencia {
  participante: Participante
  estado: EstadoAsistencia
  /** Fecha-hora ISO 8601 del registro, `null` si está ausente */
  horaRegistro: string | null
}

export interface Asistencia {
  inscritos: number
  presentes: number
  ausentes: number
  registros: RegistroAsistencia[]
}

export interface QrAsistencia {
  token: string
  /** Fecha-hora ISO 8601 en que expira el token (hora del servidor) */
  expiraEn: string
  /** Fecha-hora ISO 8601 del servidor al responder, para corregir el reloj local */
  servidorAhora: string
  duracionSegundos: number
}

/** Formato único de error que devuelve el backend */
export interface ErrorApi {
  code: string
  message: string
  /** Errores por campo (validación), clave = nombre del campo */
  fields?: Record<string, string>
  /** Datos extra según el `code`, p. ej. la clase en conflicto */
  details?: Record<string, unknown>
}

export const CODIGOS_ERROR = {
  CREDENCIALES_INVALIDAS: 'CREDENCIALES_INVALIDAS',
  VALIDACION: 'VALIDACION',
  CONFLICTO_HORARIO: 'CONFLICTO_HORARIO',
  YA_INSCRITO: 'YA_INSCRITO',
  PARTICIPANTE_NO_EXISTE: 'PARTICIPANTE_NO_EXISTE',
  CLASE_NO_EXISTE: 'CLASE_NO_EXISTE',
  NO_AUTENTICADO: 'NO_AUTENTICADO',
} as const
