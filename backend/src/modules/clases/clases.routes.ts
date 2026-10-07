import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  actualizarClase,
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

/** Valida el cuerpo y el instructor; devuelve los datos o envía 422. */
async function leerDatos(request: FastifyRequest, reply: FastifyReply): Promise<DatosClase | null> {
  const resultado = validarClase(request.body);

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

  app.get("/api/clases", async () => listarClases());

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
      return { clase: await obtenerClase(await insertarClase(datos, consultor), consultor) };
    });

    if (resultado.conflicto) return errorConflicto(reply, resultado.conflicto);
    return reply.code(201).send(resultado.clase);
  });

  app.put("/api/clases/:id", async (request: ConId, reply) => {
    const id = leerId(request);
    const actual = id ? await obtenerClase(id) : null;

    if (!id || !actual) return claseNoExiste(reply);
    if (actual.estado === "CANCELADA") return claseCancelada(reply);

    const datos = await leerDatos(request, reply);
    if (!datos) return reply;

    const resultado = await conInstructorBloqueado(datos.instructorId, async (consultor) => {
      const conflicto = await buscarConflicto(datos, consultor, id);
      if (conflicto) return { conflicto };
      // Pudo cancelarse entre la lectura y la escritura.
      if (!(await actualizarClase(id, datos, consultor))) return { cancelada: true };
      return { clase: await obtenerClase(id, consultor) };
    });

    if (resultado.conflicto) return errorConflicto(reply, resultado.conflicto);
    if (resultado.cancelada) return claseCancelada(reply);
    return resultado.clase;
  });

  app.post("/api/clases/:id/cancelar", async (request: ConId, reply) => {
    const id = leerId(request);
    if (!id) return claseNoExiste(reply);

    if (!(await cancelarClase(id))) {
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
