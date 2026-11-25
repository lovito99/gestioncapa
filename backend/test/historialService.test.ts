import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { HistorialLectura, HistorialRepository } from "../src/repositories/historial/historialRepository.js";
import { crearHistorialService } from "../src/services/historial/historialService.js";
import { ErrorAplicacion } from "../src/shared/errorAplicacion.js";

const personas: Record<string, { id: string; nombre: string; dni: string | null; role: string }> = {
  "20": { id: "20", nombre: "María", dni: "00001234", role: "agremiado" },
  "7": { id: "7", nombre: "Carlos", dni: null, role: "instructor" }
};

function repositorioFalso(): HistorialRepository {
  const lectura: HistorialLectura = {
    buscarPersona: async (usuarioId) => personas[usuarioId] ?? null,
    cursos: async () => [{ id: "5", titulo: "Curso", estado: "EN_CURSO", horasLectivas: 10, modalidad: "PRESENCIAL",
      pagoPendiente: false, inscritoEn: "2026-11-01T00:00:00Z", terminadoEn: null }],
    sesiones: async () => [
      { id: "1", cursoId: "5", titulo: "S1", fecha: "2026-11-02", horaInicio: "08:00", horaFin: "09:00", estado: "PRESENTE", contabiliza: true, horaRegistro: null },
      { id: "2", cursoId: null, titulo: "Suelta", fecha: "2026-11-03", horaInicio: "08:00", horaFin: "09:00", estado: "AUSENTE", contabiliza: true, horaRegistro: null }
    ],
    certificados: async () => [{ id: "9", cursoId: "5", codigo: "C-1", tipo: "APROBACION", emitidoEn: "2026-11-10T12:00:00Z", horasLectivas: 10, estado: "VALIDO" }]
  };
  return {
    ...lectura,
    enLecturaConsistente: (trabajo) => trabajo(lectura),
    listarColegiados: async () => [{ id: "20", nombre: "María", dni: "00001234" }],
    archivoCertificado: async (certificadoId) => (certificadoId === "9" ? Buffer.from("pdf") : null)
  };
}

const servicio = () => crearHistorialService({ repositorio: repositorioFalso() });
const admin = { id: 1, role: "admin" };
const maria = { id: 20, role: "agremiado" };

async function rechazo(promesa: Promise<unknown>, status: number, code: string, message: string) {
  await assert.rejects(promesa, (error) => {
    assert.ok(error instanceof ErrorAplicacion);
    assert.deepEqual({ status: error.status, code: error.code, message: error.message }, { status, code, message });
    return true;
  });
}

describe("T-26 historial: autorización", () => {
  test("un agremiado no ve el historial de otra persona y un instructor no ve ninguno", async () => {
    const mensaje = "No tienes permiso para ver el historial de otro colegiado.";
    await rechazo(servicio().obtener({ id: 21, role: "agremiado" }, "20"), 403, "SIN_PERMISO", mensaje);
    await rechazo(servicio().obtener({ id: 7, role: "instructor" }, "20"), 403, "SIN_PERMISO", mensaje);
  });

  test("una persona inexistente o que no es colegiada devuelve 404", async () => {
    await rechazo(servicio().obtener(admin, "99"), 404, "HISTORIAL_NO_EXISTE", "El colegiado no existe.");
    await rechazo(servicio().obtener(admin, "7"), 404, "HISTORIAL_NO_EXISTE", "El usuario no es un colegiado.");
  });

  test("un certificado ajeno al historial devuelve 404", async () => {
    await rechazo(servicio().archivoCertificado(maria, "20", "8"), 404, "HISTORIAL_NO_EXISTE", "El certificado no existe en este historial.");
    assert.equal((await servicio().archivoCertificado(maria, "20", "9")).toString(), "pdf");
  });
});

describe("T-26 historial: composición", () => {
  test("agrupa sesiones y certificados por curso, separa las independientes y oculta el DNI", async () => {
    const historial = await servicio().obtener(maria, "20");
    assert.deepEqual(historial.colegiado, { id: "20", nombre: "María", dniEnmascarado: "****1234" });
    assert.deepEqual(historial.cursos[0]!.sesiones.map((s) => s.id), ["1"]);
    assert.deepEqual(historial.cursos[0]!.asistencia, { presentes: 1, realizadas: 1, porcentaje: 100 });
    assert.deepEqual(historial.sesionesIndependientes.map((s) => s.id), ["2"]);
    assert.deepEqual(historial.asistenciaGeneral, { presentes: 1, realizadas: 2, porcentaje: 50 });
    assert.equal(historial.horasAcumuladas.total, 10);
  });

  test("la lista de colegiados enmascara el DNI", async () => {
    assert.deepEqual(await servicio().listarColegiados(admin), [{ id: "20", nombre: "María", dniEnmascarado: "****1234" }]);
  });
});
