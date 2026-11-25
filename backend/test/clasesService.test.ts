import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Clase } from "../src/entities/clases/clase.js";
import type { ClasesRepository } from "../src/repositories/clases/clasesRepository.js";
import { crearClasesService } from "../src/services/clases/clasesService.js";
import { verificarTokenQr } from "../src/services/qr/qrToken.js";
import { ErrorAplicacion } from "../src/shared/errorAplicacion.js";

const secreto = "secreto-de-prueba-del-qr-0123456789";

function clase(id: string, cambios: Partial<Clase> = {}): Clase {
  return { id, nombre: `Clase ${id}`, instructor: { id: "7", nombre: "Carlos" }, fecha: "2030-10-14", horaInicio: "08:00", horaFin: "10:00",
    lugar: "Aula 1", modalidad: "PRESENCIAL", inscritos: 0, estado: "PROGRAMADA", ...cambios };
}

/** Clases en memoria; registra avisos, salas sincronizadas e inscripciones. */
function repositorioFalso() {
  const clases = new Map<string, Clase>([["1", clase("1")], ["2", clase("2", { estado: "CANCELADA" })], ["3", clase("3", { modalidad: "VIRTUAL", lugar: "Aula virtual", horaInicio: "14:00", horaFin: "15:00" })]]);
  const cursoDe = new Map([["1", "50"]]);
  const avisos: { detalles: string[] }[] = [];
  const salas: number[] = [];
  const inscripciones = new Set(["1:30"]);
  const participantes: Record<string, { id: string; nombre: string; email: string }> = {
    "maria@cppp.local": { id: "20", nombre: "María", email: "maria@cppp.local" },
    "luz@cppp.local": { id: "30", nombre: "Luz", email: "luz@cppp.local" },
    "ana@cppp.local": { id: "40", nombre: "Ana", email: "ana@cppp.local" }
  };
  const sinCurso = (claseId: number, participanteId: string) => participanteId !== "40";
  const cliente = {} as never;
  const repositorio: ClasesRepository = {
    listarClases: async () => [...clases.values()],
    listarClasesDeInstructor: async () => [],
    obtenerClase: async (id) => clases.get(String(id)) ?? null,
    listarInstructores: async () => [],
    esInstructorActivo: async (id) => id === 7,
    buscarConflicto: async (datos, consultor, ignorarId) => [...clases.values()].find((c) => c.id !== String(ignorarId) && c.estado === "PROGRAMADA"
      && c.instructor.id === String(datos.instructorId) && c.fecha === datos.fecha && c.horaInicio < datos.horaFin && datos.horaInicio < c.horaFin) ?? null,
    conInstructorBloqueado: (instructorId, trabajo) => trabajo(cliente),
    enTransaccion: (trabajo) => trabajo(cliente),
    insertarClase: async (datos) => { clases.set("9", clase("9", { ...datos, instructor: { id: String(datos.instructorId), nombre: "Carlos" } })); return 9; },
    actualizarClase: async (id, datos) => {
      const actual = clases.get(String(id));
      if (!actual || actual.estado !== "PROGRAMADA") return false;
      clases.set(String(id), { ...actual, ...datos, instructor: { id: String(datos.instructorId), nombre: "Carlos" } });
      return true;
    },
    bloquearCursoDeClase: async (id) => cursoDe.get(String(id)),
    cancelarClase: async (id) => {
      const actual = clases.get(String(id));
      if (actual?.estado !== "PROGRAMADA") return false;
      clases.set(String(id), { ...actual, estado: "CANCELADA" });
      return true;
    },
    listarInscritos: async () => [],
    buscarParticipante: async (email) => participantes[email.toLowerCase()] ?? null,
    inscribir: async (claseId, participanteId) => {
      if (inscripciones.has(`${claseId}:${participanteId}`) || !sinCurso(claseId, participanteId)) return false;
      inscripciones.add(`${claseId}:${participanteId}`);
      return true;
    },
    buscarInscripcion: async (claseId, participanteId) => (inscripciones.has(`${claseId}:${participanteId}`) ? "2026-10-12T09:30:00-05:00" : null),
    recalcularModalidadCurso: async () => {},
    encolarAvisoCurso: async (consultor, evento) => { avisos.push({ detalles: evento.detalles }); },
    sincronizarSalaSesion: async (consultor, claseId) => { salas.push(Number(claseId)); }
  };
  return { repositorio, clases, avisos, salas };
}

const servicio = (falso = repositorioFalso()) => ({ ...falso, clasesService: crearClasesService({ repositorio: falso.repositorio, configuracion: { QR_SECRET: secreto } }) });
const datos = { nombre: "Didáctica", instructorId: "7", fecha: "2030-10-14", horaInicio: "11:00", horaFin: "12:00", lugar: "Aula 2", modalidad: "PRESENCIAL" };

async function rechazo(promesa: Promise<unknown>, status: number, code: string, extra?: Record<string, unknown>) {
  await assert.rejects(promesa, (error) => {
    assert.ok(error instanceof ErrorAplicacion, String(error));
    assert.deepEqual({ status: error.status, code: error.code }, { status, code });
    if (extra) assert.deepEqual(error.extra, extra);
    return true;
  });
}

describe("T-26 clases: programar", () => {
  test("un formulario incompleto o un instructor inexistente devuelven 422 con el campo", async () => {
    await rechazo(servicio().clasesService.crear({ ...datos, nombre: "" }, 1), 422, "VALIDACION", { fields: { nombre: "Ingresa el nombre de la clase" } });
    await rechazo(servicio().clasesService.crear({ ...datos, instructorId: "8" }, 1), 422, "VALIDACION", { fields: { instructorId: "El instructor seleccionado no existe" } });
  });

  test("un cruce de horario del instructor devuelve 409 con la clase en conflicto", async () => {
    await assert.rejects(servicio().clasesService.crear({ ...datos, horaInicio: "09:00", horaFin: "11:00" }, 1), (error) => {
      assert.ok(error instanceof ErrorAplicacion);
      assert.equal(error.code, "CONFLICTO_HORARIO");
      assert.equal(error.message, "Carlos ya tiene la clase «Clase 1» el lunes 14 de octubre de 08:00 a 10:00. Elige otro horario u otro instructor.");
      assert.deepEqual(error.extra, { details: { claseId: "1" } });
      return true;
    });
  });

  test("crea la clase y sincroniza su sala", async () => {
    const { clasesService, salas } = servicio();
    assert.equal((await clasesService.crear(datos, 1)).id, "9");
    assert.deepEqual(salas, [9]);
  });
});

describe("T-26 clases: editar y cancelar", () => {
  test("una clase inexistente es 404 y una cancelada es 409", async () => {
    await rechazo(servicio().clasesService.actualizar(null, datos, 1), 404, "CLASE_NO_EXISTE");
    await rechazo(servicio().clasesService.actualizar(2, datos, 1), 409, "CLASE_CANCELADA");
  });

  test("un cambio de horario avisa a los inscritos del curso; sin cambios no avisa", async () => {
    const conCambio = servicio();
    await conCambio.clasesService.actualizar(1, { ...datos, horaInicio: "08:00", horaFin: "09:00" }, 1);
    assert.equal(conCambio.avisos.length, 1);
    assert.match(conCambio.avisos[0]!.detalles[0]!, /^Antes: Clase 1 · 2030-10-14 · 08:00–10:00/);

    const sinCambio = servicio();
    await sinCambio.clasesService.actualizar(1, { ...datos, nombre: "Clase 1", horaInicio: "08:00", horaFin: "10:00", lugar: "Aula 1" }, 1);
    assert.equal(sinCambio.avisos.length, 0);
  });

  test("cancelar avisa la cancelación; repetirla es 409 y una inexistente 404", async () => {
    const { clasesService, avisos } = servicio();
    assert.equal((await clasesService.cancelar(1, 1))!.estado, "CANCELADA");
    assert.match(avisos[0]!.detalles[0]!, /^Se canceló la sesión: Clase 1/);
    await rechazo(clasesService.cancelar(1, 1), 409, "CLASE_CANCELADA");
    await rechazo(clasesService.cancelar(99, 1), 404, "CLASE_NO_EXISTE");
  });
});

describe("T-26 clases: inscripción", () => {
  test("valida el correo y el participante", async () => {
    await rechazo(servicio().clasesService.inscribir(1, { email: "no-es-correo" }), 422, "VALIDACION", { fields: { email: "Ingresa un correo válido" } });
    await rechazo(servicio().clasesService.inscribir(1, { email: "nadie@cppp.local" }), 404, "PARTICIPANTE_NO_EXISTE");
  });

  test("una inscripción repetida es 409 con la fecha previa y una no confirmada en el curso es 403", async () => {
    await rechazo(servicio().clasesService.inscribir(1, { email: "luz@cppp.local" }), 409, "YA_INSCRITO",
      { details: { participanteId: "30", inscritoEn: "2026-10-12T09:30:00-05:00" } });
    await rechazo(servicio().clasesService.inscribir(1, { email: "ana@cppp.local" }), 403, "INSCRIPCION_NO_CONFIRMADA");
  });

  test("inscribe al participante", async () => {
    assert.deepEqual(await servicio().clasesService.inscribir(1, { email: "maria@cppp.local" }), { id: "20", nombre: "María", email: "maria@cppp.local" });
  });
});

describe("T-26 clases: consulta y QR", () => {
  const instructor = { id: 7, role: "instructor" };
  const otroInstructor = { id: 8, role: "instructor" };

  test("un instructor solo ve y proyecta sus clases", async () => {
    await rechazo(servicio().clasesService.obtener(1, otroInstructor), 403, "SIN_PERMISO");
    await rechazo(servicio().clasesService.qr(1, otroInstructor), 403, "SIN_PERMISO");
  });

  test("no hay QR para clases canceladas ni solo virtuales", async () => {
    await rechazo(servicio().clasesService.qr(2, { id: 1, role: "admin" }), 409, "CLASE_CANCELADA");
    await rechazo(servicio().clasesService.qr(3, instructor), 409, "SESION_VIRTUAL");
  });

  test("el QR emitido es válido para su clase durante la ventana", async () => {
    const qr = await servicio().clasesService.qr(1, instructor);
    assert.equal(qr.duracionSegundos, 30);
    assert.deepEqual(verificarTokenQr(qr.token, Date.parse(qr.servidorAhora), secreto), { ok: true, claseId: "1" });
  });
});
