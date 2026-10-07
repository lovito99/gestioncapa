import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  actualizarClase,
  buscarConflicto,
  buscarParticipante,
  cancelarClase,
  conInstructorBloqueado,
  esInstructorActivo,
  inscribir,
  insertarClase,
  listarClases,
  listarInscritos,
  listarInstructores,
  obtenerClase,
  type Clase
} from "./clases.repositorio.js";
import { validarClase, type DatosClase } from "./clases.validacion.js";

// El acceso por rol de cada ruta lo aplica la matriz de backend/src/plugins/permisos.ts.

type ConId = FastifyRequest<{ Params: { id: string } }>;

const fechaLarga = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC"
});

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
  const fecha = fechaLarga.format(new Date(`${conflicto.fecha}T00:00:00Z`));
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

    const cuerpo = request.body as { email?: unknown } | null;
    const email = typeof cuerpo?.email === "string" ? cuerpo.email.trim() : "";

    if (!email) {
      return enviarError(reply, 422, "VALIDACION", "Ingresa el correo del participante.", {
        fields: { email: "Ingresa el correo del participante" }
      });
    }

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
      return enviarError(
        reply,
        409,
        "YA_INSCRITO",
        `${participante.nombre} ya está inscrito(a) en esta clase. No se creó una inscripción nueva.`
      );
    }

    return reply.code(201).send(participante);
  });

  // La generación del QR rotativo es otra historia: aquí solo se valida la clase.
  app.get("/api/clases/:id/qr", async (request: ConId, reply) => {
    const id = leerId(request);
    const clase = id ? await obtenerClase(id) : null;

    if (!clase) return claseNoExiste(reply);
    if (clase.instructor.id !== String(request.usuario?.id)) {
      return enviarError(reply, 403, "SIN_PERMISO", "Esta clase no está asignada a ti.");
    }
    if (clase.estado === "CANCELADA") return claseCancelada(reply);

    return enviarError(reply, 501, "NO_IMPLEMENTADO", "Esta función aún no está disponible en el servidor.");
  });
}
