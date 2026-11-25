import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Clase } from "../src/entities/clases/clase.js";
import type { ResultadoQr } from "../src/services/qr/qrToken.js";
import type { AsistenciaRepository, AsistenciaTransaccion } from "../src/repositories/asistencia/asistenciaRepository.js";
import { crearAsistenciaService } from "../src/services/asistencia/asistenciaService.js";
import { ErrorAplicacion } from "../src/shared/errorAplicacion.js";

const hora = "2026-11-24T08:05:00-05:00";

function clase(id: string, cambios: Partial<Clase> = {}): Clase {
  return { id, nombre: `Clase ${id}`, estado: "PROGRAMADA", modalidad: "PRESENCIAL", instructor: { id: "7", nombre: "Carlos" }, ...cambios } as Clase;
}

/** Datos en memoria con la misma semántica que las consultas reales. */
function repositorioFalso() {
  const clases = new Map([["1", clase("1")], ["2", clase("2", { estado: "CANCELADA" })], ["3", clase("3", { modalidad: "VIRTUAL" })], ["4", clase("4")]]);
  const cursosCerrados = new Set(["4"]);
  const inscritos = new Set(["1:20", "4:20"]);
  const asistencias = new Map<string, string>();
  const tx: AsistenciaTransaccion = {
    obtenerClase: async (id) => clases.get(String(id)) ?? null,
    cursoCerrado: async (id) => cursosCerrados.has(String(id)),
    estaInscrito: async (id, usuario) => inscritos.has(`${id}:${usuario}`),
    registrar: async (id, usuario) => {
      if (asistencias.has(`${id}:${usuario}`)) return null;
      asistencias.set(`${id}:${usuario}`, hora);
      return hora;
    },
    horaDeAsistencia: async (id, usuario) => asistencias.get(`${id}:${usuario}`) ?? null
  };
  const repositorio: AsistenciaRepository = {
    enClaseBloqueada: (claseId, trabajo) => trabajo(tx),
    obtenerClase: tx.obtenerClase,
    inscritosConAsistencia: async () => [
      { id: "20", nombre: "María", email: "maria@cppp.local", hora },
      { id: "21", nombre: "Luz", email: "luz@cppp.local", hora: null }
    ],
    clasesDeParticipante: async () => []
  };
  return { repositorio, asistencias };
}

/** Cada verificación del token devuelve el siguiente resultado; el último se repite. */
function qr(...resultados: ResultadoQr[]) {
  let llamada = 0;
  return () => resultados[Math.min(llamada++, resultados.length - 1)]!;
}
const valido = (claseId: string): ResultadoQr => ({ ok: true, claseId });
const expirado: ResultadoQr = { ok: false, motivo: "EXPIRADO" };

async function rechazo(promesa: Promise<unknown>, status: number, code: string, message?: string) {
  await assert.rejects(promesa, (error) => {
    assert.ok(error instanceof ErrorAplicacion);
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    if (message) assert.equal(error.message, message);
    return true;
  });
}

describe("T-26 asistencia: marcar con QR", () => {
  const marcar = (verificarQr: () => ResultadoQr, entrada: { token: string; claseId?: string } = { token: "t" }, usuarioId = 20) => {
    const falso = repositorioFalso();
    return { falso, resultado: crearAsistenciaService({ repositorio: falso.repositorio, verificarQr }).marcar(entrada, usuarioId) };
  };

  test("un QR válido registra la asistencia y devuelve clase y hora", async () => {
    const { falso, resultado } = marcar(qr(valido("1")));
    assert.deepEqual(await resultado, { clase: { id: "1", nombre: "Clase 1" }, horaRegistro: hora });
    assert.equal(falso.asistencias.size, 1);
  });

  test("un QR alterado se rechaza con 422", async () => {
    await rechazo(marcar(qr({ ok: false, motivo: "INVALIDO" })).resultado, 422, "QR_INVALIDO",
      "Este código QR no es válido. Escanea el código que muestra tu instructor en la sala.");
  });

  test("un QR vencido se rechaza con 410", async () => {
    await rechazo(marcar(qr(expirado)).resultado, 410, "QR_EXPIRADO",
      "El código QR expiró. Escanea el código nuevo que aparece en la pantalla del instructor.");
  });

  test("un QR de otra clase se rechaza con 409", async () => {
    await rechazo(marcar(qr(valido("1")), { token: "t", claseId: "4" }).resultado, 409, "QR_OTRA_CLASE");
  });

  test("una clase inexistente, cancelada, virtual o de curso cerrado se rechaza", async () => {
    await rechazo(marcar(qr(valido("99"))).resultado, 404, "CLASE_NO_EXISTE", "La clase no existe.");
    await rechazo(marcar(qr(valido("2"))).resultado, 409, "CLASE_CANCELADA", "La clase está cancelada.");
    await rechazo(marcar(qr(valido("3"))).resultado, 409, "SESION_VIRTUAL");
    await rechazo(marcar(qr(valido("4"))).resultado, 409, "CURSO_CERRADO", "El curso ya está cerrado y no admite nuevas asistencias.");
  });

  test("una persona no inscrita recibe 403 y no se registra nada", async () => {
    const { falso, resultado } = marcar(qr(valido("1")), { token: "t" }, 21);
    await rechazo(resultado, 403, "NO_INSCRITO", "No estás inscrito(a) en esta clase. Pide al administrador que te inscriba.");
    assert.equal(falso.asistencias.size, 0);
  });

  test("una asistencia repetida devuelve 409 con la hora anterior", async () => {
    const falso = repositorioFalso();
    const servicio = crearAsistenciaService({ repositorio: falso.repositorio, verificarQr: qr(valido("1")) });
    await servicio.marcar({ token: "t" }, 20);
    await rechazo(servicio.marcar({ token: "t" }, 20), 409, "ASISTENCIA_YA_REGISTRADA",
      "Tu asistencia ya estaba registrada a las 08:05. No necesitas volver a escanear.");
    assert.equal(falso.asistencias.size, 1);
  });

  test("un QR que vence al bloquear la clase o antes de guardar no registra", async () => {
    const alBloquear = marcar(qr(valido("1"), expirado));
    await rechazo(alBloquear.resultado, 410, "QR_EXPIRADO");
    const alGuardar = marcar(qr(valido("1"), valido("1"), expirado));
    await rechazo(alGuardar.resultado, 410, "QR_EXPIRADO");
    assert.equal(alBloquear.falso.asistencias.size + alGuardar.falso.asistencias.size, 0);
  });
});

describe("T-26 asistencia: lista de la clase", () => {
  const servicio = () => crearAsistenciaService({ repositorio: repositorioFalso().repositorio, verificarQr: qr(valido("1")) });

  test("resume presentes y ausentes para el administrador", async () => {
    const lista = await servicio().listaDeClase(1, { id: 1, role: "admin" });
    assert.deepEqual({ inscritos: lista.inscritos, presentes: lista.presentes, ausentes: lista.ausentes }, { inscritos: 2, presentes: 1, ausentes: 1 });
    assert.deepEqual(lista.registros[1], { participante: { id: "21", nombre: "Luz", email: "luz@cppp.local" }, estado: "AUSENTE", horaRegistro: null });
  });

  test("un instructor ajeno recibe 403 y el asignado ve la lista", async () => {
    await rechazo(servicio().listaDeClase(1, { id: 8, role: "instructor" }), 403, "SIN_PERMISO", "Esta sesión no está asignada a ti.");
    assert.equal((await servicio().listaDeClase(1, { id: 7, role: "instructor" })).inscritos, 2);
  });

  test("un identificador inválido o inexistente devuelve 404", async () => {
    await rechazo(servicio().listaDeClase(null, { id: 1, role: "admin" }), 404, "CLASE_NO_EXISTE");
    await rechazo(servicio().listaDeClase(99, { id: 1, role: "admin" }), 404, "CLASE_NO_EXISTE");
  });
});
