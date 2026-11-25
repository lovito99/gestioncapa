import type { ModalidadCurso, ModalidadSesion } from "./modalidad.js";

/** Lista fija del Sprint 2, basada en los datos de demostración. Gestión: HU-15. */
export const categoriasCatalogo = ["Educación", "General", "Seguridad y salud", "Tecnología"] as const;

export const modalidadesCobro = ["PREVIO", "CERTIFICADO", "GRATUITO"] as const;
export type ModalidadCobro = (typeof modalidadesCobro)[number];
export const tiposPrecio = ["COLEGIADO", "GENERAL"] as const;
export type TipoPrecio = (typeof tiposPrecio)[number];

export type Curso = {
  modalidadCobro: ModalidadCobro | null; plazoPagoMinutos: number | null; versionCobro: number;
  precioGeneral: number | null;
  id: string; instructorId: string; instructorNombre: string;
  titulo: string; descripcion: string; horasLectivas: number; modalidad: string; costo: number;
  categoria: string; fechaInicio: string | null; fechaFin: string | null; cuposDisponibles: number; inscrito?: boolean;
  estadoInscripcion?: "EN_CURSO" | "TERMINADO" | "PENDIENTE_PAGO" | "CANCELADA" | null;
  cupos: number; tipoCertificado: string; notaMinima: number; estado: "BORRADOR" | "PUBLICADO" | "CERRADO";
  portadaUrl?: string | null; portadaFuentes?: { url: string; ancho: number }[];
};

/** Condiciones del curso que decide una inscripción, leídas con el curso bloqueado. */
export type OfertaCurso = Pick<Curso, "estado" | "cupos" | "costo" | "precioGeneral" | "modalidadCobro" | "plazoPagoMinutos" | "versionCobro">;

export type NuevoCurso = {
  titulo: string; descripcion: string; instructorId: string; categoria: string;
  fechaInicio: string | null; fechaFin: string | null; horasLectivas: number; modalidad: ModalidadCurso;
  costo: number; cupos: number; tipoCertificado: "PARTICIPACION" | "APROBACION"; notaMinima: number;
  modulos: { titulo: string }[]; modalidadCobro: ModalidadCobro | null; precioGeneral?: number | undefined; plazoPagoMinutos: number | null;
};

export type NuevoMaterial =
  | { titulo: string; tipo: "PDF"; contenidoBase64: string }
  | { titulo: string; tipo: "ENLACE" | "VIDEO"; url: string };

export type FiltroCatalogo = { buscar: string; modalidad?: ModalidadCurso | undefined; categoria?: string | undefined; pagina: number; tamanoPagina: number };

export type CambioCobro = { modalidadCobro: ModalidadCobro; costo: number; precioGeneral?: number | undefined; plazoPagoMinutos: number | null; versionCobro: number };

export type SesionCurso = {
  id: string; cursoId: string; nombre: string; fecha: string; horaInicio: string;
  horaFin: string; lugar: string; estado: "PROGRAMADA" | "CANCELADA"; modalidad: ModalidadSesion;
  encargadoId?: string | null;
  qrRotatorio?: boolean | null;
  /** Sala de HU-26; solo para quien gestiona el curso o tiene acceso a él. */
  reunion: { identificador: string; estado: string } | null;
};

/** Motivo por el que el padrón del CPPP impide inscribirse. */
export type Impedimento = { codigo: string; estado: number; mensaje: string };

export type ResultadoInscripcion =
  | "NO_EXISTE" | "SIN_PERMISO" | "NO_PUBLICADO" | "YA_TERMINADO" | "YA_PENDIENTE" | "YA_INSCRITO"
  | "COBRO_NO_CONFIGURADO" | "COBRO_MODIFICADO" | "SIN_CUPOS" | "INSCRITO_PENDIENTE" | "INSCRITO" | Impedimento;

/** Afiliación de un DNI en el padrón vigente; `habilitado` es null si no figura. */
export type Afiliacion = { habilitado: boolean | null; vinculado: boolean | null };
