export type CursoLecciones = {
  id: string;
  instructorId: string;
  estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO';
  modalidad: 'GRABADO' | 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
  modalidadCobro: 'GRATUITO' | 'CERTIFICADO' | 'PREVIO' | null;
  revision: number;
};

export type EstadoLeccion = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA';
export type MarcaLeccion = Exclude<EstadoLeccion, 'PENDIENTE'>;

export type LeccionYoutube = {
  id: string;
  moduloId: string;
  modulo: string;
  titulo: string;
  orden: number;
  youtubeId: string | null;
  duracionSegundos: number | null;
  tienePdf: boolean;
  estado: EstadoLeccion;
  completadaEn: Date | null;
};

export type EntradaLeccion = { titulo: string; moduloId: string; youtubeId: string; operacionId: string };
