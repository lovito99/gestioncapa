export type AgremiadoPuerta = { id: string; nombre: string; dniParcial: string | null };
export type MetodoPuerta = "QR" | "DNI";
export type OrigenPuerta = "QR_PUERTA" | "DNI";

export type MarcaPuerta = {
  marcaId: string;
  participante: AgremiadoPuerta;
  horaRegistro: string;
  metodo: MetodoPuerta;
};

export type SesionPuerta = {
  id: string;
  nombre: string;
  fecha: string;
  horaInicio: string;
  lugar: string;
  curso: { id: string; titulo: string } | null;
};

export type ProximaSesionQr = Omit<SesionPuerta, "nombre" | "curso"> & {
  titulo: string;
  horaFin: string;
};

export type MiQr = {
  token: string;
  nombre: string;
  dniParcial: string | null;
  habilitado: boolean;
  proximaSesion: ProximaSesionQr | null;
};
