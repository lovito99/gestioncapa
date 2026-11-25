import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { OfertaCurso } from "../src/entities/cursos/curso.js";
import type { InscripcionesRepository, InscripcionTransaccion } from "../src/repositories/cursos/inscripcionesRepository.js";
import { crearInscripcionService } from "../src/services/cursos/inscripcionService.js";

type Afiliacion = { habilitado: boolean | null; vinculado: boolean | null };

function oferta(cambios: Partial<OfertaCurso> = {}): OfertaCurso {
  return { estado: "PUBLICADO", cupos: 10, costo: 150, precioGeneral: 200, modalidadCobro: "PREVIO", plazoPagoMinutos: 60, versionCobro: 1, ...cambios };
}

/** Un curso y su padrón en memoria; registra lo que la transacción escribe. */
function repositorioFalso(opciones: { curso?: OfertaCurso | undefined; persona?: { dni: string | null } | undefined; inscripcion?: string;
  inscritos?: number; afiliacion?: Afiliacion | undefined } = {}) {
  const escrito = { intentos: [] as Record<string, unknown>[], obligaciones: [] as unknown[], accesos: [] as string[], reservasCanceladas: 0 };
  const curso = "curso" in opciones ? opciones.curso : oferta();
  const persona = "persona" in opciones ? opciones.persona : { dni: "12345678" };
  const afiliacion = "afiliacion" in opciones ? opciones.afiliacion : { habilitado: true, vinculado: true };
  const tx: InscripcionTransaccion = {
    bloquearCurso: async () => curso,
    agremiadoActivo: async () => persona,
    cancelarReservasVencidas: async () => { escrito.reservasCanceladas++; },
    inscripcionActual: async () => (opciones.inscripcion ? { estado: opciones.inscripcion } : undefined),
    afiliacion: async () => afiliacion,
    contarInscritos: async () => opciones.inscritos ?? 0,
    registrarIntento: async (datos) => { escrito.intentos.push(datos); },
    crearObligacionPago: async (datos) => { escrito.obligaciones.push(datos); return "p1"; },
    confirmarAcceso: async (cursoId, usuarioId, intentoId) => { escrito.accesos.push(intentoId); }
  };
  const repositorio: InscripcionesRepository = {
    enTransaccion: (trabajo) => trabajo(tx),
    padronVigente: async () => afiliacion !== undefined,
    afiliacion: async () => afiliacion,
    dniDe: async () => persona?.dni ?? null
  };
  return { repositorio, escrito };
}

const servicio = (falso = repositorioFalso(), externa = false) =>
  ({ ...falso, inscripcion: crearInscripcionService({ repositorio: falso.repositorio, configuracion: { inscripcionExternaHabilitada: externa } }) });

describe("T-26 cursos: inscripción", () => {
  test("rechaza cursos inexistentes, personas no agremiadas y cursos sin publicar", async () => {
    assert.equal(await servicio(repositorioFalso({ curso: undefined })).inscripcion.inscribir("5", 20, 1), "NO_EXISTE");
    assert.equal(await servicio(repositorioFalso({ persona: undefined })).inscripcion.inscribir("5", 20, 1), "SIN_PERMISO");
    assert.equal(await servicio(repositorioFalso({ curso: oferta({ estado: "BORRADOR" }) })).inscripcion.inscribir("5", 20, 1), "NO_PUBLICADO");
  });

  test("informa la inscripción vigente y permite volver a inscribirse tras una cancelación", async () => {
    assert.equal(await servicio(repositorioFalso({ inscripcion: "EN_CURSO" })).inscripcion.inscribir("5", 20, 1), "YA_INSCRITO");
    assert.equal(await servicio(repositorioFalso({ inscripcion: "TERMINADO" })).inscripcion.inscribir("5", 20, 1), "YA_TERMINADO");
    assert.equal(await servicio(repositorioFalso({ inscripcion: "PENDIENTE_PAGO" })).inscripcion.inscribir("5", 20, 1), "YA_PENDIENTE");
    assert.equal(await servicio(repositorioFalso({ inscripcion: "CANCELADA" })).inscripcion.inscribir("5", 20, 1), "INSCRITO_PENDIENTE");
  });

  test("exige condiciones de cobro configuradas y vigentes", async () => {
    assert.equal(await servicio(repositorioFalso({ curso: oferta({ modalidadCobro: null }) })).inscripcion.inscribir("5", 20, 1), "COBRO_NO_CONFIGURADO");
    assert.equal(await servicio().inscripcion.inscribir("5", 20, 2), "COBRO_MODIFICADO");
    assert.equal(await servicio().inscripcion.inscribir("5", 20), "COBRO_MODIFICADO");
    assert.equal(await servicio().inscripcion.inscribir("5", 20, 1, "GENERAL"), "COBRO_MODIFICADO");
  });

  test("un curso sin costo ni modalidad se trata como gratuito y confirma el acceso", async () => {
    const { inscripcion, escrito } = servicio(repositorioFalso({ curso: oferta({ modalidadCobro: null, costo: 0, plazoPagoMinutos: null }) }));
    assert.equal(await inscripcion.inscribir("5", 20), "INSCRITO");
    assert.equal(escrito.intentos[0]!.modalidadCobro, "GRATUITO");
    assert.equal(escrito.accesos.length, 1);
    assert.equal(escrito.obligaciones.length, 0);
  });

  test("sin cupos rechaza y con pago previo reserva con su obligación de pago", async () => {
    assert.equal(await servicio(repositorioFalso({ inscritos: 10 })).inscripcion.inscribir("5", 20, 1), "SIN_CUPOS");
    const { inscripcion, escrito } = servicio();
    assert.equal(await inscripcion.inscribir("5", 20, 1), "INSCRITO_PENDIENTE");
    assert.equal(escrito.intentos[0]!.pendiente, true);
    assert.equal(escrito.intentos[0]!.importeCentimos, 15000);
    assert.deepEqual(escrito.obligaciones, [{ cursoId: "5", usuarioId: 20, intentoId: escrito.intentos[0]!.intentoId, importeCentimos: 15000 }]);
    assert.equal(escrito.accesos.length, 0);
    assert.equal(escrito.reservasCanceladas, 1);
  });
});

describe("T-26 cursos: inscripción con padrón del CPPP", () => {
  test("el colegiado habilitado paga la tarifa de colegiado", async () => {
    const { inscripcion, escrito } = servicio(repositorioFalso(), true);
    assert.equal(await inscripcion.inscribir("5", 20, 1, "COLEGIADO"), "INSCRITO_PENDIENTE");
    assert.deepEqual([escrito.intentos[0]!.tipoPrecio, escrito.intentos[0]!.importeCentimos], ["COLEGIADO", 15000]);
  });

  test("quien no figura en el padrón paga el precio general", async () => {
    const { inscripcion, escrito } = servicio(repositorioFalso({ afiliacion: { habilitado: null, vinculado: null } }), true);
    assert.equal(await inscripcion.inscribir("5", 20, 1, "GENERAL"), "INSCRITO_PENDIENTE");
    assert.equal(escrito.intentos[0]!.importeCentimos, 20000);
  });

  test("devuelve el impedimento del padrón y rechaza una tarifa distinta de la cotizada", async () => {
    assert.deepEqual(await servicio(repositorioFalso({ afiliacion: undefined }), true).inscripcion.inscribir("5", 20, 1, "GENERAL"),
      { codigo: "PADRON_NO_DISPONIBLE", estado: 503, mensaje: "El padrón del CPPP no está disponible. Intenta más tarde." });
    assert.deepEqual(await servicio(repositorioFalso({ afiliacion: { habilitado: true, vinculado: false } }), true).inscripcion.inscribir("5", 20, 1, "COLEGIADO"),
      { codigo: "AFILIACION_NO_VERIFICADA", estado: 403, mensaje: "Valida el vínculo de tu cuenta con el CPPP para inscribirte." });
    assert.equal(await servicio(repositorioFalso(), true).inscripcion.inscribir("5", 20, 1, "GENERAL"), "COBRO_MODIFICADO");
  });
});

describe("T-26 cursos: cotización", () => {
  const afiliacionDe = (afiliacion?: Afiliacion) => async () => afiliacion;

  test("sin DNI pide registrarlo y oculta el DNI en el precio", async () => {
    const { inscripcion } = servicio();
    assert.equal((await inscripcion.cotizar(afiliacionDe(), oferta(), 20, null) as { impedimentoInscripcion: { codigo: string } }).impedimentoInscripcion.codigo, "DNI_REQUERIDO");
    assert.deepEqual(await inscripcion.cotizar(afiliacionDe({ habilitado: true, vinculado: true }), oferta(), 20, "12345678"),
      { miPrecio: { tipo: "COLEGIADO", importe: 150, dniParcial: "•••• 5678", enPadron: true } });
  });

  test("sin precio general configurado no se puede cotizar a un externo", async () => {
    const cotizacion = await servicio().inscripcion.cotizar(afiliacionDe({ habilitado: null, vinculado: null }), oferta({ precioGeneral: null }), 20, "12345678");
    assert.equal((cotizacion as { impedimentoInscripcion: { codigo: string } }).impedimentoInscripcion.codigo, "PRECIO_GENERAL_NO_CONFIGURADO");
  });
});
