/** Título y texto del botón de cada tipo de aviso por correo. */
export const plantillasCorreo = {
  INSCRIPCION_CONFIRMADA: ["Inscripción confirmada", "Consultar mi curso"],
  COMPROBANTE: ["Comprobante de pago", "Consultar mi pago"],
  RECHAZO: ["Pago rechazado", "Revisar mi pago"],
  CAMBIO_SESION: ["Cambio de sesión", "Consultar mis sesiones"],
  CONSTANCIA_EMITIDA: ["Constancia disponible", "Abrir mi historial"]
} as const;

export type TipoCorreo = keyof typeof plantillasCorreo;
export const tiposCorreo = Object.keys(plantillasCorreo) as TipoCorreo[];

export type DatosCorreo = {
  nombre: string;
  curso: string;
  cursoId: string;
  detalles: string[];
};

export const estadosCorreo = ["PENDIENTE", "ENVIANDO", "ENVIADO", "FALLIDO", "INCIERTO", "OMITIDO"] as const;
export type EstadoCorreo = (typeof estadosCorreo)[number];

/** Aviso reclamado de una cola, con el correo y el estado actuales del destinatario. */
export type AvisoCorreo = {
  id: string;
  tipo: TipoCorreo;
  destinatario: string;
  emailActual: string | null;
  activo: boolean | null;
  intentos: number;
  datos: DatosCorreo | null;
  asunto: string;
  texto: string;
  pagoId: string | null;
};

export type ResultadoEnvio = { estado: EstadoCorreo; codigo: string | null; espera?: number };

/** Colas de avisos: la de pagos lleva asunto y texto propios; la de cursos usa plantillas. */
export type OrigenCola = "pagos" | "cursos";
