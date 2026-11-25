import assert from "node:assert/strict";
import { test } from "node:test";
import { modalidadDerivada } from "../src/entities/cursos/modalidad.js";
import { validarClase } from "../src/dto/clases/claseDto.js";

const base = { nombre: "Sesión", instructorId: "5", fecha: "2033-06-10", horaInicio: "10:00", horaFin: "11:00" };

test("HU36-03: la modalidad del curso se deriva de sus sesiones programadas", () => {
  assert.equal(modalidadDerivada([], "VIRTUAL"), "VIRTUAL", "sin sesiones conserva la planificada");
  assert.equal(modalidadDerivada([], "GRABADO"), "GRABADO");
  assert.equal(modalidadDerivada(["PRESENCIAL", "PRESENCIAL"], "VIRTUAL"), "PRESENCIAL");
  assert.equal(modalidadDerivada(["VIRTUAL", "VIRTUAL"], "PRESENCIAL"), "VIRTUAL");
  assert.equal(modalidadDerivada(["VIRTUAL", "VIRTUAL", "VIRTUAL", "VIRTUAL", "PRESENCIAL"], "PRESENCIAL"), "HIBRIDA");
  assert.equal(modalidadDerivada(["AMBAS"], "PRESENCIAL"), "HIBRIDA");
});

test("HU36-01: la sesión acepta solo presencial, virtual o ambas", () => {
  const invalida = validarClase({ ...base, lugar: "Aula 1", modalidad: "HIBRIDA" });
  assert.equal(invalida.ok, false);
  assert.ok(!invalida.ok && invalida.fields.modalidad);
  for (const modalidad of ["PRESENCIAL", "VIRTUAL", "AMBAS"]) {
    const resultado = validarClase({ ...base, lugar: "Aula 1", modalidad });
    assert.ok(resultado.ok && resultado.datos.modalidad === modalidad, modalidad);
  }
});

test("HU36-02: el lugar es obligatorio en presencial y ambas, y opcional en virtual", () => {
  for (const modalidad of ["PRESENCIAL", "AMBAS"]) {
    const resultado = validarClase({ ...base, lugar: " ", modalidad });
    assert.ok(!resultado.ok && resultado.fields.lugar, modalidad);
  }
  const virtual = validarClase({ ...base, modalidad: "VIRTUAL" });
  assert.ok(virtual.ok);
  assert.equal(virtual.ok && virtual.datos.lugar, "Aula virtual");
  const conEnlace = validarClase({ ...base, modalidad: "VIRTUAL", lugar: "Sala del CPPP" });
  assert.equal(conEnlace.ok && conEnlace.datos.lugar, "Sala del CPPP");
});

test("HU-36: sin modalidad se usa la indicada por la ruta (compatibilidad con clientes anteriores)", () => {
  const alta = validarClase({ ...base, lugar: "Aula 1" });
  assert.equal(alta.ok && alta.datos.modalidad, "PRESENCIAL");
  const edicion = validarClase({ ...base }, "VIRTUAL");
  assert.equal(edicion.ok && edicion.datos.modalidad, "VIRTUAL");
});
