import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validarClase } from "../src/modules/clases/clases.validacion.js";

const valida = {
  nombre: "  Primeros auxilios  ",
  instructorId: "3",
  fecha: "2030-01-15",
  horaInicio: "10:00",
  horaFin: "11:00",
  lugar: " Sala A "
};

function camposConError(entrada: unknown) {
  const resultado = validarClase(entrada);
  assert.equal(resultado.ok, false, "debía rechazarse");
  return resultado.ok ? {} : resultado.fields;
}

describe("Característica: Programar clase presencial", () => {
  test("PRG-01: Dado campos válidos, entonces devuelve los datos normalizados", () => {
    const resultado = validarClase(valida);

    assert.deepEqual(resultado, {
      ok: true,
      datos: { ...valida, nombre: "Primeros auxilios", lugar: "Sala A", instructorId: 3 }
    });
  });

  const requeridos = {
    nombre: "Ingresa el nombre de la clase",
    instructorId: "Selecciona un instructor",
    fecha: "Ingresa la fecha de la clase",
    horaInicio: "Ingresa la hora de inicio",
    horaFin: "Ingresa la hora de fin",
    lugar: "Ingresa el lugar"
  };

  for (const [campo, mensaje] of Object.entries(requeridos)) {
    test(`PRG-02: Dado ${campo} faltante, entonces indica "${mensaje}"`, () => {
      const { [campo]: _omitido, ...sinCampo } = valida as Record<string, string>;

      assert.deepEqual(camposConError(sinCampo), { [campo]: mensaje });
      assert.deepEqual(camposConError({ ...valida, [campo]: "   " }), { [campo]: mensaje });
    });
  }

  test("PRG-02: Dado un cuerpo vacío o ausente, entonces indica todos los campos", () => {
    assert.deepEqual(Object.keys(camposConError(undefined)).sort(), Object.keys(requeridos).sort());
    assert.deepEqual(Object.keys(camposConError({})).sort(), Object.keys(requeridos).sort());
  });

  test("PRG-03: Dado una fecha inexistente, entonces rechaza la fecha", () => {
    assert.deepEqual(camposConError({ ...valida, fecha: "2030-02-30" }), {
      fecha: "Ingresa una fecha válida (AAAA-MM-DD)"
    });
    assert.ok(camposConError({ ...valida, fecha: "15/01/2030" }).fecha);
    assert.ok(camposConError({ ...valida, fecha: "0000-01-01" }).fecha);
  });

  test("PRG-03: Dado una hora sin formato HH:mm, entonces rechaza esa hora", () => {
    assert.deepEqual(camposConError({ ...valida, horaInicio: "25:00" }), {
      horaInicio: "Ingresa una hora válida (HH:mm)"
    });
  });

  test("PRG-03: Dado una hora de fin igual o anterior a la de inicio, entonces rechaza horaFin", () => {
    const mensaje = { horaFin: "La hora de fin debe ser posterior a la de inicio" };

    assert.deepEqual(camposConError({ ...valida, horaFin: "10:00" }), mensaje);
    assert.deepEqual(camposConError({ ...valida, horaFin: "09:00" }), mensaje);
  });

  test("PRG-04: Dado un instructorId no numérico, entonces rechaza el instructor", () => {
    assert.deepEqual(camposConError({ ...valida, instructorId: "i-1" }), {
      instructorId: "El instructor seleccionado no existe"
    });
  });

  test("VAL-05: el identificador del instructor debe ser positivo", () => {
    for (const instructorId of [0, "0", "000", -1, "1.5", "1e3", Number.NaN]) {
      assert.deepEqual(camposConError({ ...valida, instructorId }), {
        instructorId: "El instructor seleccionado no existe"
      });
    }
  });

  test("PRG-03: Dado textos demasiado largos, entonces los rechaza", () => {
    const fields = camposConError({ ...valida, nombre: "x".repeat(161), lugar: "y".repeat(161) });

    assert.ok(fields.nombre);
    assert.ok(fields.lugar);
  });
});
