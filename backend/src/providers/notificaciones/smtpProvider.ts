import nodemailer, { type SendMailOptions } from "nodemailer";

export type MensajeCorreo = SendMailOptions & { signal: AbortSignal };
export type AdjuntosCorreo = SendMailOptions["attachments"];

/** Lo que la cola necesita de una conexión SMTP. */
export type TransporteCorreo = {
  sendMail(mensaje: MensajeCorreo): Promise<{ accepted: unknown[] }>;
  close(): void;
};

export type ConfiguracionSmtp = {
  correoServidor?: string | undefined;
  correoPuerto: number;
  correoSeguro: boolean;
  correoSinTlsParaPruebas: boolean;
  correoUsuario?: string | undefined;
  correoClave?: string | undefined;
};

/** Abre una conexión por ciclo de la cola con la configuración vigente en ese momento. */
export function crearTransporteSmtp(configuracion: ConfiguracionSmtp): TransporteCorreo {
  return nodemailer.createTransport({
    host: configuracion.correoServidor!, port: configuracion.correoPuerto, secure: configuracion.correoSeguro,
    requireTLS: !configuracion.correoSinTlsParaPruebas, ignoreTLS: configuracion.correoSinTlsParaPruebas,
    ...(configuracion.correoUsuario ? { auth: { user: configuracion.correoUsuario, pass: configuracion.correoClave! } } : {}),
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 30000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false
  });
}
