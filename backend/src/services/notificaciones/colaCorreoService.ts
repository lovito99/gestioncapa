import { randomUUID } from "node:crypto";
import { esCorreoValido } from "../../dto/notificaciones/correoDto.js";
import type { AvisoCorreo, OrigenCola, ResultadoEnvio } from "../../entities/notificaciones/correo.js";
import type { AdjuntosCorreo, MensajeCorreo, TransporteCorreo } from "../../providers/notificaciones/smtpProvider.js";
import type { ColaCorreoRepository } from "../../repositories/notificaciones/colaCorreoRepository.js";
import { contenidoCorreo } from "./correoContenido.js";

export type ConfiguracionCola = {
  correoHabilitado: boolean;
  correoRemitente?: string | undefined;
  correoOrigenPublico?: string | undefined;
  FRONTEND_URL: string;
  NODE_ENV: string;
  correoPlazoEnvioMs: number;
};

export type ColaCorreoServiceDeps = {
  repositorio: ColaCorreoRepository;
  crearTransporte: () => TransporteCorreo;
  /** Se lee en cada ciclo: habilitar o cambiar el remitente no requiere reiniciar. */
  configuracion: ConfiguracionCola;
};

/** Esperas en segundos tras cada fallo temporal; agotadas, el aviso falla. */
const esperas = [60, 300, 900, 3600];
const identificadores: Record<OrigenCola, string> = { pagos: "pago", cursos: "curso" };
const avisosPorCiclo = 5;

function resultadoError(error: unknown, intentos: number): ResultadoEnvio {
  const smtp = error as { responseCode?: number; code?: string; syscall?: string } | null;
  const codigo = smtp?.responseCode ?? 0;
  if (codigo >= 500 && codigo < 600) return { estado: "FALLIDO", codigo: "SMTP_RECHAZADO" };
  if ((codigo >= 400 && codigo < 500) || smtp?.code === "EDNS" || smtp?.syscall === "connect") {
    const espera = esperas[intentos - 1];
    return espera === undefined ? { estado: "FALLIDO", codigo: "SMTP_INTENTOS_AGOTADOS" }
      : { estado: "PENDIENTE", codigo: "SMTP_FALLO_TEMPORAL", espera };
  }
  return { estado: "INCIERTO", codigo: "SMTP_RESULTADO_INCIERTO" };
}

export function crearColaCorreoService({ repositorio, crearTransporte, configuracion }: ColaCorreoServiceDeps) {
  async function enviarAviso(transporte: TransporteCorreo, aviso: AvisoCorreo, identificador: string,
    adjuntos?: (aviso: AvisoCorreo) => AdjuntosCorreo): Promise<ResultadoEnvio> {
    if (!aviso.activo || aviso.destinatario !== aviso.emailActual) {
      return { estado: "OMITIDO", codigo: "DESTINATARIO_CAMBIADO" };
    }
    if (!esCorreoValido(aviso.destinatario)) {
      return { estado: "OMITIDO", codigo: "CORREO_INVALIDO" };
    }

    let mensaje: MensajeCorreo;
    try {
      const contenido = aviso.datos
        ? contenidoCorreo(aviso.tipo, configuracion.correoOrigenPublico ?? configuracion.FRONTEND_URL, aviso.datos, configuracion.NODE_ENV !== "production")
        : { asunto: aviso.asunto, texto: aviso.texto, html: undefined };
      const archivos = adjuntos?.(aviso);
      mensaje = {
        from: configuracion.correoRemitente!, to: { address: aviso.destinatario, name: "" },
        subject: contenido.asunto, text: contenido.texto, ...(contenido.html ? { html: contenido.html } : {}),
        messageId: `<${identificador}-${aviso.id}@gestioncapa.invalid>`,
        signal: AbortSignal.timeout(configuracion.correoPlazoEnvioMs), ...(archivos ? { attachments: archivos } : {})
      };
    } catch {
      return { estado: "FALLIDO", codigo: "CONTENIDO_INVALIDO" };
    }
    try {
      const envio = await transporte.sendMail(mensaje);
      return envio.accepted.length ? { estado: "ENVIADO", codigo: null } : { estado: "FALLIDO", codigo: "SMTP_RECHAZADO" };
    } catch (error) {
      return resultadoError(error, aviso.intentos);
    }
  }

  return {
    /** Envía hasta cinco avisos de la cola y devuelve cuántos se entregaron. */
    async procesarColaCorreo(origen: OrigenCola, adjuntos?: (aviso: AvisoCorreo) => AdjuntosCorreo) {
      if (!configuracion.correoHabilitado) return 0;
      const transporte = crearTransporte();
      let enviados = 0;
      try {
        await repositorio.liberarAtascados(origen);
        for (let turno = 0; turno < avisosPorCiclo; turno++) {
          const proceso = randomUUID();
          const aviso = await repositorio.reclamar(origen, proceso);
          if (!aviso) break;
          const resultado = await enviarAviso(transporte, aviso, identificadores[origen], adjuntos);
          const guardados = await repositorio.guardarResultado(origen, aviso.id, proceso, resultado);
          if (resultado.estado === "ENVIADO") enviados += guardados;
        }
      } finally {
        transporte.close();
      }
      return enviados;
    }
  };
}

export type ColaCorreoService = ReturnType<typeof crearColaCorreoService>;
