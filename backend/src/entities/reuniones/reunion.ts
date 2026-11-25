export type Reunion = {
  identificador: string;
  claseIdentificador: string;
  nombreSala: string;
  titulo: string;
  inicioProgramado: Date;
  finProgramado: Date;
  estado: "programada" | "iniciada" | "cancelada" | "finalizada";
  creadorIdentificador: string;
  camaraPermitida: boolean;
  microfonoPermitido: boolean;
  pantallaPermitida: boolean;
  /** En desuso desde HU-26: la sala de espera siempre está activa. */
  salaEsperaHabilitada: boolean;
  manoPermitida: boolean;
  porcentajeMinimo: number;
  grabacionPrevista: boolean;
  iniciadaEn: Date | null;
  finalizadaEn: Date | null;
};

export type EstadoReunion = Reunion["estado"];

/** Relación de la persona con la sala; se recalcula en cada solicitud aunque el JWT siga vigente. */
export type AccesoReunion = { gestion: boolean; instructor: boolean; inscrito: boolean; activa: boolean; retirado: boolean };

export type ResultadoAsistenciaVirtual = { segundosConectados: number; porcentaje: number; cuenta: boolean; expulsado: boolean };
