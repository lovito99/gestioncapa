import { randomUUID } from "node:crypto";
import type { UsuarioAutenticado } from "../../plugins/autorizacion.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
import { camposDeError } from "../../shared/validacion.js";
import { esquemaInscripcion, validarClase } from "../../dto/clases/claseDto.js";
import type { Clase, DatosClase } from "../../entities/clases/clase.js";
import type { ModalidadSesion } from "../../entities/cursos/modalidad.js";
import type { ClasesRepository, ClienteTransaccion } from "../../repositories/clases/clasesRepository.js";
import { DURACION_QR_SEGUNDOS, emitirTokenQr, reloj } from "../qr/qrToken.js";

type Actor = Pick<UsuarioAutenticado, "id" | "role">;

export type ClasesServiceDeps = {
  repositorio: ClasesRepository;
  /** Se lee al emitir cada QR. */
  configuracion: { QR_SECRET: string };
};

const formatoFecha = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** `2026-10-12` → `lunes 12 de octubre`, igual que la interfaz (Intl agrega una coma). */
const fechaLarga = (fecha: string) => formatoFecha.format(new Date(`${fecha}T00:00:00Z`)).replace(",", "");

const claseNoExiste = () => new ErrorAplicacion(404, "CLASE_NO_EXISTE", "La clase no existe.");
const claseCancelada = () => new ErrorAplicacion(409, "CLASE_CANCELADA", "La clase está cancelada.");
const noAsignada = () => new ErrorAplicacion(403, "SIN_PERMISO", "Esta clase no está asignada a ti.");
const errorValidacion = (fields: Record<string, string>) =>
  new ErrorAplicacion(422, "VALIDACION", "No se pudo guardar la clase. Completa los campos obligatorios marcados.", { fields });

function errorConflicto(conflicto: Clase) {
  return new ErrorAplicacion(409, "CONFLICTO_HORARIO",
    `${conflicto.instructor.nombre} ya tiene la clase «${conflicto.nombre}» el ${fechaLarga(conflicto.fecha)} de ${conflicto.horaInicio} a ${conflicto.horaFin}. Elige otro horario u otro instructor.`,
    { details: { claseId: conflicto.id } });
}

function resumenSesion(sesion: Clase) {
  return `${sesion.nombre} · ${sesion.fecha} · ${sesion.horaInicio}–${sesion.horaFin} (Lima) · ${sesion.lugar} · ${sesion.modalidad}`;
}

export function crearClasesService({ repositorio, configuracion }: ClasesServiceDeps) {
  /** Valida el cuerpo y el instructor; la modalidad por defecto es la actual de la sesión al editar. */
  async function leerDatos(cuerpo: unknown, modalidadActual?: ModalidadSesion): Promise<DatosClase> {
    const resultado = validarClase(cuerpo, modalidadActual);
    if (!resultado.ok) throw errorValidacion(resultado.fields);
    if (!(await repositorio.esInstructorActivo(resultado.datos.instructorId))) {
      throw errorValidacion({ instructorId: "El instructor seleccionado no existe" });
    }
    const { encargadoId } = resultado.datos;
    if (encargadoId && !(await repositorio.esInstructorActivo(Number(encargadoId)))) {
      throw errorValidacion({ encargadoId: "Selecciona un instructor activo para la asistencia." });
    }
    return resultado.datos;
  }

  /** Respeta el orden curso → sesión usado en las transacciones de cobro y asistencia. */
  async function leerSesionParaCambio(cliente: ClienteTransaccion, claseId: number) {
    const cursoId = await repositorio.bloquearCursoDeClase(claseId, cliente);
    return { cursoId, anterior: await repositorio.obtenerClase(claseId, cliente, true) };
  }

  async function despuesDeCambiarSesion(cliente: ClienteTransaccion, claseId: number, actorId: number, cursoId: string | undefined, anterior: Clase, actual: Clase) {
    if (cursoId) {
      await repositorio.recalcularModalidadCurso(cliente, cursoId);
      const antes = resumenSesion(anterior);
      const ahora = resumenSesion(actual);
      if (antes !== ahora || anterior.estado !== actual.estado) {
        const detalles = actual.estado === "CANCELADA" ? [`Se canceló la sesión: ${antes}`] : [`Antes: ${antes}`, `Ahora: ${ahora}`];
        await repositorio.encolarAvisoCurso(cliente, { tipo: "CAMBIO_SESION", cursoId, eventoId: randomUUID(), detalles });
      }
    }
    await repositorio.sincronizarSalaSesion(cliente, claseId, actorId);
  }

  async function claseExistente(id: number | null) {
    const clase = id ? await repositorio.obtenerClase(id) : null;
    if (!id || !clase) throw claseNoExiste();
    return { id, clase };
  }

  return {
    listarInstructores: () => repositorio.listarInstructores(),
    listar: () => repositorio.listarClases(),
    clasesDeInstructor: (instructorId: number) => repositorio.listarClasesDeInstructor(instructorId),

    async obtener(id: number | null, usuario: Actor) {
      const { clase } = await claseExistente(id);
      if (usuario.role === "instructor" && clase.instructor.id !== String(usuario.id)) throw noAsignada();
      return clase;
    },

    async crear(cuerpo: unknown, actorId: number) {
      const datos = await leerDatos(cuerpo);
      // El bloqueo del instructor impide que dos administradores programen a la vez clases que se crucen.
      return repositorio.conInstructorBloqueado(datos.instructorId, async (cliente) => {
        const conflicto = await repositorio.buscarConflicto(datos, cliente);
        if (conflicto) throw errorConflicto(conflicto);
        const id = await repositorio.insertarClase(datos, cliente);
        await repositorio.sincronizarSalaSesion(cliente, id, actorId);
        return (await repositorio.obtenerClase(id, cliente))!;
      });
    },

    async actualizar(idSolicitado: number | null, cuerpo: unknown, actorId: number) {
      const { id, clase: actual } = await claseExistente(idSolicitado);
      if (actual.estado === "CANCELADA") throw claseCancelada();
      const datos = await leerDatos(cuerpo, actual.modalidad);

      return repositorio.conInstructorBloqueado(datos.instructorId, async (cliente) => {
        const { cursoId, anterior } = await leerSesionParaCambio(cliente, id);
        if (!anterior || anterior.estado === "CANCELADA") throw claseCancelada();
        // La modalidad pudo cambiar mientras se esperaba el bloqueo: se valida de nuevo con la vigente.
        const vigente = anterior.modalidad === actual.modalidad ? { ok: true as const, datos } : validarClase(cuerpo, anterior.modalidad);
        if (!vigente.ok) throw errorValidacion(vigente.fields);
        const conflicto = await repositorio.buscarConflicto(vigente.datos, cliente, id);
        if (conflicto) throw errorConflicto(conflicto);
        if (!(await repositorio.actualizarClase(id, vigente.datos, cliente))) throw claseCancelada();
        const clase = (await repositorio.obtenerClase(id, cliente))!;
        await despuesDeCambiarSesion(cliente, id, actorId, cursoId, anterior, clase);
        return clase;
      });
    },

    async cancelar(id: number | null, actorId: number) {
      if (!id) throw claseNoExiste();
      const cancelada = await repositorio.enTransaccion(async (cliente) => {
        const { cursoId, anterior } = await leerSesionParaCambio(cliente, id);
        if (!anterior || !(await repositorio.cancelarClase(id, cliente))) return false;
        await despuesDeCambiarSesion(cliente, id, actorId, cursoId, anterior, { ...anterior, estado: "CANCELADA" });
        return true;
      });
      if (!cancelada) throw (await repositorio.obtenerClase(id)) ? claseCancelada() : claseNoExiste();
      return repositorio.obtenerClase(id);
    },

    async inscritos(id: number | null) {
      await claseExistente(id);
      return repositorio.listarInscritos(id!);
    },

    async inscribir(idSolicitado: number | null, cuerpo: unknown) {
      const { id, clase } = await claseExistente(idSolicitado);
      if (clase.estado === "CANCELADA") throw claseCancelada();

      const entrada = esquemaInscripcion.safeParse(cuerpo ?? {});
      if (!entrada.success) {
        const fields = camposDeError(entrada.error);
        throw new ErrorAplicacion(422, "VALIDACION", fields.email ?? "Ingresa un correo válido.", { fields });
      }
      const { email } = entrada.data;
      const participante = await repositorio.buscarParticipante(email);
      if (!participante) {
        throw new ErrorAplicacion(404, "PARTICIPANTE_NO_EXISTE",
          `No encontramos un participante con el correo ${email}. Verifica que esté bien escrito o pide al administrador que cree su cuenta.`);
      }

      if (!(await repositorio.inscribir(id, participante.id))) {
        // Sin inserción: o ya estaba inscrito, o la clase se canceló mientras tanto.
        if ((await repositorio.obtenerClase(id))?.estado === "CANCELADA") throw claseCancelada();
        const inscritoEn = await repositorio.buscarInscripcion(id, participante.id);
        if (!inscritoEn) {
          throw new ErrorAplicacion(403, "INSCRIPCION_NO_CONFIRMADA", "Confirma la inscripción del participante en el curso antes de añadirlo a esta sesión.");
        }
        throw new ErrorAplicacion(409, "YA_INSCRITO",
          `${participante.nombre} ya está inscrito(a) en esta clase desde el ${fechaLarga(inscritoEn.slice(0, 10))} a las ${inscritoEn.slice(11, 16)}. No se creó una inscripción nueva.`,
          { details: { participanteId: participante.id, inscritoEn } });
      }
      return participante;
    },

    /** QR rotativo: administrador o instructor asignado, solo para clases programadas con sesión presencial. */
    async qr(id: number | null, usuario: Actor) {
      const { clase } = await claseExistente(id);
      if (usuario.role !== "admin" && clase.instructor.id !== String(usuario.id)) throw noAsignada();
      if (clase.estado === "CANCELADA") throw claseCancelada();
      if (clase.modalidad === "VIRTUAL") {
        throw new ErrorAplicacion(409, "SESION_VIRTUAL", "Esta sesión es solo virtual: la asistencia se registra en la sala virtual, no con QR.");
      }
      if (clase.qrRotatorio === false) {
        throw new ErrorAplicacion(409, "QR_ROTATORIO_DESACTIVADO", "El QR rotatorio está desactivado para esta sesión.");
      }
      const ahora = reloj.ahora();
      const { token, expiraEnMs } = emitirTokenQr(clase.id, ahora, configuracion.QR_SECRET);
      // servidorAhora permite a la pantalla corregir la diferencia con su reloj.
      return { token, expiraEn: new Date(expiraEnMs).toISOString(), servidorAhora: new Date(ahora).toISOString(), duracionSegundos: DURACION_QR_SEGUNDOS };
    }
  };
}

export type ClasesService = ReturnType<typeof crearClasesService>;
