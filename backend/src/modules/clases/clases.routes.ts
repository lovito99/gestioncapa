import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  actualizarClase,
  bloquearCursoDeClase,
  buscarConflicto,
  buscarInscripcion,
  buscarParticipante,
  cancelarClase,
  conInstructorBloqueado,
  esInstructorActivo,
  inscribir,
  insertarClase,
  listarClases,
  listarClasesDeInstructor,
  listarInscritos,
  listarInstructores,
  obtenerClase,
  type Clase
} from "./clases.repositorio.js";
import { env } from "../../config/env.js";
import { DURACION_QR_SEGUNDOS, emitirTokenQr, reloj } from "../qr/qr.token.js";
import { esquemaInscripcion, validarClase, type DatosClase } from "./clases.validacion.js";
import { camposDeError } from "../../shared/validacion.js";
import type { PoolClient } from "pg";
import { recalcularModalidadCurso, type ModalidadSesion } from "../cursos/modalidadCurso.js";
import { conTransaccion, sincronizarSalaSesion } from "../reuniones/reuniones.repositorio.js";
import { randomUUID } from 'node:crypto';
import { encolarAvisoCurso } from '../notificaciones/correo.repositorio.js';

// El acceso por rol de cada ruta lo aplica la matriz de backend/src/plugins/permisos.ts.

type ConId = FastifyRequest<{ Params: { id: string } }>;

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC"
});

/** `2026-10-12` → `lunes 12 de octubre`, igual que la interfaz (Intl agrega una coma). */
const fechaLarga = (fecha: string) => formatoFecha.format(new Date(`${fecha}T00:00:00Z`)).replace(",", "");

const enviarError = (reply: FastifyReply, status: number, code: string, message: string, extra: object = {}) =>
  reply.code(status).send({ code, message, ...extra });

const claseNoExiste = (reply: FastifyReply) => enviarError(reply, 404, "CLASE_NO_EXISTE", "La clase no existe.");

const claseCancelada = (reply: FastifyReply) =>
  enviarError(reply, 409, "CLASE_CANCELADA", "La clase está cancelada.");

/** Id de la URL; null si no es un entero positivo (se responde 404, no 500). */
function leerId(request: ConId) {
  const id = Number(request.params.id);
  return /^\d{1,15}$/.test(request.params.id) && id > 0 ? id : null;
}

function errorValidacion(reply: FastifyReply, fields: Record<string, string>) {
  return enviarError(
    reply,
    422,
    "VALIDACION",
    "No se pudo guardar la clase. Completa los campos obligatorios marcados.",
    { fields }
  );
}

function errorConflicto(reply: FastifyReply, conflicto: Clase) {
  const fecha = fechaLarga(conflicto.fecha);
  return enviarError(
    reply,
    409,
    "CONFLICTO_HORARIO",
    `${conflicto.instructor.nombre} ya tiene la clase «${conflicto.nombre}» el ${fecha} de ${conflicto.horaInicio} a ${conflicto.horaFin}. Elige otro horario u otro instructor.`,
    { details: { claseId: conflicto.id } }
  );
}

async function leerSesionParaCambio(cliente: PoolClient, claseId: number) {
  const cursoId = await bloquearCursoDeClase(claseId, cliente);
  return { cursoId, anterior: await obtenerClase(claseId, cliente, true) };
}

function resumenSesion(sesion: Clase) {
  return `${sesion.nombre} · ${sesion.fecha} · ${sesion.horaInicio}–${sesion.horaFin} (Lima) · ${sesion.lugar} · ${sesion.modalidad}`;
}

async function despuesDeCambiarSesion(cliente: PoolClient, claseId: number, actorId: number, cursoId: string | undefined, anterior: Clase, actual: Clase) {
  if (cursoId) {
    await recalcularModalidadCurso(cliente, cursoId);
    const antes = resumenSesion(anterior);
    const ahora = resumenSesion(actual);
    if (antes !== ahora || anterior.estado !== actual.estado) {
      const detalles = actual.estado === 'CANCELADA' ? [`Se canceló la sesión: ${antes}`]
        : [`Antes: ${antes}`, `Ahora: ${ahora}`];
      await encolarAvisoCurso(cliente, { tipo: 'CAMBIO_SESION', cursoId, eventoId: randomUUID(), detalles });
    }
  }
  await sincronizarSalaSesion(cliente, claseId, actorId);
}

const sesionVirtual = (reply: FastifyReply) => enviarError(reply, 409, "SESION_VIRTUAL",
  "Esta sesión es solo virtual: la asistencia se registra en la sala virtual, no con QR.");

/** Valida el cuerpo y el instructor; devuelve los datos o envía 422. */
async function leerDatos(request: FastifyRequest, reply: FastifyReply, modalidadActual?: ModalidadSesion): Promise<DatosClase | null> {
  const resultado = validarClase(request.body, modalidadActual);

  if (!resultado.ok) {
    await errorValidacion(reply, resultado.fields);
    return null;
  }

  if (!(await esInstructorActivo(resultado.datos.instructorId))) {
    await errorValidacion(reply, { instructorId: "El instructor seleccionado no existe" });
    return null;
  }

  return resultado.datos;
}

export async function clasesRoutes(app: FastifyInstance) {
  app.get("/api/instructores", async () => listarInstructores());

  app.get("/api/clases", async request => listarClases());

  app.get("/api/clases/:id", async (request: ConId, reply) => {
    const id = leerId(request);
    const clase = id ? await obtenerClase(id) : null;

    if (!clase) return claseNoExiste(reply);

    if (request.usuario?.role === "instructor" && clase.instructor.id !== String(request.usuario.id)) {
      return enviarError(reply, 403, "SIN_PERMISO", "Esta clase no está asignada a ti.");
    }

    return clase;
  });

  app.post("/api/clases", async (request, reply) => {
    const datos = await leerDatos(request, reply);
    if (!datos) return reply;

    const resultado = await conInstructorBloqueado(datos.instructorId, async (consultor) => {
      const conflicto = await buscarConflicto(datos, consultor);
      if (conflicto) return { conflicto };
      const id = await insertarClase(datos, consultor);
      await sincronizarSalaSesion(consultor, id, request.usuario!.id);
      return { clase: await obtenerClase(id, consultor) };
    });

    if (resultado.conflicto) return errorConflicto(reply, resultado.conflicto);
    return reply.code(201).send(resultado.clase);
  });

  app.put("/api/clases/:id", async (request: ConId, reply) => {
    const id = leerId(request);
    const actual = id ? await obtenerClase(id) : null;

    if (!id || !actual) return claseNoExiste(reply);
    if (actual.estado === "CANCELADA") return claseCancelada(reply);

    const datos = await leerDatos(request, reply, actual.modalidad);
    if (!datos) return reply;

    const resultado = await conInstructorBloqueado(datos.instructorId, async (consultor) => {
      const { cursoId, anterior } = await leerSesionParaCambio(consultor, id);
      if (!anterior || anterior.estado === 'CANCELADA') return { cancelada: true };
      const vigente = anterior.modalidad === actual.modalidad ? { ok: true as const, datos }
        : validarClase(request.body, anterior.modalidad);
      if (!vigente.ok) return { campos: vigente.fields };
      const conflicto = await buscarConflicto(vigente.datos, consultor, id);
      if (conflicto) return { conflicto };
      if (!(await actualizarClase(id, vigente.datos, consultor))) return { cancelada: true };
      const clase = (await obtenerClase(id, consultor))!;
      await despuesDeCambiarSesion(consultor, id, request.usuario!.id, cursoId, anterior, clase);
      return { clase };
    });

    if (resultado.campos) return errorValidacion(reply, resultado.campos);
    if (resultado.conflicto) return errorConflicto(reply, resultado.conflicto);
    if (resultado.cancelada) return claseCancelada(reply);
    return resultado.clase;
  });

  app.post("/api/clases/:id/cancelar", async (request: ConId, reply) => {
    const id = leerId(request);
    if (!id) return claseNoExiste(reply);

    const cancelada = await conTransaccion(async cliente => {
      const { cursoId, anterior } = await leerSesionParaCambio(cliente, id);
      if (!anterior || !(await cancelarClase(id, cliente))) return false;
      await despuesDeCambiarSesion(cliente, id, request.usuario!.id, cursoId, anterior, { ...anterior, estado: 'CANCELADA' });
      return true;
    });
    if (!cancelada) {
      return (await obtenerClase(id)) ? claseCancelada(reply) : claseNoExiste(reply);
    }

    return obtenerClase(id);
  });

  app.get("/api/clases/:id/inscritos", async (request: ConId, reply) => {
    const id = leerId(request);
    if (!id || !(await obtenerClase(id))) return claseNoExiste(reply);
    return listarInscritos(id);
  });

  app.post("/api/clases/:id/inscritos", async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply) => {
    const id = leerId(request);
    const clase = id ? await obtenerClase(id) : null;

    if (!id || !clase) return claseNoExiste(reply);
    if (clase.estado === "CANCELADA") return claseCancelada(reply);

    const cuerpo = esquemaInscripcion.safeParse(request.body ?? {});
    if (!cuerpo.success) {
      const fields = camposDeError(cuerpo.error);
      return enviarError(reply, 422, "VALIDACION", fields.email ?? "Ingresa un correo válido.", { fields });
    }
    const { email } = cuerpo.data;

    const participante = await buscarParticipante(email);

    if (!participante) {
      return enviarError(
        reply,
        404,
        "PARTICIPANTE_NO_EXISTE",
        `No encontramos un participante con el correo ${email}. Verifica que esté bien escrito o pide al administrador que cree su cuenta.`
      );
    }

    if (!(await inscribir(id, participante.id))) {
      // Sin inserción: o ya estaba inscrito, o la clase se canceló mientras tanto.
      if ((await obtenerClase(id))?.estado === "CANCELADA") return claseCancelada(reply);
      const inscritoEn = await buscarInscripcion(id, participante.id);
      if (!inscritoEn) return enviarError(reply,403,'INSCRIPCION_NO_CONFIRMADA','Confirma la inscripción del participante en el curso antes de añadirlo a esta sesión.');
      const desde = inscritoEn ? ` desde el ${fechaLarga(inscritoEn.slice(0, 10))} a las ${inscritoEn.slice(11, 16)}` : "";
      return enviarError(
        reply,
        409,
        "YA_INSCRITO",
        `${participante.nombre} ya está inscrito(a) en esta clase${desde}. No se creó una inscripción nueva.`,
        { details: { participanteId: participante.id, inscritoEn } }
      );
    }

    return reply.code(201).send(participante);
  });

  app.get("/api/instructor/clases", async (request) => listarClasesDeInstructor(request.usuario!.id));

  // QR rotativo: administrador o instructor asignado, solo para clases programadas.
  app.get("/api/clases/:id/qr", async (request: ConId, reply) => {
    const id = leerId(request);
    const clase = id ? await obtenerClase(id) : null;

    if (!clase) return claseNoExiste(reply);
    if (request.usuario?.role !== "admin" && clase.instructor.id !== String(request.usuario?.id)) {
      return enviarError(reply, 403, "SIN_PERMISO", "Esta clase no está asignada a ti.");
    }
    if (clase.estado === "CANCELADA") return claseCancelada(reply);
    if (clase.modalidad === "VIRTUAL") return sesionVirtual(reply);

    const ahora = reloj.ahora();
    const { token, expiraEnMs } = emitirTokenQr(clase.id, ahora, env.QR_SECRET);

    // servidorAhora permite a la pantalla corregir la diferencia con su reloj.
    return reply.header("Cache-Control", "no-store").send({
      token,
      expiraEn: new Date(expiraEnMs).toISOString(),
      servidorAhora: new Date(ahora).toISOString(),
      duracionSegundos: DURACION_QR_SEGUNDOS
    });
  });
}
