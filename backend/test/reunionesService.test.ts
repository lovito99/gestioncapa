import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AccesoReunion, Reunion } from "../src/entities/reuniones/reunion.js";
import type { ReunionesRepository, ReunionesTransaccion } from "../src/repositories/reuniones/reunionesRepository.js";
import { crearReunionesService } from "../src/services/reuniones/reunionesService.js";
import { ErrorAplicacion } from "../src/shared/errorAplicacion.js";

const id = "79d4a3c1-7d3a-4a3c-8b92-a9c0134ac001";

function reunion(cambios: Partial<Reunion> = {}): Reunion {
  return { identificador: id, claseIdentificador: "10", nombreSala: "reunionabc", titulo: "Sesión", inicioProgramado: new Date("2026-11-24T13:00:00Z"),
    finProgramado: new Date("2026-11-24T14:00:00Z"), estado: "programada", creadorIdentificador: "7", camaraPermitida: true, microfonoPermitido: true,
    pantallaPermitida: true, salaEsperaHabilitada: true, manoPermitida: true, porcentajeMinimo: 80, grabacionPrevista: false,
    iniciadaEn: null, finalizadaEn: null, ...cambios };
}

const accesos: Record<string, AccesoReunion> = {
  admin: { gestion: true, instructor: false, inscrito: false, activa: true, retirado: false },
  instructor: { gestion: false, instructor: true, inscrito: false, activa: true, retirado: false },
  alumno: { gestion: false, instructor: false, inscrito: true, activa: true, retirado: false },
  retirado: { gestion: false, instructor: false, inscrito: true, activa: true, retirado: true },
  ajeno: { gestion: false, instructor: false, inscrito: false, activa: true, retirado: false }
};
const usuarios = { admin: 1, instructor: 7, alumno: 20, retirado: 21, ajeno: 22 } as const;
type Persona = keyof typeof usuarios;
const actor = (persona: Persona) => ({ id: usuarios[persona], name: persona, email: `${persona}@cppp.local`, role: persona === "admin" ? "admin" : "agremiado" });

/** Una reunión en memoria; registra lo que la transacción escribe. */
function repositorioFalso(inicial: Reunion | null) {
  let actual = inicial;
  const escrito: Record<string, unknown[]> = { asistencias: [], asistenciasClase: [], avisos: [], retirados: [] };
  const tx: ReunionesTransaccion = {
    obtener: async () => actual ?? undefined,
    comprobarAcceso: async (r, usuarioId) => accesos[(Object.keys(usuarios) as Persona[]).find((p) => usuarios[p] === Number(usuarioId))!],
    claseParaReunion: async (claseId) => (claseId === 10 ? { id: "10", instructor_id: "7", modalidad: "VIRTUAL" } : claseId === 11 ? { id: "11", instructor_id: "7", modalidad: "PRESENCIAL" } : undefined),
    crearReunionDeClase: async (datos) => reunion({ claseIdentificador: datos.claseIdentificador, titulo: datos.titulo }),
    actualizarHorario: async (identificador, datos) => (actual = { ...actual!, titulo: datos.titulo }),
    cambiarEstado: async (identificador, destino) => (actual = { ...actual!, estado: destino,
      iniciadaEn: destino === "iniciada" ? new Date("2026-11-24T13:00:00Z") : actual!.iniciadaEn,
      finalizadaEn: destino === "finalizada" ? new Date("2026-11-24T14:00:00Z") : actual!.finalizadaEn }),
    actualizarPoliticas: async (identificador, politicas) => (actual = { ...actual!, ...politicas }),
    participantes: async () => [],
    esParticipanteRetirable: async (claseId, usuarioId) => usuarioId === 20,
    retirarParticipante: async (reunionId, usuarioId) => { escrito.retirados!.push(usuarioId); },
    consultarAsistenciaVirtual: async () => [{ usuarioIdentificador: "20" }],
    avisoGrabacionAceptado: async () => null,
    aceptarAvisoGrabacion: async (reunionId, usuarioId) => { escrito.avisos!.push(usuarioId); },
    cerrarConexiones: async () => {},
    inscritosParaAsistencia: async () => [{ usuario: "20", expulsado: false }, { usuario: "21", expulsado: true }],
    conexiones: async () => [
      { usuario: "20", inicio: Date.parse("2026-11-24T13:00:00Z") / 1000, fin: Date.parse("2026-11-24T13:55:00Z") / 1000 },
      { usuario: "21", inicio: Date.parse("2026-11-24T13:00:00Z") / 1000, fin: Date.parse("2026-11-24T14:00:00Z") / 1000 }
    ],
    guardarAsistenciaVirtual: async (reunionId, usuario, resultado) => { escrito.asistencias!.push({ usuario, ...resultado }); },
    registrarAsistenciaDeClase: async (claseId, usuario) => { escrito.asistenciasClase!.push(usuario); }
  };
  const repositorio: ReunionesRepository = { enTransaccion: (trabajo) => trabajo(tx), listar: async () => [] };
  return { repositorio, escrito, actual: () => actual };
}

const configuracion = { jitsiHabilitado: true, jitsiDominio: "meet.cppp.local", jitsiAplicacion: "gestioncapa", jitsiSecreto: "s", jitsiDireccion: undefined };
function servicio(inicial: Reunion | null = reunion(), config: typeof configuracion = configuracion) {
  const falso = repositorioFalso(inicial);
  const emitidas: unknown[] = [];
  const reuniones = crearReunionesService({
    repositorio: falso.repositorio, configuracion: config,
    emitirCredencial: async (conf, usuario, sala) => { emitidas.push({ usuario, sala }); return "jwt"; }
  });
  return { reuniones, emitidas, ...falso };
}

async function rechazoEstado(promesa: Promise<unknown>, statusCode: number) {
  await assert.rejects(promesa, (error) => (error as { statusCode?: number }).statusCode === statusCode);
}
async function rechazo(promesa: Promise<unknown>, status: number, code: string) {
  await assert.rejects(promesa, (error) => error instanceof ErrorAplicacion && error.status === status && error.code === code);
}

describe("T-26 reuniones: acceso", () => {
  test("una reunión inexistente es 404 y quien no participa o fue retirado recibe 403", async () => {
    await rechazoEstado(servicio(null).reuniones.obtener(id, actor("admin")), 404);
    await rechazoEstado(servicio().reuniones.obtener(id, actor("ajeno")), 403);
    await rechazoEstado(servicio().reuniones.obtener(id, actor("retirado")), 403);
    assert.equal((await servicio().reuniones.obtener(id, actor("alumno"))).identificador, id);
  });

  test("solo el administrador o el instructor gestionan la reunión", async () => {
    const datos = { titulo: "Nuevo", inicioProgramado: "2026-11-24T13:00:00Z", finProgramado: "2026-11-24T14:00:00Z" };
    await rechazoEstado(servicio().reuniones.editar(id, datos, actor("alumno")), 403);
    assert.equal((await servicio().reuniones.editar(id, datos, actor("instructor"))).titulo, "Nuevo");
    await rechazoEstado(servicio(reunion({ estado: "iniciada" })).reuniones.editar(id, datos, actor("admin")), 409);
  });
});

describe("T-26 reuniones: creación", () => {
  const datos = { titulo: "Sala", inicioProgramado: "2026-11-24T13:00:00Z", finProgramado: "2026-11-24T14:00:00Z" };

  test("una clase no permitida es 403 y una sesión presencial no abre sala", async () => {
    await rechazoEstado(servicio().reuniones.crear({ ...datos, claseIdentificador: 99 }, actor("instructor")), 403);
    await rechazo(servicio().reuniones.crear({ ...datos, claseIdentificador: 11 }, actor("instructor")), 409, "SESION_PRESENCIAL");
    assert.equal((await servicio().reuniones.crear({ ...datos, claseIdentificador: 10 }, actor("instructor"))).claseIdentificador, "10");
  });
});

describe("T-26 reuniones: estados y asistencia virtual", () => {
  test("no se finaliza una reunión que no se inició y repetir un estado no cambia nada", async () => {
    await rechazoEstado(servicio().reuniones.cambiarEstado(id, "finalizada", actor("instructor")), 409);
    assert.equal((await servicio().reuniones.cambiarEstado(id, "programada" as never, actor("instructor"))).estado, "programada");
  });

  test("al finalizar guarda la asistencia virtual y el expulsado no acredita", async () => {
    const { reuniones, escrito } = servicio(reunion({ estado: "iniciada", iniciadaEn: new Date("2026-11-24T13:00:00Z") }));
    await reuniones.cambiarEstado(id, "finalizada", actor("instructor"));
    assert.deepEqual(escrito.asistencias, [
      { usuario: "20", segundosConectados: 3300, porcentaje: 91.67, cuenta: true, expulsado: false },
      { usuario: "21", segundosConectados: 3600, porcentaje: 100, cuenta: false, expulsado: true }
    ]);
    assert.deepEqual(escrito.asistenciasClase, ["20"]);
  });

  test("la asistencia solo se consulta al finalizar", async () => {
    await rechazoEstado(servicio().reuniones.asistencia(id, actor("instructor")), 409);
    const resultado = await servicio(reunion({ estado: "finalizada" })).reuniones.asistencia(id, actor("instructor"));
    assert.deepEqual(resultado.resultados, [{ usuarioIdentificador: "20" }]);
  });

  test("retirar a alguien que no es participante es 404", async () => {
    await rechazoEstado(servicio().reuniones.retirarParticipante(id, 99, actor("instructor")), 404);
    const { reuniones, escrito } = servicio();
    assert.deepEqual(await reuniones.retirarParticipante(id, 20, actor("instructor")), { accesoRevocado: true });
    assert.deepEqual(escrito.retirados, [20]);
  });
});

describe("T-26 reuniones: credencial", () => {
  const iniciada = (cambios: Partial<Reunion> = {}) => reunion({ estado: "iniciada", ...cambios });

  test("sin sala iniciada es 409 y sin Jitsi habilitado es 503", async () => {
    await rechazoEstado(servicio().reuniones.credencial(id, undefined, actor("alumno")), 409);
    await rechazoEstado(servicio(iniciada(), { ...configuracion, jitsiHabilitado: false }).reuniones.credencial(id, undefined, actor("alumno")), 503);
  });

  test("una sesión grabada exige aceptar el aviso y lo registra antes de emitir", async () => {
    await rechazo(servicio(iniciada({ grabacionPrevista: true })).reuniones.credencial(id, undefined, actor("alumno")), 422, "AVISO_GRABACION_PENDIENTE");
    const { reuniones, escrito, emitidas } = servicio(iniciada({ grabacionPrevista: true }));
    const credencial = await reuniones.credencial(id, true, actor("alumno"));
    assert.deepEqual(escrito.avisos, [20]);
    assert.deepEqual({ token: credencial.token, dominio: credencial.dominio, direccionServidor: credencial.direccionServidor }, { token: "jwt", dominio: "meet.cppp.local", direccionServidor: "https://meet.cppp.local" });
    assert.deepEqual(emitidas, [{ usuario: { identificador: "20", nombre: "alumno", correo: "alumno@cppp.local", moderador: false }, sala: "reunionabc" }]);
  });

  test("el instructor entra como moderador sin aviso de grabación", async () => {
    const { reuniones, escrito, emitidas } = servicio(iniciada({ grabacionPrevista: true }));
    await reuniones.credencial(id, undefined, actor("instructor"));
    assert.deepEqual(escrito.avisos, []);
    assert.equal((emitidas[0] as { usuario: { moderador: boolean } }).usuario.moderador, true);
  });
});
