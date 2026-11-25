export type IdentidadGoogle = {
  emisor: string;
  sujeto: string;
  correo: string;
  correoAutoritativo: boolean;
};

export type IntentoGoogle =
  | { fase: "oauth"; nonce: string; verificador: string; curso: string | null }
  | { fase: "procesando" | "finalizando"; curso: string | null }
  | { fase: "error"; curso: string | null; motivo: "cancelado" | "proveedor" }
  | {
      fase: "identidad";
      curso: string | null;
      identidad: IdentidadGoogle;
      correoConfirmado: boolean;
      codigo?: { huella: string; vence: number; intentos: number };
    };

export type ReferenciaGoogle = { intento: string; navegador: string };
