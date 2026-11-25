import { randomUUID } from "node:crypto";
import { aCentimos } from "../../dto/cursos/cobroDto.js";
import type { Afiliacion, Impedimento, OfertaCurso, ResultadoInscripcion, TipoPrecio } from "../../entities/cursos/curso.js";
import type { InscripcionesRepository } from "../../repositories/cursos/inscripcionesRepository.js";

export type InscripcionServiceDeps = {
  repositorio: InscripcionesRepository;
  /** Se lee en cada inscripción: la política de inscripción externa puede cambiar sin reiniciar. */
  configuracion: { inscripcionExternaHabilitada: boolean };
};

const impedimentosInscripcion = {
  DNI_REQUERIDO: { estado: 403, mensaje: "Registra tu DNI con el CPPP para poder inscribirte." },
  PADRON_NO_DISPONIBLE: { estado: 503, mensaje: "El padrón del CPPP no está disponible. Intenta más tarde." },
  AFILIACION_INHABILITADA: { estado: 403, mensaje: "Tu afiliación no está habilitada. Consulta con el CPPP." },
  AFILIACION_NO_VERIFICADA: { estado: 403, mensaje: "Valida el vínculo de tu cuenta con el CPPP para inscribirte." },
  PRECIO_GENERAL_NO_CONFIGURADO: { estado: 409, mensaje: "El administrador debe configurar el precio general de este curso." }
} as const;
type CodigoImpedimento = keyof typeof impedimentosInscripcion;

const impedir = (codigo: CodigoImpedimento): { impedimentoInscripcion: Impedimento } =>
  ({ impedimentoInscripcion: { codigo, ...impedimentosInscripcion[codigo] } });

export function precioDelTitular(tipo: TipoPrecio, importe: number, dni: string | null) {
  return { tipo, importe, dniParcial: dni ? `•••• ${dni.slice(-4)}` : null, enPadron: tipo === "COLEGIADO" };
}

export type Cotizacion = { miPrecio: ReturnType<typeof precioDelTitular> } | { impedimentoInscripcion: Impedimento };

/** Tarifa del titular según el padrón vigente: colegiado habilitado o precio general. */
export async function cotizar(afiliacionDe: (dni: string, usuarioId: number) => Promise<Afiliacion | undefined>,
  curso: Pick<OfertaCurso, "costo" | "precioGeneral">, usuarioId: number, dni: string | null): Promise<Cotizacion> {
  if (!dni) return impedir("DNI_REQUERIDO");
  const afiliacion = await afiliacionDe(dni, usuarioId);
  if (!afiliacion) return impedir("PADRON_NO_DISPONIBLE");
  if (afiliacion.habilitado === false) return impedir("AFILIACION_INHABILITADA");
  if (afiliacion.habilitado && !afiliacion.vinculado) return impedir("AFILIACION_NO_VERIFICADA");
  if (afiliacion.habilitado) return { miPrecio: precioDelTitular("COLEGIADO", curso.costo, dni) };
  const general = curso.precioGeneral ?? (curso.costo === 0 ? 0 : null);
  if (general === null) return impedir("PRECIO_GENERAL_NO_CONFIGURADO");
  return { miPrecio: precioDelTitular("GENERAL", general, dni) };
}

export function crearInscripcionService({ repositorio, configuracion }: InscripcionServiceDeps) {
  return {
    cotizar,

    /** Los externos solo se admiten con la política habilitada y un padrón vigente. */
    async admiteInscripcionExterna() {
      if (!configuracion.inscripcionExternaHabilitada) return false;
      return repositorio.padronVigente();
    },

    dniDe: (usuarioId: number) => repositorio.dniDe(usuarioId),
    afiliacionDe: (dni: string, usuarioId: number) => repositorio.afiliacion(dni, usuarioId),

    inscribir(cursoId: string, usuarioId: number, versionCobro?: number, tipoPrecio?: TipoPrecio): Promise<ResultadoInscripcion> {
      return repositorio.enTransaccion(async (tx) => {
        // El bloqueo del curso serializa todas las solicitudes a la última plaza.
        const curso = await tx.bloquearCurso(cursoId);
        if (!curso) return "NO_EXISTE";
        const persona = await tx.agremiadoActivo(usuarioId);
        if (!persona) return "SIN_PERMISO";
        if (curso.estado !== "PUBLICADO") return "NO_PUBLICADO";
        await tx.cancelarReservasVencidas(cursoId);
        const inscripcion = await tx.inscripcionActual(cursoId, usuarioId);
        if (inscripcion && inscripcion.estado !== "CANCELADA") {
          return inscripcion.estado === "TERMINADO" ? "YA_TERMINADO" : inscripcion.estado === "PENDIENTE_PAGO" ? "YA_PENDIENTE" : "YA_INSCRITO";
        }
        const modalidadCobro = curso.modalidadCobro ?? (curso.costo === 0 ? "GRATUITO" : null);
        if (!modalidadCobro) return "COBRO_NO_CONFIGURADO";
        if ((versionCobro !== undefined && versionCobro !== curso.versionCobro) || (modalidadCobro !== "GRATUITO" && versionCobro === undefined)) return "COBRO_MODIFICADO";

        let importe = curso.costo;
        let tarifa: TipoPrecio | null = null;
        if (configuracion.inscripcionExternaHabilitada) {
          const cotizacion = await cotizar(tx.afiliacion, curso, usuarioId, persona.dni);
          if ("impedimentoInscripcion" in cotizacion) return cotizacion.impedimentoInscripcion;
          if (tipoPrecio !== cotizacion.miPrecio.tipo || versionCobro === undefined) return "COBRO_MODIFICADO";
          importe = cotizacion.miPrecio.importe;
          tarifa = cotizacion.miPrecio.tipo;
        } else if (tipoPrecio !== undefined) {
          return "COBRO_MODIFICADO";
        }

        if ((await tx.contarInscritos(cursoId)) >= curso.cupos) return "SIN_CUPOS";
        const pendiente = modalidadCobro === "PREVIO";
        const intentoId = randomUUID();
        const importeCentimos = aCentimos(importe);
        await tx.registrarIntento({ intentoId, cursoId, usuarioId, modalidadCobro, importeCentimos, versionCobro: curso.versionCobro,
          plazoPagoMinutos: curso.plazoPagoMinutos, pendiente, tipoPrecio: tarifa });
        if (pendiente) await tx.crearObligacionPago({ cursoId, usuarioId, intentoId, importeCentimos });
        else await tx.confirmarAcceso(cursoId, usuarioId, intentoId);
        return pendiente ? "INSCRITO_PENDIENTE" : "INSCRITO";
      });
    }
  };
}

export type InscripcionService = ReturnType<typeof crearInscripcionService>;
