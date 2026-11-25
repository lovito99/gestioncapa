import type { UsuarioAutenticado } from "../../plugins/autorizacion.js";
import { ErrorAplicacion, errorDeEstado } from "../../shared/errorAplicacion.js";
import type { DatosReunionDto, EdicionReunionDto, PoliticasReunionDto } from "../../dto/reuniones/reunionDto.js";
import type { AccesoReunion, EstadoReunion, Reunion } from "../../entities/reuniones/reunion.js";
import type { ConfiguracionJitsi } from "../../providers/jitsi/credencialJitsi.js";
import type { ReunionesRepository, ReunionesTransaccion } from "../../repositories/reuniones/reunionesRepository.js";
import { calcularAsistenciaVirtual } from "./asistenciaVirtual.js";

type Actor = Pick<UsuarioAutenticado, "id" | "name" | "email">;

export type ReunionesServiceDeps = {
  repositorio: ReunionesRepository;
  emitirCredencial: (configuracion: ConfiguracionJitsi, usuario: { identificador: string; nombre: string; correo: string; moderador?: boolean }, nombreSala: string) => Promise<string>;
  /** Se lee en cada solicitud: Jitsi puede habilitarse o configurarse sin reiniciar (pruebas). */
  configuracion: {
    jitsiHabilitado: boolean;
    jitsiDominio?: string | undefined;
    jitsiAplicacion?: string | undefined;
    jitsiSecreto?: string | undefined;
    jitsiDireccion?: string | undefined;
  };
};

/** Destinos que se alcanzan con las acciones iniciar, cancelar y finalizar. */
export type DestinoReunion = Extract<EstadoReunion, "iniciada" | "cancelada" | "finalizada">;

/**
 * Cierra las conexiones abiertas y guarda la asistencia virtual de cada inscrito.
 * Se ejecuta en la transacción que marca la reunión como finalizada.
 */
async function registrarAsistenciaVirtual(tx: ReunionesTransaccion, reunion: Reunion, registradoPor: number) {
  await tx.cerrarConexiones(reunion.identificador, reunion.finalizadaEn!);
  const referencia = { inicio: (reunion.iniciadaEn ?? reunion.inicioProgramado).getTime() / 1000, fin: reunion.finalizadaEn!.getTime() / 1000 };
  const inscritos = await tx.inscritosParaAsistencia(reunion.identificador, reunion.claseIdentificador);
  const conexiones = await tx.conexiones(reunion.identificador);
  for (const { usuario, expulsado } of inscritos) {
    const resultado = calcularAsistenciaVirtual(conexiones.filter((conexion) => conexion.usuario === usuario), referencia, reunion.porcentajeMinimo);
    // Quien fue expulsado no acredita asistencia de esa sesión aunque estuviera conectado.
    const cuenta = resultado.cuenta && !expulsado;
    await tx.guardarAsistenciaVirtual(reunion.identificador, usuario,
      { segundosConectados: Math.round(resultado.segundosConectados), porcentaje: resultado.porcentaje, cuenta, expulsado });
    if (cuenta) await tx.registrarAsistenciaDeClase(reunion.claseIdentificador, usuario, registradoPor);
  }
}

export function crearReunionesService({ repositorio, emitirCredencial, configuracion }: ReunionesServiceDeps) {
  /** La reunión queda bloqueada en la transacción; `gestion` exige administrador o instructor de la sesión. */
  function conReunion<T>(identificador: string, usuario: Actor, gestion: boolean,
    operacion: (tx: ReunionesTransaccion, reunion: Reunion, acceso: AccesoReunion) => Promise<T>) {
    return repositorio.enTransaccion(async (tx) => {
      const reunion = await tx.obtener(identificador);
      if (!reunion) throw errorDeEstado(404);
      const acceso = await tx.comprobarAcceso(reunion, usuario.id);
      if (!acceso || acceso.retirado || !(acceso.gestion || acceso.instructor || acceso.inscrito)) throw errorDeEstado(403);
      if (gestion && !(acceso.gestion || acceso.instructor)) throw errorDeEstado(403);
      return operacion(tx, reunion, acceso);
    });
  }

  return {
    listar: (usuario: Actor) => repositorio.listar(usuario.id),

    crear(datos: DatosReunionDto, usuario: Actor) {
      return repositorio.enTransaccion(async (tx) => {
        const clase = await tx.claseParaReunion(datos.claseIdentificador, usuario.id);
        if (!clase) throw errorDeEstado(403);
        // HU-36: la sala virtual corresponde a sesiones virtuales o «ambas».
        if (clase.modalidad === "PRESENCIAL") {
          throw new ErrorAplicacion(409, "SESION_PRESENCIAL", "La sesión es presencial. Cámbiala a virtual o «ambas» para abrir su sala.");
        }
        return tx.crearReunionDeClase({ claseIdentificador: String(datos.claseIdentificador), titulo: datos.titulo,
          inicioProgramado: datos.inicioProgramado, finProgramado: datos.finProgramado, creadorIdentificador: usuario.id });
      });
    },

    obtener: (identificador: string, usuario: Actor) => conReunion(identificador, usuario, false, async (tx, reunion) => reunion),

    editar: (identificador: string, datos: EdicionReunionDto, usuario: Actor) => conReunion(identificador, usuario, true, async (tx, reunion) => {
      if (reunion.estado !== "programada") throw errorDeEstado(409);
      return tx.actualizarHorario(reunion.identificador, datos);
    }),

    cambiarEstado: (identificador: string, destino: DestinoReunion, usuario: Actor) => conReunion(identificador, usuario, true, async (tx, reunion) => {
      if (reunion.estado === destino) return reunion;
      if (reunion.estado === "cancelada" || reunion.estado === "finalizada" || (destino === "finalizada" && reunion.estado !== "iniciada")) {
        throw errorDeEstado(409);
      }
      const actualizada = await tx.cambiarEstado(reunion.identificador, destino);
      if (destino === "finalizada") await registrarAsistenciaVirtual(tx, actualizada, usuario.id);
      return actualizada;
    }),

    actualizarPoliticas: (identificador: string, politicas: PoliticasReunionDto, usuario: Actor) => conReunion(identificador, usuario, true, async (tx, reunion) => {
      if (reunion.estado === "cancelada" || reunion.estado === "finalizada") throw errorDeEstado(409);
      // Quien ya entró no vio un aviso de grabación: solo se decide antes de iniciar.
      if (politicas.grabacionPrevista !== reunion.grabacionPrevista && reunion.estado !== "programada") throw errorDeEstado(409);
      return tx.actualizarPoliticas(reunion.identificador, politicas);
    }),

    participantes: (identificador: string, usuario: Actor) => conReunion(identificador, usuario, true, (tx, reunion) => tx.participantes(reunion)),

    /** Revoca credenciales futuras; el moderador expulsa las conexiones activas desde la sala. */
    retirarParticipante: (identificador: string, usuarioId: number, usuario: Actor) => conReunion(identificador, usuario, true, async (tx, reunion) => {
      if (!(await tx.esParticipanteRetirable(reunion.claseIdentificador, usuarioId))) throw errorDeEstado(404);
      await tx.retirarParticipante(reunion.identificador, usuarioId);
      return { accesoRevocado: true };
    }),

    asistencia: (identificador: string, usuario: Actor) => conReunion(identificador, usuario, true, async (tx, reunion) => {
      if (reunion.estado !== "finalizada") throw errorDeEstado(409);
      return { reunionIdentificador: reunion.identificador, porcentajeMinimo: reunion.porcentajeMinimo,
        iniciadaEn: reunion.iniciadaEn, finalizadaEn: reunion.finalizadaEn, resultados: await tx.consultarAsistenciaVirtual(reunion.identificador) };
    }),

    credencial: (identificador: string, aceptaGrabacion: boolean | undefined, usuario: Actor) => conReunion(identificador, usuario, false, async (tx, reunion, acceso) => {
      // El anfitrión cierra el acceso al finalizar; el horario previsto puede superarse.
      if (!acceso.activa || reunion.estado !== "iniciada") throw errorDeEstado(409);
      if (!configuracion.jitsiHabilitado) throw errorDeEstado(503);
      const moderador = acceso.gestion || acceso.instructor;
      if (reunion.grabacionPrevista && !moderador) {
        // Ley 29733: el aviso se acepta antes de entrar y queda registrado con fecha.
        const aceptado = await tx.avisoGrabacionAceptado(reunion.identificador, usuario.id);
        if (!aceptado && aceptaGrabacion !== true) {
          throw new ErrorAplicacion(422, "AVISO_GRABACION_PENDIENTE", "Esta sesión se grabará. Acepta el aviso para entrar.");
        }
        if (!aceptado) await tx.aceptarAvisoGrabacion(reunion.identificador, usuario.id);
      }
      const token = await emitirCredencial({ jitsiDominio: configuracion.jitsiDominio!, jitsiAplicacion: configuracion.jitsiAplicacion!, jitsiSecreto: configuracion.jitsiSecreto! },
        { identificador: String(usuario.id), nombre: usuario.name, correo: usuario.email, moderador }, reunion.nombreSala);
      return { token, dominio: configuracion.jitsiDominio, direccionServidor: configuracion.jitsiDireccion ?? `https://${configuracion.jitsiDominio}`,
        nombreSala: reunion.nombreSala, nombre: usuario.name, duracionSegundos: 300 };
    })
  };
}

export type ReunionesService = ReturnType<typeof crearReunionesService>;
