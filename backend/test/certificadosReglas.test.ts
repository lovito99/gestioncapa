import assert from "node:assert/strict";
import { test } from "node:test";
import { aFilaCierre, type CursoEmision } from "../src/entities/certificados/certificado.js";
import { validarAlcance } from "../src/services/certificados/certificadosService.js";
import { ErrorAplicacion } from "../src/shared/errorAplicacion.js";

const curso = (cambios: Partial<CursoEmision> = {}): CursoEmision => ({ id: "5", estado: "PUBLICADO", titulo: "Curso", modalidad: "PRESENCIAL",
  costo: 0, modalidadCobro: "GRATUITO", tipoCertificado: "PARTICIPACION", horasLectivas: 10, instructorNombre: "Carlos", ...cambios });

test("T-26 certificados: el 80 % de las sesiones programadas habilita la constancia", () => {
  assert.deepEqual(aFilaCierre({ id: "20", nombre: "María", presentes: 4, sesiones: 5 }),
    { agremiado: { id: "20", nombre: "María" }, presentes: 4, sesiones: 5, porcentaje: 80, cumple: true });
  assert.equal(aFilaCierre({ id: "21", nombre: "Luz", presentes: 3, sesiones: 5 }).cumple, false);
  assert.deepEqual(aFilaCierre({ id: "22", nombre: "Ana", presentes: 0, sesiones: 0 }).porcentaje, 0);
  assert.equal(aFilaCierre({ id: "22", nombre: "Ana", presentes: 0, sesiones: 0 }).cumple, false);
});

test("T-26 certificados: la emisión excluye cursos grabados, de aprobación o con costo sin cobro configurado", () => {
  assert.doesNotThrow(() => validarAlcance(curso()));
  for (const [cambios, code] of [[{ modalidad: "GRABADO" }, "CURSO_GRABADO"], [{ tipoCertificado: "APROBACION" }, "CERTIFICACION_FUERA_ALCANCE"],
    [{ costo: 150, modalidadCobro: null }, "CERTIFICACION_FUERA_ALCANCE"]] as const) {
    assert.throws(() => validarAlcance(curso(cambios)), (error) => error instanceof ErrorAplicacion && error.status === 409 && error.code === code);
  }
});

test("HU19-07: una evaluación oficial publicada habilita la certificación de aprobación", () => {
  assert.doesNotThrow(() => validarAlcance(curso({ tipoCertificado: "APROBACION" }), true));
  assert.doesNotThrow(() => validarAlcance(curso({ modalidad: "GRABADO", tipoCertificado: "APROBACION" }), true));
  assert.throws(() => validarAlcance(curso({ modalidad: "GRABADO" }), true),
    (error) => error instanceof ErrorAplicacion && error.code === "CURSO_GRABADO");
});
