import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AvisoCorreo, ResultadoEnvio } from "../src/entities/notificaciones/correo.js";
import type { MensajeCorreo, TransporteCorreo } from "../src/providers/notificaciones/smtpProvider.js";
import type { ColaCorreoRepository } from "../src/repositories/notificaciones/colaCorreoRepository.js";
import { crearColaCorreoService } from "../src/services/notificaciones/colaCorreoService.js";

const configuracion = {
  correoHabilitado: true, correoRemitente: "pagos@cppp.local", correoOrigenPublico: "https://aula.cppp.local",
  FRONTEND_URL: "http://localhost:5173", NODE_ENV: "test", correoPlazoEnvioMs: 1000
};

function aviso(cambios: Partial<AvisoCorreo> = {}): AvisoCorreo {
  return { id: "1", tipo: "COMPROBANTE", destinatario: "maria@cppp.local", emailActual: "maria@cppp.local", activo: true,
    intentos: 1, datos: null, asunto: "Asunto", texto: "Texto", pagoId: "3", ...cambios };
}

/** Cola en memoria: entrega los avisos en orden y guarda cada resultado. */
function cola(avisos: AvisoCorreo[]) {
  const resultados: ResultadoEnvio[] = [];
  const repositorio: ColaCorreoRepository = {
    liberarAtascados: async () => {},
    reclamar: async () => avisos.shift() ?? null,
    guardarResultado: async (origen, avisoId, proceso, resultado) => { resultados.push(resultado); return 1; }
  };
  return { repositorio, resultados };
}

function transporte(responder: (mensaje: MensajeCorreo) => Promise<{ accepted: unknown[] }>) {
  const enviados: MensajeCorreo[] = [];
  let cerrado = false;
  const falso: TransporteCorreo = {
    sendMail: async (mensaje) => { enviados.push(mensaje); return responder(mensaje); },
    close: () => { cerrado = true; }
  };
  return { falso, enviados, cerrado: () => cerrado };
}

const aceptado = async () => ({ accepted: ["maria@cppp.local"] });
const errorSmtp = (respuesta: object) => async () => { throw Object.assign(new Error("smtp"), respuesta); };

async function procesar(avisos: AvisoCorreo[], responder = aceptado, config = configuracion) {
  const { repositorio, resultados } = cola(avisos);
  const smtp = transporte(responder);
  const enviados = await crearColaCorreoService({ repositorio, crearTransporte: () => smtp.falso, configuracion: config }).procesarColaCorreo("pagos");
  return { enviados, resultados, smtp };
}

describe("T-26 notificaciones: cola de correo", () => {
  test("con el correo deshabilitado no abre conexión ni envía", async () => {
    let creado = false;
    const { repositorio } = cola([aviso()]);
    const servicio = crearColaCorreoService({ repositorio, crearTransporte: () => { creado = true; return transporte(aceptado).falso; },
      configuracion: { ...configuracion, correoHabilitado: false } });
    assert.equal(await servicio.procesarColaCorreo("pagos"), 0);
    assert.equal(creado, false);
  });

  test("envía, cuenta lo entregado y cierra la conexión", async () => {
    const { enviados, resultados, smtp } = await procesar([aviso()]);
    assert.equal(enviados, 1);
    assert.deepEqual(resultados, [{ estado: "ENVIADO", codigo: null }]);
    assert.equal(smtp.enviados[0]!.messageId, "<pago-1@gestioncapa.invalid>");
    assert.equal(smtp.enviados[0]!.from, "pagos@cppp.local");
    assert.equal(smtp.cerrado(), true);
  });

  test("procesa como máximo cinco avisos por llamada", async () => {
    const { enviados } = await procesar(Array.from({ length: 7 }, (_, i) => aviso({ id: String(i + 1) })));
    assert.equal(enviados, 5);
  });

  test("omite destinatarios cambiados, inactivos o con correo inválido sin enviar", async () => {
    const { resultados, smtp } = await procesar([
      aviso({ emailActual: "otro@cppp.local" }), aviso({ activo: false }),
      aviso({ destinatario: "no-es-correo", emailActual: "no-es-correo" })
    ]);
    assert.deepEqual(resultados.map((r) => r.codigo), ["DESTINATARIO_CAMBIADO", "DESTINATARIO_CAMBIADO", "CORREO_INVALIDO"]);
    assert.equal(smtp.enviados.length, 0);
  });

  test("un contenido de curso con destino inválido falla sin enviar", async () => {
    const { resultados } = await procesar([aviso({ datos: { nombre: "María", curso: "C", cursoId: "x", detalles: [] } })]);
    assert.deepEqual(resultados, [{ estado: "FALLIDO", codigo: "CONTENIDO_INVALIDO" }]);
  });

  test("clasifica las respuestas del servidor SMTP", async () => {
    assert.deepEqual((await procesar([aviso()], errorSmtp({ responseCode: 550 }))).resultados, [{ estado: "FALLIDO", codigo: "SMTP_RECHAZADO" }]);
    assert.deepEqual((await procesar([aviso()], errorSmtp({ responseCode: 451 }))).resultados, [{ estado: "PENDIENTE", codigo: "SMTP_FALLO_TEMPORAL", espera: 60 }]);
    assert.deepEqual((await procesar([aviso({ intentos: 5 })], errorSmtp({ syscall: "connect" }))).resultados, [{ estado: "FALLIDO", codigo: "SMTP_INTENTOS_AGOTADOS" }]);
    assert.deepEqual((await procesar([aviso()], errorSmtp({}))).resultados, [{ estado: "INCIERTO", codigo: "SMTP_RESULTADO_INCIERTO" }]);
    assert.deepEqual((await procesar([aviso()], async () => ({ accepted: [] }))).resultados, [{ estado: "FALLIDO", codigo: "SMTP_RECHAZADO" }]);
  });
});
