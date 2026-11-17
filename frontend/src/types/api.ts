/**
 * Contrato de datos con el backend.
 * Mantener sincronizado con el OpenAPI/Swagger que publique el equipo de backend.
 */

export type Rol = 'ADMIN' | 'INSTRUCTOR' | 'AGREMIADO'

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

/** Alta de un agremiado desde la pantalla "Crear cuenta" */
export interface RegistroEntrada {
  dni: string
  nombres: string
  apellidos: string
  email: string
  celular: string
  password: string
  aceptaPrivacidad: true
}

export type EstadoClase = 'PROGRAMADA' | 'CANCELADA'
/** HU-36: dónde se dicta la sesión. */
export type ModalidadSesion = 'PRESENCIAL' | 'VIRTUAL' | 'AMBAS'

export interface InstructorResumen {
  id: string
  nombre: string
}

/** Curso al que pertenece una clase (cada clase es una sesión del curso) */
export interface CursoResumen {
  id: string
  titulo: string
}

export interface Clase {
  /** Presente cuando la clase es una sesión de curso. */
  cursoId?: string
  id: string
  /** `null` solo en clases antiguas creadas antes de vincularlas a un curso */
  curso: CursoResumen | null
  nombre: string
  instructor: InstructorResumen
  /** Fecha en formato ISO `YYYY-MM-DD`, hora de Lima */
  fecha: string
  /** `HH:mm`, hora de Lima */
  horaInicio: string
  /** `HH:mm`, hora de Lima */
  horaFin: string
  lugar: string
  /** Ausente en respuestas anteriores a HU-36: se interpreta como presencial. */
  modalidad?: ModalidadSesion
  inscritos: number
  estado: EstadoClase
}

export interface ClaseEntrada {
  /** Obligatorio: la clase se cuenta como sesión de este curso para la asistencia y el certificado */
  cursoId: string
  nombre: string
  instructorId: string
  fecha: string
  horaInicio: string
  horaFin: string
  lugar: string
  modalidad: ModalidadSesion
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
  /** HU-39: cómo se registró. `QR` incluye el QR personal y el rotatorio; ausente en respuestas antiguas */
  metodo?: 'QR' | 'DNI' | null
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

/** Clase vista por el participante: solo sus datos, nunca los de otros participantes */
export interface ClaseParticipante {
  id: string
  nombre: string
  instructor: InstructorResumen
  fecha: string
  horaInicio: string
  horaFin: string
  lugar: string
  estado: EstadoClase
  /** Fecha-hora ISO 8601 en que registró su asistencia, `null` si aún no la registra */
  miAsistencia: string | null
}

export interface MarcarAsistenciaEntrada {
  /** Token leído del QR que muestra el instructor */
  token: string
  /** Clase desde la que se escaneó. Si el QR es de otra clase, el servidor responde `QR_OTRA_CLASE` */
  claseId?: string
}

export interface MarcarAsistenciaRespuesta {
  clase: { id: string; nombre: string }
  /** Fecha-hora ISO 8601 del registro (se muestra en hora de Lima) */
  horaRegistro: string
}

// ---------- HU-39: QR personal y asistencia en la puerta ----------

/** Agremiado tal como lo ve el encargado: nunca el DNI completo */
export interface AgremiadoPuerta {
  id: string
  nombre: string
  /** DNI enmascarado con sus 4 últimos dígitos, p. ej. `•••• 5678` */
  dniParcial: string | null
}

/** Próxima sesión presencial del agremiado, para la tarjeta de «Mi QR» */
export interface SesionPresencialResumen {
  id: string
  /** Título del curso, o el nombre de la sesión si no pertenece a un curso */
  titulo: string
  /** Fecha `YYYY-MM-DD` y horas `HH:mm`, hora de Lima */
  fecha: string
  horaInicio: string
  horaFin: string
  lugar: string
}

/** Respuesta de `GET /api/participante/mi-qr` */
export interface MiQr {
  /** Token firmado y permanente; es el contenido del QR. No incluye datos personales */
  token: string
  nombre: string
  dniParcial: string | null
  /** Colegiado habilitado en el CPPP */
  habilitado: boolean
  proximaSesion: SesionPresencialResumen | null
}

/** Cuerpo de `POST /api/clases/:id/asistencia/puerta`: se envía uno de los dos */
export type RegistroPuertaEntrada = { token: string; participanteId?: never } | { participanteId: string; token?: never }

export interface RegistroPuertaRespuesta {
  participante: AgremiadoPuerta
  /** Fecha-hora ISO 8601 del registro */
  horaRegistro: string
  metodo: 'QR' | 'DNI'
}

/** Un inscrito cuyo DNI empieza con los dígitos buscados */
export interface CoincidenciaDni {
  participante: AgremiadoPuerta
  /** Hora en que ya se registró su asistencia, o `null` */
  horaRegistro: string | null
}

/** Respuesta de `GET /api/clases/:id/asistencia/puerta?dni=` (mínimo 4 dígitos) */
export interface BusquedaDniRespuesta {
  resultados: CoincidenciaDni[]
}

/** Respuesta de `GET /api/health` (ya implementada en el backend) */
export interface EstadoSalud {
  ok: boolean
  api: string
  /** `ready` si PostgreSQL responde */
  database: string
  /** `ready` si Redis responde; `disabled` si no está conectado */
  redis: string
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
  SIN_PERMISO: 'SIN_PERMISO',
  CLASE_CANCELADA: 'CLASE_CANCELADA',
  QR_EXPIRADO: 'QR_EXPIRADO',
  QR_INVALIDO: 'QR_INVALIDO',
  QR_OTRA_CLASE: 'QR_OTRA_CLASE',
  NO_INSCRITO: 'NO_INSCRITO',
  ASISTENCIA_YA_REGISTRADA: 'ASISTENCIA_YA_REGISTRADA',
  QR_PERSONAL_INVALIDO: 'QR_PERSONAL_INVALIDO',
  DNI_NO_ENCONTRADO: 'DNI_NO_ENCONTRADO',
} as const
