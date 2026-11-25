import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ConexionesRepository } from "../src/repositories/jitsi/conexionesRepository.js";
import { crearEventosJitsiService } from "../src/services/jitsi/eventosJitsiService.js";

function repositorioFalso() {
  const entradas: unknown[][] = [];
  const salidas: unknown[][] = [];
  const repositorio: ConexionesRepository = {
    registrarEntrada: async (...datos) => { entradas.push(datos); },
    registrarSalida: async (...datos) => { salidas.push(datos); }
  };
  return { repositorio, entradas, salidas };
}

const ocupante = { id: "20", occupant_jid: "sala@muc/abc", joined_at: 1_700_000_000 };

describe("T-26 jitsi: eventos de ocupantes", () => {
  test("registra la entrada de un ocupante autenticado", async () => {
    const falso = repositorioFalso();
    await crearEventosJitsiService({ repositorio: falso.repositorio, configuracion: {} }).ocupanteEntro({ room_name: "sala", occupant: ocupante });
    assert.deepEqual(falso.entradas, [["sala", "20", "sala@muc/abc", 1_700_000_000]]);
  });

  test("ignora invitados sin identificador y salidas sin hora de salida", async () => {
    const falso = repositorioFalso();
    const servicio = crearEventosJitsiService({ repositorio: falso.repositorio, configuracion: {} });
    await servicio.ocupanteEntro({ room_name: "sala", occupant: { ...ocupante, id: undefined } });
    await servicio.ocupanteSalio({ room_name: "sala", occupant: ocupante });
    assert.equal(falso.entradas.length + falso.salidas.length, 0);
  });

  test("registra la salida con ambos instantes", async () => {
    const falso = repositorioFalso();
    await crearEventosJitsiService({ repositorio: falso.repositorio, configuracion: {} })
      .ocupanteSalio({ room_name: "sala", occupant: { ...ocupante, left_at: 1_700_000_600 } });
    assert.deepEqual(falso.salidas, [["sala", "20", "sala@muc/abc", 1_700_000_000, 1_700_000_600]]);
  });
});

describe("T-26 jitsi: credencial del webhook", () => {
  const servicio = (secreto?: string) => crearEventosJitsiService({ repositorio: repositorioFalso().repositorio, configuracion: { jitsiEventosSecreto: secreto } });

  test("sin secreto configurado el webhook no está disponible", () => {
    assert.equal(servicio().configurado(), false);
  });

  test("solo acepta el Bearer exacto del secreto", () => {
    assert.equal(servicio("s3creto").autorizado("Bearer s3creto"), true);
    assert.equal(servicio("s3creto").autorizado("Bearer otro"), false);
    assert.equal(servicio("s3creto").autorizado(undefined), false);
  });

  test("lee el secreto en cada llamada para reflejar cambios de configuración", () => {
    const configuracion: { jitsiEventosSecreto?: string | undefined } = { jitsiEventosSecreto: "uno" };
    const conCambio = crearEventosJitsiService({ repositorio: repositorioFalso().repositorio, configuracion });
    configuracion.jitsiEventosSecreto = "dos";
    assert.equal(conCambio.autorizado("Bearer dos"), true);
  });
});
